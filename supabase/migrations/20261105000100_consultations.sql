-- 상담 신청(설계 13장 S6·S12). 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/03_consultations.test.sql, 01_auth_lockdown.test.sql(감사 트리거)
-- anon에는 테이블 권한이 전혀 없다. 신청은 Edge Function(submit-consultation)이 Turnstile을
-- 검증한 뒤 service_role로 public.submit_consultation()을 부르는 경로뿐이다.
-- 읽기·상태/메모 수정은 원장(admins + aal2)만. 미성년자 정보가 들어가므로 변경은 모두 감사 로그에 남긴다.

-- ─── 감사 트리거 보강 ────────────────────────────────────────────────
-- 사용법: 트리거 인자로 키 컬럼 이름을 넘긴다(생략하면 'id').
--   create trigger <t>_audit after insert or update or delete on public.<t>
--     for each row execute function private.audit();              -- id 컬럼
--   ... for each row execute function private.audit('student_id'); -- 다른 키 컬럼
-- AFTER … FOR EACH ROW가 아니거나 키 컬럼이 없으면 쓰기 자체를 실패시킨다(조용히 빠뜨리지 않는다).
create or replace function private.audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  key_col text;
  row_jsonb jsonb;
begin
  if tg_when <> 'AFTER' or tg_level <> 'ROW' then
    raise exception 'private.audit()는 AFTER … FOR EACH ROW 트리거로만 써요.';
  end if;

  key_col := coalesce(tg_argv[0], 'id');
  row_jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if not row_jsonb ? key_col then
    raise exception 'private.audit(): %에 키 컬럼 %이 없어요.', tg_table_name, key_col;
  end if;

  insert into private.audit_log (actor, table_name, row_id, op)
  values (auth.uid(), tg_table_schema || '.' || tg_table_name, row_jsonb ->> key_col, tg_op);
  return null;
end;
$$;
revoke all on function private.audit() from public, anon, authenticated;

-- ─── 타입·테이블 ─────────────────────────────────────────────────────
create type public.school_grade as enum ('중1', '중2', '중3', '고1', '고2', '고3');
create type public.consultation_status as enum ('new', 'contacted', 'enrolled', 'on_hold');

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null check (char_length(btrim(parent_name)) between 1 and 40),
  phone text not null check (phone ~ '^010-[0-9]{4}-[0-9]{4}$'),
  grade public.school_grade not null,
  message text check (message is null or char_length(message) <= 1000),
  status public.consultation_status not null default 'new',
  memo text check (memo is null or char_length(memo) <= 2000),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index consultations_phone_created_at_idx on public.consultations (phone, created_at desc);
alter table public.consultations enable row level security;

-- anon: grant 없음. authenticated: 원장만 행이 보이고 고칠 수 있다(insert·delete 권한 없음).
grant select, update on public.consultations to authenticated;
create policy consultations_admin_select on public.consultations
  for select to authenticated
  using (private.is_admin());
create policy consultations_admin_update on public.consultations
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create trigger consultations_audit
  after insert or update or delete on public.consultations
  for each row execute function private.audit();

-- ─── 신청 RPC (service_role 전용) ────────────────────────────────────
-- 같은 번호로 24시간 안에 3건이 있으면 HS429. advisory lock으로 같은 번호의 동시 신청을 줄 세워
-- 확인과 insert 사이에 끼어드는 신청이 한도를 넘지 못하게 한다.
create function public.submit_consultation(
  p_parent_name text,
  p_phone text,
  p_grade public.school_grade,
  p_message text,
  p_consent_version text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('consultation:' || p_phone));

  if (select count(*) from public.consultations
       where phone = p_phone
         and created_at > now() - interval '24 hours') >= 3 then
    raise exception '오늘은 이 번호로 더 신청할 수 없어요. 전화로 문의해 주세요.'
      using errcode = 'HS429';
  end if;

  insert into public.consultations (parent_name, phone, grade, message, consent_version, consented_at)
  values (btrim(p_parent_name), p_phone, p_grade, nullif(btrim(p_message), ''), p_consent_version, now())
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.submit_consultation(text, text, public.school_grade, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_consultation(text, text, public.school_grade, text, text)
  to service_role;
