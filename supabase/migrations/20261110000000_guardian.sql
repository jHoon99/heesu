-- 학부모 링크: 해시만 저장하는 토큰·원장 발급 RPC·학부모 조회 RPC·퇴원 시 폐기(설계 13장 S7·S12).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/13_guardian.test.sql, 00_meta.test.sql(함수 허용 목록, 감사 트리거 목록)
-- 토큰 원문 = 256비트 난수의 base64url(패딩 없음, 43자). DB에는 sha256 해시만 두고 원문은 어디에도 저장·로그하지 않는다.
-- 원문은 링크 fragment(/g#t=…)로만 오간다. 만료 90일, 학생당 살아 있는 토큰은 하나(재발급하면 이전 것은 폐기).
-- security definer인 이유: 원장도 guardian_tokens에 직접 쓰지 못한다(원문이 클라이언트 쓰기 경로에 끼지 않게).
-- 발급·폐기와 학부모 조회 검사(형식·해시·만료·폐기·퇴원)를 이 함수들이 한곳에서 지킨다.
-- 속도 제한 없음: 토큰은 256비트 난수라 추측할 수 없고, 반복 호출은 Supabase 사용량 알림(S14)으로 본다.
-- 실패 원인(없음·형식·틀림·만료·폐기·퇴원)은 모두 같은 문구로 돌려준다(어느 것인지 알려 주지 않는다).
-- 응답은 이름·출결·숙제·수업 내용·포인트뿐. 학교·연락처·다른 학생 정보는 넣지 않는다.

-- ─── 테이블 ─────────────────────────────────────────────────────────
create table public.guardian_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at)
);
alter table public.guardian_tokens enable row level security;
create unique index guardian_tokens_one_active on public.guardian_tokens (student_id) where revoked_at is null;

-- ─── 권한 ───────────────────────────────────────────────────────────
-- 원장 화면은 발급 이력만 읽는다. token_hash는 아무에게도 보이지 않고, 쓰기 권한은 누구에게도 없다(아래 함수만).
revoke all on public.guardian_tokens from anon, authenticated, service_role;
grant select (id, student_id, created_at, expires_at, revoked_at) on public.guardian_tokens to authenticated;

-- ─── 정책 (private.*를 부르므로 to authenticated) ────────────────────
create policy guardian_tokens_admin_select on public.guardian_tokens
  for select to authenticated
  using ((select private.is_admin()));

-- ─── 감사 ───────────────────────────────────────────────────────────
create trigger guardian_tokens_audit
  after insert or update or delete on public.guardian_tokens
  for each row execute function private.audit();

