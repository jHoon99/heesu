-- 수업·출결·숙제 확인·반 명단 view·숙제 제출 RPC·이름 제어 문자 금지(설계 13장 S1·S3, v1 스펙 §7·§11).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/07_sessions_attendance.test.sql, 00_meta.test.sql(함수 허용 목록)
-- 학생은 자기 반 수업과 자기 출결·숙제 행만 읽는다. 퇴원생은 my_student_id()가 null이라 0행(spec §11).
-- 학생 쓰기는 submit_homework 하나, submitted_at만. 나머지 쓰기는 원장(admins + aal2)만, 삭제는 없다.
-- 감사 대상 아님(spec §7 목록에 없다). service_role(Edge Function)은 이 테이블들을 쓰지 않으므로 권한을 주지 않는다.

-- ─── 타입·테이블 ─────────────────────────────────────────────────────
create type public.attendance_status as enum ('none', 'present', 'late', 'absent', 'makeup');
create type public.homework_status as enum ('none', 'done', 'missing');

-- summary·homework: 줄바꿈·탭은 허용, 그 밖 제어 문자 금지.
-- (앱의 hasControlChars(multiline)는 이보다 엄격하다: \r와 C1(U+0080~U+009F)도 막는다.)
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  date date not null,
  summary text,
  homework text,
  homework_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, date),
  check (homework_due is null or homework_due >= date),
  check (summary is null or (char_length(summary) <= 2000 and summary !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]')),
  check (homework is null or (char_length(homework) <= 1000 and homework !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'))
);
alter table public.sessions enable row level security;

create table public.attendance (
  session_id uuid references public.sessions on delete cascade,
  student_id uuid references public.students on delete cascade,
  status public.attendance_status not null default 'none',
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
alter table public.attendance enable row level security;
create index attendance_student_id_idx on public.attendance (student_id);

create table public.homework_checks (
  session_id uuid references public.sessions on delete cascade,
  student_id uuid references public.students on delete cascade,
  status public.homework_status not null default 'none',
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
alter table public.homework_checks enable row level security;
create index homework_checks_student_id_idx on public.homework_checks (student_id);

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function private.set_updated_at();
create trigger attendance_set_updated_at
  before update on public.attendance
  for each row execute function private.set_updated_at();
create trigger homework_checks_set_updated_at
  before update on public.homework_checks
  for each row execute function private.set_updated_at();

-- ─── 반 소속 검사 ────────────────────────────────────────────────────
-- 출결·숙제 행의 학생은 그 수업의 반에 배정돼 있어야 한다. 어기면 P0001(화면에 문구를 그대로 보여 준다).
-- 트리거 함수는 실행 권한 없이도 트리거로 불린다.
create function private.check_session_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.sessions s
      join public.class_members m on m.class_id = s.class_id
     where s.id = new.session_id and m.student_id = new.student_id
  ) then
    raise exception '이 반 학생이 아니에요. 반 배정을 먼저 확인해 주세요.';
  end if;
  return new;
end;
$$;
revoke all on function private.check_session_member() from public, anon, authenticated, service_role;

create trigger attendance_check_member
  before insert or update of session_id, student_id on public.attendance
  for each row execute function private.check_session_member();
create trigger homework_checks_check_member
  before insert or update of session_id, student_id on public.homework_checks
  for each row execute function private.check_session_member();

-- ─── 반 명단 view ────────────────────────────────────────────────────
-- 반별 학생 목록(출결 표·진행률·인원 수)은 이 view로 읽는다: 퇴원생은 여기서 뺀다(화면마다 거르지 않는다).
-- security_invoker라 class_members·students RLS가 그대로 걸린다(원장은 전부, 학생은 자기 행만).
create view public.class_roster
with (security_invoker = true)
as
select m.class_id, m.student_id, s.name, s.grade, s.status
  from public.class_members m
  join public.students s on s.id = m.student_id
 where s.status <> 'left';

-- ─── 권한 ───────────────────────────────────────────────────────────
-- 플랫폼 기본값에 기대지 않는다: 모두 회수한 뒤 필요한 것만 준다.
revoke all on public.sessions from anon, authenticated, service_role;
revoke all on public.attendance from anon, authenticated, service_role;
revoke all on public.homework_checks from anon, authenticated, service_role;
revoke all on public.class_roster from anon, authenticated, service_role;

-- authenticated: 행은 아래 정책이 거른다. 삭제·class_id 바꾸기 없음. submitted_at은 어떤 grant에도 없다(submit_homework만).
grant select on public.sessions to authenticated;
grant insert (class_id, date, summary, homework, homework_due) on public.sessions to authenticated;
grant update (date, summary, homework, homework_due) on public.sessions to authenticated;
-- update에 session_id·student_id가 있는 이유: PostgREST upsert가 on conflict do update set에 payload 컬럼을 모두
-- 넣기 때문이다. 행은 정책이 원장으로 제한하고, 반 소속은 check_session_member 트리거가 검사한다.
grant select on public.attendance to authenticated;
grant insert (session_id, student_id, status) on public.attendance to authenticated;
grant update (session_id, student_id, status) on public.attendance to authenticated;
grant select on public.homework_checks to authenticated;
grant insert (session_id, student_id, status) on public.homework_checks to authenticated;
grant update (session_id, student_id, status) on public.homework_checks to authenticated;
grant select on public.class_roster to authenticated;

-- ─── 정책 (private.*를 부르므로 모두 to authenticated) ───────────────
create policy sessions_admin_select on public.sessions
  for select to authenticated
  using ((select private.is_admin()));
create policy sessions_admin_insert on public.sessions
  for insert to authenticated
  with check ((select private.is_admin()));
create policy sessions_admin_update on public.sessions
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy sessions_member_select on public.sessions
  for select to authenticated
  using (exists (select 1 from public.class_members m
                  where m.class_id = sessions.class_id and m.student_id = (select private.my_student_id())));

create policy attendance_admin_select on public.attendance
  for select to authenticated
  using ((select private.is_admin()));
create policy attendance_admin_insert on public.attendance
  for insert to authenticated
  with check ((select private.is_admin()));
create policy attendance_admin_update on public.attendance
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy attendance_self_select on public.attendance
  for select to authenticated
  using (student_id = (select private.my_student_id()));

create policy homework_checks_admin_select on public.homework_checks
  for select to authenticated
  using ((select private.is_admin()));
create policy homework_checks_admin_insert on public.homework_checks
  for insert to authenticated
  with check ((select private.is_admin()));
create policy homework_checks_admin_update on public.homework_checks
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy homework_checks_self_select on public.homework_checks
  for select to authenticated
  using (student_id = (select private.my_student_id()));

-- ─── 숙제 제출 RPC ───────────────────────────────────────────────────
-- 학생이 자기 반 수업의 숙제를 냈다고 표시한다. 처음 제출 시각을 지키고 status(원장이 매긴다)는 건드리지 않는다.
-- 없는 수업과 다른 반 수업은 같은 문구로 거부한다(수업 id가 있는지 알려 주지 않는다).
create function public.submit_homework(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := private.my_student_id();
  v_homework text;
  v_submitted_at timestamptz;
begin
  if v_student_id is null then
    raise exception '학생 계정으로 로그인해 주세요.';
  end if;

  select s.homework into v_homework
    from public.sessions s
    join public.class_members m on m.class_id = s.class_id
   where s.id = p_session_id and m.student_id = v_student_id;
  if not found then
    raise exception '내 반 수업의 숙제만 제출할 수 있어요. 수업을 다시 골라 주세요.';
  end if;

  if v_homework is null or v_homework ~ '^\s*$' then
    raise exception '숙제가 없는 수업이에요. 숙제가 있는 수업을 골라 주세요.';
  end if;

  insert into public.homework_checks (session_id, student_id, submitted_at)
  values (p_session_id, v_student_id, now())
  on conflict (session_id, student_id) do update
    set submitted_at = coalesce(public.homework_checks.submitted_at, excluded.submitted_at)
  returning submitted_at into v_submitted_at;
  return v_submitted_at;
end;
$$;
revoke all on function public.submit_homework(uuid) from public, anon, authenticated, service_role;
grant execute on function public.submit_homework(uuid) to authenticated;

-- ─── 이름 제어 문자 금지 ─────────────────────────────────────────────
-- 원장 화면에 그대로 보이는 이름에 보이지 않는 문자가 섞이지 않게 한다(앱은 hasControlChars로 먼저 막는다).
alter table public.students add constraint students_name_no_control check (name !~ '[[:cntrl:]]');
alter table public.classes add constraint classes_name_no_control check (name !~ '[[:cntrl:]]');
