-- 학생·학생 민감 정보·역할 함수(설계 13장 S1·S3·S12, v1 스펙 §7·§11). 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/04_students.test.sql, 00_meta.test.sql(함수 허용 목록)
-- 퇴원생은 my_student_id()가 null이라 로그인해도 0행(spec §11). 학부모 토큰 폐기 트리거는 계획 6.
-- 학생 생성은 service_role(create-student Edge Function)뿐, 삭제 대신 status = 'left'.
-- 학생은 본인 행만 읽고 아무것도 못 고친다. student_private(보호자 연락처·학교·메모)는 원장(admins + aal2)만.

-- ─── 타입·테이블 ─────────────────────────────────────────────────────
create type public.student_status as enum ('active', 'paused', 'left');

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete set null,
  login_id text not null unique check (login_id ~ '^[a-z0-9_]{3,20}$'),
  name text not null check (char_length(btrim(name)) between 1 and 20),
  grade public.school_grade not null,
  status public.student_status not null default 'active',
  joined_at date not null default current_date,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.students enable row level security;

create table public.student_private (
  student_id uuid primary key references public.students on delete cascade,
  school text check (school is null or char_length(school) <= 40),
  guardian_name text check (guardian_name is null or char_length(guardian_name) <= 20),
  guardian_phone text check (guardian_phone is null or guardian_phone ~ '^010-[0-9]{4}-[0-9]{4}$'),
  memo text check (memo is null or char_length(memo) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.student_private enable row level security;

create trigger student_private_set_updated_at
  before update on public.student_private
  for each row execute function private.set_updated_at();

-- ─── 역할 함수 ───────────────────────────────────────────────────────
-- 내 학생 id. security definer: students RLS 정책이 이 함수를 부르므로 RLS를 우회해야 재귀하지 않는다.
create function private.my_student_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.students where user_id = auth.uid() and status <> 'left';
$$;
revoke all on function private.my_student_id() from public, anon, authenticated;
grant execute on function private.my_student_id() to authenticated;

-- 화면 분기용 역할: 'admin' | 'student' | null. 권한 판단은 각 테이블 RLS가 한다.
create function public.my_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when private.is_admin() then 'admin'
    when private.my_student_id() is not null then 'student'
  end;
$$;
revoke all on function public.my_role() from public, anon, authenticated;
grant execute on function public.my_role() to authenticated;

-- 첫 로그인 비밀번호 변경 뒤 본인 행의 must_change_password만 false로 (인자 없음, 다른 컬럼은 못 바꾼다).
-- 학생이 아니거나 퇴원생이면 아무 일도 없다.
create function public.password_changed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.students set must_change_password = false where id = private.my_student_id();
end;
$$;
revoke all on function public.password_changed() from public, anon, authenticated;
grant execute on function public.password_changed() to authenticated;

-- Edge Function(service_role)의 원장 확인용. private 스키마는 PostgREST에 노출되지 않아서 public에 둔다.
create function public.admin_user_exists(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = p_user_id);
$$;
revoke all on function public.admin_user_exists(uuid) from public, anon, authenticated;
grant execute on function public.admin_user_exists(uuid) to service_role;

-- ─── 권한 ───────────────────────────────────────────────────────────
-- authenticated: 읽기 + 원장용 컬럼 단위 update. login_id·user_id·must_change_password는 클라이언트가 못 바꾼다.
-- insert·delete 권한 없음.
grant select on public.students to authenticated;
grant update (name, grade, status, joined_at) on public.students to authenticated;
grant select, insert, update on public.student_private to authenticated;

-- service_role도 플랫폼 기본값에 기대지 않고 명시한다(생성·조회·수정만, 삭제 없음).
revoke all on public.students from service_role;
grant select, insert, update on public.students to service_role;
revoke all on public.student_private from service_role;
grant select on public.student_private to service_role;

-- ─── 정책 (private.*를 부르므로 모두 to authenticated) ───────────────
create policy students_admin_select on public.students
  for select to authenticated
  using (private.is_admin());
create policy students_self_select on public.students
  for select to authenticated
  using (id = private.my_student_id());
create policy students_admin_update on public.students
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy student_private_admin_select on public.student_private
  for select to authenticated
  using (private.is_admin());
create policy student_private_admin_insert on public.student_private
  for insert to authenticated
  with check (private.is_admin());
create policy student_private_admin_update on public.student_private
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- ─── 감사 ───────────────────────────────────────────────────────────
create trigger students_audit
  after insert or update or delete on public.students
  for each row execute function private.audit();
create trigger student_private_audit
  after insert or update or delete on public.student_private
  for each row execute function private.audit('student_id');