-- ─── 발급 RPC (원장) ────────────────────────────────────────────────
-- 살아 있는 토큰을 폐기하고 새 원문을 한 번만 돌려준다. 같은 학생 발급은 advisory lock으로 줄 세운다.
-- 학생 행은 for share로 잠근다: 동시에 퇴원 처리 중이면 그 커밋을 기다린 뒤 status를 다시 읽는다.
create function public.issue_guardian_token(p_student_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status public.student_status;
  v_token text;
begin
  if not private.is_admin() then
    raise exception '원장 계정으로 다시 로그인해 주세요.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('guardian:' || p_student_id::text));

  select s.status into v_status from public.students s where s.id = p_student_id for share;
  if not found then
    raise exception '학생을 찾을 수 없어요. 목록에서 다시 골라 주세요.';
  end if;
  if v_status = 'left' then
    raise exception '퇴원한 학생은 학부모 링크를 만들 수 없어요. 학생 상태를 먼저 바꿔 주세요.';
  end if;

  update public.guardian_tokens set revoked_at = now()
   where student_id = p_student_id and revoked_at is null;

  v_token := pg_catalog.rtrim(
    pg_catalog.translate(pg_catalog.encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.guardian_tokens (student_id, token_hash, expires_at)
  values (p_student_id, pg_catalog.sha256(pg_catalog.convert_to(v_token, 'UTF8')), now() + interval '90 days');
  return v_token;
end;
$$;
revoke all on function public.issue_guardian_token(uuid) from public, anon, authenticated, service_role;
grant execute on function public.issue_guardian_token(uuid) to authenticated;

-- ─── 학부모 조회 RPC (토큰만으로) ────────────────────────────────────
-- volatile: PostgREST는 volatile 함수를 GET으로 부르지 못한다(토큰이 쿼리스트링에 실리지 않게 POST만).
-- 기간(서울 날짜): records = 오늘 포함 28일 내림차순, week = 이번 주 월요일 ~ 오늘 오름차순. 미래 수업은 없다.
-- 대상 수업 = (지금 소속 반의 수업 중 배정한 서울 날짜 이후) ∪ (그 학생의 출결·숙제 행이 있는 수업).
create function public.guardian_view(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_week_start date := pg_catalog.date_trunc('week', v_today::timestamp)::date;
  v_student_id uuid;
  v_name text;
  v_points int;
  v_records jsonb;
  v_week jsonb;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.';
  end if;

  select s.id, s.name into v_student_id, v_name
    from public.guardian_tokens g
    join public.students s on s.id = g.student_id
   where g.token_hash = pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8'))
     and g.revoked_at is null
     and g.expires_at > now()
     and s.status <> 'left';
  if not found then
    raise exception '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.';
  end if;

  select coalesce(sum(p.amount), 0)::int into v_points
    from public.points p
   where p.student_id = v_student_id;

  with target as (
    select se.id, se.date, c.name as class_name, se.summary, se.homework, se.homework_due
      from public.sessions se
      join public.classes c on c.id = se.class_id
     where se.date between v_today - 27 and v_today
       and (exists (select 1 from public.class_members m
                     where m.class_id = se.class_id and m.student_id = v_student_id
                       and se.date >= (m.created_at at time zone 'Asia/Seoul')::date)
            or exists (select 1 from public.attendance a
                        where a.session_id = se.id and a.student_id = v_student_id)
            or exists (select 1 from public.homework_checks h
                        where h.session_id = se.id and h.student_id = v_student_id))
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
        'date', t.date,
        'class_name', t.class_name,
        'attendance', coalesce(a.status::text, 'none'),
        'homework', coalesce(h.status::text, 'none'))
      order by t.date desc, t.class_name), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object(
        'date', t.date,
        'class_name', t.class_name,
        'summary', t.summary,
        'homework', t.homework,
        'homework_due', t.homework_due)
      order by t.date, t.class_name) filter (where t.date >= v_week_start), '[]'::jsonb)
    into v_records, v_week
    from target t
    left join public.attendance a on a.session_id = t.id and a.student_id = v_student_id
    left join public.homework_checks h on h.session_id = t.id and h.student_id = v_student_id;

  return jsonb_build_object(
    'name', v_name,
    'today', v_today,
    'total_points', v_points,
    'records', v_records,
    'week', v_week);
end;
$$;
revoke all on function public.guardian_view(text) from public, anon, authenticated, service_role;
-- authenticated도: 원장이 같은 브라우저에서 링크를 열어 봐도 되게(판단은 토큰만으로).
grant execute on function public.guardian_view(text) to anon, authenticated;

-- ─── 퇴원 시 폐기 ───────────────────────────────────────────────────
-- security definer: 퇴원 처리하는 원장에게 guardian_tokens update 권한이 없다.
create function private.revoke_guardian_tokens_on_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guardian_tokens set revoked_at = now()
   where student_id = new.id and revoked_at is null;
  return null;
end;
$$;
revoke all on function private.revoke_guardian_tokens_on_leave() from public, anon, authenticated, service_role;

create trigger students_revoke_guardian_tokens
  after update of status on public.students
  for each row when (new.status = 'left' and old.status <> 'left')
  execute function private.revoke_guardian_tokens_on_leave();
