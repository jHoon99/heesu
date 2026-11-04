-- 반·반 배정·법정대리인 동의 기록(설계 13장 S1·S3·S12, v1 스펙 §7·§11). 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/05_classes.test.sql, 06_consents.test.sql
-- 학생은 자기가 속한 반과 자기 배정 행만 읽는다. 퇴원생은 my_student_id()가 null이라 0행(spec §11).
-- 반 삭제는 없다(v1은 이름 바꾸기로 대신). consents는 법정 기록이라 추가만 한다(틀리면 새 기록).
-- service_role(Edge Function)은 이 테이블들을 쓰지 않으므로 권한을 주지 않는다.

-- ─── 타입·테이블 ─────────────────────────────────────────────────────
create type public.class_level as enum ('middle', 'high');
create type public.consent_method as enum ('written', 'phone', 'kakao');

-- schedule = [{ "day": 1-7(ISO 요일, 1=월 … 7=일), "start": "HH:MM", "end": "HH:MM" }], 형식은 트리거가 검사한다.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 30),
  level public.class_level not null,
  schedule jsonb not null default '[]',
  capacity int check (capacity is null or capacity between 1 and 50),
  created_at timestamptz not null default now()
);
alter table public.classes enable row level security;

create table public.class_members (
  class_id uuid references public.classes on delete cascade,
  student_id uuid references public.students on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
alter table public.class_members enable row level security;
create index class_members_student_id_idx on public.class_members (student_id);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  guardian_name text not null check (char_length(btrim(guardian_name)) between 1 and 20),
  method public.consent_method not null,
  version text not null check (char_length(btrim(version)) between 1 and 40),
  consented_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.consents enable row level security;
create index consents_student_id_consented_at_idx on public.consents (student_id, consented_at desc);

-- ─── 시간표 검사 ─────────────────────────────────────────────────────
-- 배열, 0~14칸, 각 칸은 정확히 day·start·end. day는 1~7 정수, 시각은 HH:MM(00:00~23:59), start < end.
-- 어기면 P0001(화면에 문구를 그대로 보여 준다). 트리거 함수는 실행 권한 없이도 트리거로 불린다.
create function private.check_class_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  slot jsonb;
  time_re constant text := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  ok boolean := true;
begin
  if new.schedule is null then
    return new; -- not null 제약(23502)이 잡는다.
  end if;

  if jsonb_typeof(new.schedule) <> 'array' or jsonb_array_length(new.schedule) > 14 then
    ok := false;
  else
    for slot in select value from jsonb_array_elements(new.schedule) loop
      -- 객체인지 먼저 따로 본다(jsonb_object_keys는 객체가 아니면 에러를 낸다).
      if jsonb_typeof(slot) <> 'object' then
        ok := false;
      elsif (select array_agg(k order by k collate "C") from jsonb_object_keys(slot) as k)
              is distinct from array['day', 'end', 'start']
         or jsonb_typeof(slot -> 'day') <> 'number'
         or jsonb_typeof(slot -> 'start') <> 'string'
         or jsonb_typeof(slot -> 'end') <> 'string' then
        ok := false;
      elsif (slot ->> 'day') !~ '^[1-7]$'
         or (slot ->> 'start') !~ time_re
         or (slot ->> 'end') !~ time_re
         or (slot ->> 'start') collate "C" >= (slot ->> 'end') collate "C" then
        ok := false;
      end if;
      exit when not ok;
    end loop;
  end if;

  if not ok then
    raise exception '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.';
  end if;
  return new;
end;
$$;
revoke all on function private.check_class_schedule() from public, anon, authenticated, service_role;

create trigger classes_check_schedule
  before insert or update on public.classes
  for each row execute function private.check_class_schedule();

-- ─── 권한 ───────────────────────────────────────────────────────────
-- 플랫폼 기본값에 기대지 않는다: 모두 회수한 뒤 필요한 것만 준다.
revoke all on public.classes from anon, authenticated, service_role;
revoke all on public.class_members from anon, authenticated, service_role;
revoke all on public.consents from anon, authenticated, service_role;

-- authenticated: 행은 아래 정책이 거른다. classes delete·class_members update·consents update/delete 없음.
grant select, insert, update on public.classes to authenticated;
grant select, insert, delete on public.class_members to authenticated;
grant select, insert on public.consents to authenticated;

-- ─── 정책 (private.*를 부르므로 모두 to authenticated) ───────────────
create policy classes_admin_select on public.classes
  for select to authenticated
  using (private.is_admin());
create policy classes_admin_insert on public.classes
  for insert to authenticated
  with check (private.is_admin());
create policy classes_admin_update on public.classes
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());
create policy classes_member_select on public.classes
  for select to authenticated
  using (exists (select 1 from public.class_members m
                  where m.class_id = classes.id and m.student_id = private.my_student_id()));

create policy class_members_admin_select on public.class_members
  for select to authenticated
  using (private.is_admin());
create policy class_members_admin_insert on public.class_members
  for insert to authenticated
  with check (private.is_admin());
create policy class_members_admin_delete on public.class_members
  for delete to authenticated
  using (private.is_admin());
create policy class_members_self_select on public.class_members
  for select to authenticated
  using (student_id = private.my_student_id());

create policy consents_admin_select on public.consents
  for select to authenticated
  using (private.is_admin());
create policy consents_admin_insert on public.consents
  for insert to authenticated
  with check (private.is_admin());

-- ─── 감사 ───────────────────────────────────────────────────────────
create trigger consents_audit
  after insert or update or delete on public.consents
  for each row execute function private.audit();
