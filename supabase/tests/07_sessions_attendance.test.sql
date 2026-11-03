-- sessions·attendance·homework_checks·class_roster·submit_homework 테스트(설계 13장 S1·S3, v1 스펙 §7·§11). 가짜 데이터만 쓴다.
-- 학생은 자기 반 수업과 자기 출결·숙제 행만 읽고, 쓰기는 submit_homework(submitted_at만) 하나뿐이다.
-- 같은 반 다른 학생 행·퇴원생·원장도 학생도 아닌 사용자·원장 aal1은 0행, anon은 권한 에러.
-- 수업·출결·숙제 쓰기는 원장(admins + aal2)만. 반에 없는 학생의 출결·숙제는 트리거가 막는다(P0001).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(105);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a007', 'admin7@example.test'),
  ('00000000-0000-4000-8000-00000000c007', 'ops_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000f007', 'ops_c@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d007', 'ops_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e007', 'ops_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b007', 'nobody7@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a007');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c007', '00000000-0000-4000-8000-00000000c007', 'ops_a', '가짜수업A', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000f007', '00000000-0000-4000-8000-00000000f007', 'ops_c', '가짜수업C', '중2', 'paused'),
  ('10000000-0000-4000-8000-00000000d007', '00000000-0000-4000-8000-00000000d007', 'ops_b', '가짜수업B', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000e007', '00000000-0000-4000-8000-00000000e007', 'ops_l', '가짜수업L', '중3', 'left');

-- 반 X(A·C·L), Y(B)
insert into public.classes (id, name, level) values
  ('20000000-0000-4000-8000-00000000a007', '가짜 수업반 X', 'middle'),
  ('20000000-0000-4000-8000-00000000b007', '가짜 수업반 Y', 'high');
insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000c007'),
  ('20000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000f007'),
  ('20000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000e007'),
  ('20000000-0000-4000-8000-00000000b007', '10000000-0000-4000-8000-00000000d007');

-- 수업 SX1(X, 숙제 있음), SX2(X, 숙제 없음), SY1(Y, 숙제 있음)
insert into public.sessions (id, class_id, date, homework) values
  ('30000000-0000-4000-8000-00000000a007', '20000000-0000-4000-8000-00000000a007', '2026-11-02', '(테스트) 단어 20개'),
  ('30000000-0000-4000-8000-00000000b007', '20000000-0000-4000-8000-00000000a007', '2026-11-04', null),
  ('30000000-0000-4000-8000-00000000c007', '20000000-0000-4000-8000-00000000b007', '2026-11-03', '(테스트) 독해 2지문');

insert into public.attendance (session_id, student_id, status) values
  ('30000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000c007', 'present'),
  ('30000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000f007', 'late'),
  ('30000000-0000-4000-8000-00000000c007', '10000000-0000-4000-8000-00000000d007', 'absent');
insert into public.homework_checks (session_id, student_id, status) values
  ('30000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000c007', 'done'),
  ('30000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000f007', 'missing'),
  ('30000000-0000-4000-8000-00000000c007', '10000000-0000-4000-8000-00000000d007', 'none');

-- ─── 권한 표 (service_role도 명시) ───────────────────────────────────
select table_privs_are('public', 'sessions', 'anon', ARRAY[]::text[], 'anon: sessions 권한 없음');
select table_privs_are('public', 'attendance', 'anon', ARRAY[]::text[], 'anon: attendance 권한 없음');
select table_privs_are('public', 'homework_checks', 'anon', ARRAY[]::text[], 'anon: homework_checks 권한 없음');
select table_privs_are('public', 'class_roster', 'anon', ARRAY[]::text[], 'anon: class_roster 권한 없음');
select table_privs_are('public', 'sessions', 'service_role', ARRAY[]::text[], 'service_role: sessions 권한 없음');
select table_privs_are('public', 'attendance', 'service_role', ARRAY[]::text[], 'service_role: attendance 권한 없음');
select table_privs_are('public', 'homework_checks', 'service_role', ARRAY[]::text[],
  'service_role: homework_checks 권한 없음');
select table_privs_are('public', 'class_roster', 'service_role', ARRAY[]::text[], 'service_role: class_roster 권한 없음');
-- insert·update는 컬럼 단위라 테이블 권한에는 SELECT만 보인다(= DELETE 없음).
select table_privs_are('public', 'sessions', 'authenticated', ARRAY['SELECT'],
  'authenticated: sessions 테이블 권한은 SELECT뿐 (DELETE 없음, 쓰기는 컬럼 단위)');
select table_privs_are('public', 'attendance', 'authenticated', ARRAY['SELECT'],
  'authenticated: attendance 테이블 권한은 SELECT뿐 (DELETE 없음, 쓰기는 컬럼 단위)');
select table_privs_are('public', 'homework_checks', 'authenticated', ARRAY['SELECT'],
  'authenticated: homework_checks 테이블 권한은 SELECT뿐 (DELETE 없음, 쓰기는 컬럼 단위)');
select table_privs_are('public', 'class_roster', 'authenticated', ARRAY['SELECT'],
  'authenticated: class_roster는 SELECT뿐');
select column_privs_are('public', 'homework_checks', 'submitted_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: homework_checks.submitted_at은 읽기만 (쓰기는 submit_homework뿐)');
select column_privs_are('public', 'homework_checks', 'status', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: homework_checks.status는 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'homework_checks', 'updated_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: homework_checks.updated_at은 읽기만');
select column_privs_are('public', 'attendance', 'status', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: attendance.status는 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'attendance', 'student_id', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: attendance.student_id는 INSERT·SELECT·UPDATE (PostgREST upsert용)');
select column_privs_are('public', 'attendance', 'updated_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: attendance.updated_at은 읽기만');
select column_privs_are('public', 'sessions', 'class_id', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: sessions.class_id는 INSERT·SELECT (반 옮기기 없음)');
select column_privs_are('public', 'sessions', 'date', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: sessions.date는 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'sessions', 'id', 'authenticated', ARRAY['SELECT'],
  'authenticated: sessions.id는 읽기만');

-- ─── 학생 A ──────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c007","role":"authenticated","aal":"aal1"}';
select results_eq('select id from public.sessions order by id',
  $$values ('30000000-0000-4000-8000-00000000a007'::uuid), ('30000000-0000-4000-8000-00000000b007'::uuid)$$,
  'A: sessions는 자기 반 수업 SX1·SX2만');
select results_eq('select session_id, student_id from public.attendance',
  $$values ('30000000-0000-4000-8000-00000000a007'::uuid, '10000000-0000-4000-8000-00000000c007'::uuid)$$,
  'A: attendance는 자기 행만 (같은 반 C 행은 안 보인다)');
select results_eq('select session_id, student_id from public.homework_checks',
  $$values ('30000000-0000-4000-8000-00000000a007'::uuid, '10000000-0000-4000-8000-00000000c007'::uuid)$$,
  'A: homework_checks는 자기 행만 (같은 반 C 행은 안 보인다)');
select results_eq('select class_id, student_id, name from public.class_roster',
  $$values ('20000000-0000-4000-8000-00000000a007'::uuid, '10000000-0000-4000-8000-00000000c007'::uuid, '가짜수업A')$$,
  'A: class_roster는 자기 행만');
select throws_ok($$insert into public.attendance (session_id, student_id, status)
                   values ('30000000-0000-4000-8000-00000000b007', '10000000-0000-4000-8000-00000000c007', 'present')$$,
  '42501', null, 'A: 자기 attendance insert는 RLS 에러');
select throws_ok($$insert into public.homework_checks (session_id, student_id, status)
                   values ('30000000-0000-4000-8000-00000000b007', '10000000-0000-4000-8000-00000000c007', 'done')$$,
  '42501', null, 'A: 자기 homework_checks insert는 RLS 에러');
select throws_ok($$insert into public.sessions (class_id, date)
                   values ('20000000-0000-4000-8000-00000000a007', '2026-11-20')$$,
  '42501', null, 'A: sessions insert는 RLS 에러');
select is_empty($$update public.attendance set status = 'present' returning 1$$, 'A: attendance update 0행');
select is_empty($$update public.sessions set summary = '해킹' returning 1$$, 'A: sessions update 0행');
select throws_ok($$update public.homework_checks set submitted_at = now()$$,
  '42501', null, 'A: homework_checks.submitted_at 직접 update는 권한 에러');
select is_empty($$update public.homework_checks set status = 'done' returning 1$$,
  'A: homework_checks status update 0행');
select throws_ok('delete from public.attendance', '42501', null, 'A: attendance delete는 권한 에러');

-- ─── 학생 C (A와 같은 반) ────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f007","role":"authenticated","aal":"aal1"}';
select results_eq('select student_id from public.attendance',
  $$values ('10000000-0000-4000-8000-00000000f007'::uuid)$$, 'C: attendance는 자기 행만 (A 행은 안 보인다)');
select results_eq('select student_id from public.homework_checks',
  $$values ('10000000-0000-4000-8000-00000000f007'::uuid)$$, 'C: homework_checks는 자기 행만 (A 행은 안 보인다)');

-- ─── 학생 B (다른 반) ────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d007","role":"authenticated","aal":"aal1"}';
select results_eq('select id from public.sessions',
  $$values ('30000000-0000-4000-8000-00000000c007'::uuid)$$, 'B: sessions는 SY1만');
select results_eq('select session_id from public.attendance',
  $$values ('30000000-0000-4000-8000-00000000c007'::uuid)$$, 'B: attendance는 자기 SY1 행만');
select results_eq('select session_id from public.homework_checks',
  $$values ('30000000-0000-4000-8000-00000000c007'::uuid)$$, 'B: homework_checks는 자기 SY1 행만');

-- ─── 퇴원생 L, 아무나, 원장 aal1: 0행 ────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e007","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.sessions), 0, '퇴원생 L: sessions 0행');
select is((select count(*)::int from public.attendance), 0, '퇴원생 L: attendance 0행');
select is((select count(*)::int from public.homework_checks), 0, '퇴원생 L: homework_checks 0행');
select is((select count(*)::int from public.class_roster), 0, '퇴원생 L: class_roster 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b007","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.sessions), 0, '아무나: sessions 0행');
select is((select count(*)::int from public.attendance), 0, '아무나: attendance 0행');
select is((select count(*)::int from public.homework_checks), 0, '아무나: homework_checks 0행');
select is((select count(*)::int from public.class_roster), 0, '아무나: class_roster 0행');
select throws_ok($$insert into public.sessions (class_id, date)
                   values ('20000000-0000-4000-8000-00000000a007', '2026-11-20')$$,
  '42501', null, '아무나: sessions insert는 RLS 에러');
select is_empty($$update public.attendance set status = 'present' returning 1$$, '아무나: attendance update 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a007","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.sessions), 0, '원장 aal1: sessions 0행');
select is((select count(*)::int from public.attendance), 0, '원장 aal1: attendance 0행');
select is((select count(*)::int from public.homework_checks), 0, '원장 aal1: homework_checks 0행');
select is((select count(*)::int from public.class_roster), 0, '원장 aal1: class_roster 0행');
select throws_ok($$insert into public.sessions (class_id, date)
                   values ('20000000-0000-4000-8000-00000000a007', '2026-11-20')$$,
  '42501', null, '원장 aal1: sessions insert는 RLS 에러');

-- ─── anon ────────────────────────────────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.sessions', '42501', null, 'anon: sessions select는 권한 에러');
select throws_ok('select * from public.attendance', '42501', null, 'anon: attendance select는 권한 에러');
select throws_ok('select * from public.homework_checks', '42501', null, 'anon: homework_checks select는 권한 에러');
select throws_ok('select * from public.class_roster', '42501', null, 'anon: class_roster select는 권한 에러');
select throws_ok($$select public.submit_homework('30000000-0000-4000-8000-00000000a007')$$,
  '42501', null, 'anon: submit_homework 실행은 권한 에러');

-- ─── 원장 aal2 ───────────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a007","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.sessions), 3, '원장 aal2: sessions 3행');
select is((select count(*)::int from public.attendance), 3, '원장 aal2: attendance 3행');
select is((select count(*)::int from public.homework_checks), 3, '원장 aal2: homework_checks 3행');
select results_eq('select class_id, student_id, name, grade::text, status::text from public.class_roster order by class_id, student_id',
  $$values ('20000000-0000-4000-8000-00000000a007'::uuid, '10000000-0000-4000-8000-00000000c007'::uuid, '가짜수업A', '중2', 'active'),
           ('20000000-0000-4000-8000-00000000a007'::uuid, '10000000-0000-4000-8000-00000000f007'::uuid, '가짜수업C', '중2', 'paused'),
           ('20000000-0000-4000-8000-00000000b007'::uuid, '10000000-0000-4000-8000-00000000d007'::uuid, '가짜수업B', '고1', 'active')$$,
  '원장 aal2: class_roster는 퇴원생 L을 뺀 배정 3행 (휴원생은 남는다)');

select lives_ok($$insert into public.sessions (class_id, date)
                   values ('20000000-0000-4000-8000-00000000a007', '2026-11-09')$$,
  '원장 aal2: 수업 insert 성공');
select throws_ok($$insert into public.sessions (class_id, date)
                   values ('20000000-0000-4000-8000-00000000a007', '2026-11-09')$$,
  '23505', null, '원장 aal2: 같은 반·같은 날짜 수업은 unique 위반');
select throws_ok($$insert into public.sessions (class_id, date, homework_due)
                   values ('20000000-0000-4000-8000-00000000a007', '2026-11-10', '2026-11-01')$$,
  '23514', null, '원장 aal2: 숙제 마감이 수업 날짜보다 앞서면 check 위반');
select lives_ok($$insert into public.sessions (class_id, date, homework, homework_due)
                   values ('20000000-0000-4000-8000-00000000a007', '2026-11-11', '(테스트) 오답 정리', '2026-11-11')$$,
  '원장 aal2: 숙제 마감이 수업 날짜와 같으면 통과');
select throws_ok($$update public.sessions set class_id = '20000000-0000-4000-8000-00000000b007'$$,
  '42501', null, '원장 aal2: sessions.class_id update는 권한 에러 (반 옮기기 없음)');
select throws_ok('delete from public.sessions', '42501', null, '원장 aal2: sessions delete는 권한 에러');
select throws_ok('delete from public.homework_checks', '42501', null, '원장 aal2: homework_checks delete는 권한 에러');
select lives_ok($$update public.sessions set summary = E'줄1\n줄2\t탭'
                   where id = '30000000-0000-4000-8000-00000000a007'$$,
  '원장 aal2: summary의 줄바꿈·탭은 통과');
select throws_ok($$update public.sessions set summary = E'벨\x07'
                   where id = '30000000-0000-4000-8000-00000000a007'$$,
  '23514', null, '원장 aal2: summary의 제어 문자(BEL)는 check 위반');
select throws_ok($$update public.sessions set homework = E'숙제\x1b'
                   where id = '30000000-0000-4000-8000-00000000a007'$$,
  '23514', null, '원장 aal2: homework의 제어 문자(ESC)는 check 위반');
select throws_ok($$update public.sessions set homework = repeat('가', 1001)
                   where id = '30000000-0000-4000-8000-00000000a007'$$,
  '23514', null, '원장 aal2: homework 1001자는 check 위반');
select throws_ok($$update public.sessions set summary = repeat('가', 2001)
                   where id = '30000000-0000-4000-8000-00000000a007'$$,
  '23514', null, '원장 aal2: summary 2001자는 check 위반');

-- upsert 모양(PostgREST는 payload 컬럼을 모두 do update set에 넣는다): 새 행, 기존 행 둘 다 통과.
select lives_ok($$insert into public.attendance (session_id, student_id, status)
                   values ('30000000-0000-4000-8000-00000000b007', '10000000-0000-4000-8000-00000000c007', 'present')
                   on conflict (session_id, student_id) do update
                   set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status
                   returning status$$,
  '원장 aal2: attendance upsert (새 행) 성공');
select lives_ok($$insert into public.attendance (session_id, student_id, status)
                   values ('30000000-0000-4000-8000-00000000b007', '10000000-0000-4000-8000-00000000c007', 'late')
                   on conflict (session_id, student_id) do update
                   set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status
                   returning status$$,
  '원장 aal2: attendance upsert (기존 행) 성공');
select is((select status::text from public.attendance
            where session_id = '30000000-0000-4000-8000-00000000b007'
              and student_id = '10000000-0000-4000-8000-00000000c007'),
  'late', '원장 aal2: attendance upsert 뒤 값은 late');
select lives_ok($$insert into public.homework_checks (session_id, student_id, status)
                   values ('30000000-0000-4000-8000-00000000b007', '10000000-0000-4000-8000-00000000c007', 'done')
                   on conflict (session_id, student_id) do update
                   set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status
                   returning status$$,
  '원장 aal2: homework_checks upsert (새 행) 성공');
select lives_ok($$insert into public.homework_checks (session_id, student_id, status)
                   values ('30000000-0000-4000-8000-00000000b007', '10000000-0000-4000-8000-00000000c007', 'missing')
                   on conflict (session_id, student_id) do update
                   set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status
                   returning status$$,
  '원장 aal2: homework_checks upsert (기존 행) 성공');
select is((select status::text from public.homework_checks
            where session_id = '30000000-0000-4000-8000-00000000b007'
              and student_id = '10000000-0000-4000-8000-00000000c007'),
  'missing', '원장 aal2: homework_checks upsert 뒤 값은 missing');

-- 반 소속 검사(트리거, P0001)
select throws_ok($$insert into public.attendance (session_id, student_id, status)
                   values ('30000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000d007', 'present')$$,
  'P0001', '이 반 학생이 아니에요. 반 배정을 먼저 확인해 주세요.',
  '원장 aal2: 다른 반 학생 B의 attendance insert는 거부');
select throws_ok($$insert into public.homework_checks (session_id, student_id, status)
                   values ('30000000-0000-4000-8000-00000000a007', '10000000-0000-4000-8000-00000000d007', 'done')$$,
  'P0001', '이 반 학생이 아니에요. 반 배정을 먼저 확인해 주세요.',
  '원장 aal2: 다른 반 학생 B의 homework_checks insert는 거부');
select throws_ok($$update public.attendance set student_id = '10000000-0000-4000-8000-00000000d007'
                   where session_id = '30000000-0000-4000-8000-00000000a007'
                     and student_id = '10000000-0000-4000-8000-00000000c007'$$,
  'P0001', '이 반 학생이 아니에요. 반 배정을 먼저 확인해 주세요.',
  '원장 aal2: attendance 행을 다른 반 학생으로 옮기는 update도 거부');
select throws_ok($$insert into public.homework_checks (session_id, student_id, status, submitted_at)
                   values ('30000000-0000-4000-8000-00000000b007', '10000000-0000-4000-8000-00000000f007', 'done', now())$$,
  '42501', null, '원장 aal2: homework_checks.submitted_at insert는 권한 에러');
select throws_ok($$update public.homework_checks set updated_at = now()$$,
  '42501', null, '원장 aal2: homework_checks.updated_at 직접 update는 권한 에러');

-- updated_at 트리거
reset role;
update public.attendance set updated_at = '2000-01-01' where session_id = '30000000-0000-4000-8000-00000000a007'
  and student_id = '10000000-0000-4000-8000-00000000c007';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a007","role":"authenticated","aal":"aal2"}';
update public.attendance set status = 'absent' where session_id = '30000000-0000-4000-8000-00000000a007'
  and student_id = '10000000-0000-4000-8000-00000000c007';
select ok((select updated_at > '2000-01-01' from public.attendance
            where session_id = '30000000-0000-4000-8000-00000000a007'
              and student_id = '10000000-0000-4000-8000-00000000c007'),
  'attendance update는 updated_at을 새로 고친다');

-- ─── submit_homework ─────────────────────────────────────────────────
reset role;
update public.homework_checks set status = 'missing', submitted_at = '2026-11-02 20:00+09'
 where session_id = '30000000-0000-4000-8000-00000000a007' and student_id = '10000000-0000-4000-8000-00000000c007';
delete from public.homework_checks
 where session_id = '30000000-0000-4000-8000-00000000a007' and student_id = '10000000-0000-4000-8000-00000000f007';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c007","role":"authenticated","aal":"aal1"}';
select is(public.submit_homework('30000000-0000-4000-8000-00000000a007'), '2026-11-02 20:00+09'::timestamptz,
  'A: 다시 제출해도 처음 제출 시각을 돌려준다');
select results_eq($$select status::text, submitted_at from public.homework_checks
                     where session_id = '30000000-0000-4000-8000-00000000a007'$$,
  $$values ('missing', '2026-11-02 20:00+09'::timestamptz)$$,
  'A: 제출해도 원장이 매긴 status(missing)와 처음 제출 시각은 그대로');
select throws_ok($$select public.submit_homework('30000000-0000-4000-8000-00000000c007')$$,
  'P0001', '내 반 수업의 숙제만 제출할 수 있어요. 수업을 다시 골라 주세요.',
  'A: 다른 반 수업 SY1 제출은 거부');
select throws_ok($$select public.submit_homework(gen_random_uuid())$$,
  'P0001', '내 반 수업의 숙제만 제출할 수 있어요. 수업을 다시 골라 주세요.',
  'A: 없는 수업 제출도 같은 문구로 거부');
select throws_ok($$select public.submit_homework('30000000-0000-4000-8000-00000000b007')$$,
  'P0001', '숙제가 없는 수업이에요. 숙제가 있는 수업을 골라 주세요.',
  'A: 숙제가 없는(null) 수업 SX2 제출은 거부');

reset role;
update public.sessions set homework = E' \n\t ' where id = '30000000-0000-4000-8000-00000000b007';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c007","role":"authenticated","aal":"aal1"}';
select throws_ok($$select public.submit_homework('30000000-0000-4000-8000-00000000b007')$$,
  'P0001', '숙제가 없는 수업이에요. 숙제가 있는 수업을 골라 주세요.',
  'A: 숙제가 공백뿐인 수업 제출도 거부');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f007","role":"authenticated","aal":"aal1"}';
select isnt(public.submit_homework('30000000-0000-4000-8000-00000000a007'), null,
  'C: 행이 없을 때 제출하면 제출 시각을 돌려준다');
select results_eq($$select status::text, submitted_at is not null from public.homework_checks
                     where session_id = '30000000-0000-4000-8000-00000000a007'$$,
  $$values ('none', true)$$,
  'C: 새 행은 status none, submitted_at 채움');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a007","role":"authenticated","aal":"aal2"}';
select throws_ok($$select public.submit_homework('30000000-0000-4000-8000-00000000a007')$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '원장 aal2: submit_homework는 거부');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e007","role":"authenticated","aal":"aal1"}';
select throws_ok($$select public.submit_homework('30000000-0000-4000-8000-00000000a007')$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '퇴원생 L: submit_homework는 거부');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b007","role":"authenticated","aal":"aal2"}';
select throws_ok($$select public.submit_homework('30000000-0000-4000-8000-00000000a007')$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '아무나: submit_homework는 거부');

reset role;
select is((select submitted_at from public.homework_checks
            where session_id = '30000000-0000-4000-8000-00000000c007'
              and student_id = '10000000-0000-4000-8000-00000000d007'),
  null, 'postgres: 다른 반 B의 SY1 행 submitted_at은 null 그대로');
select is((select count(*)::int from public.homework_checks where submitted_at is not null), 2,
  'postgres: 제출 시각이 있는 행은 A·C의 SX1 두 개뿐');

-- ─── 이름 제어 문자 금지 ─────────────────────────────────────────────
select throws_ok($$insert into public.students (login_id, name, grade) values ('ops_ctrl', E'김\x01', '중1')$$,
  '23514', null, '이름: students.name의 제어 문자는 check 위반');
select throws_ok($$update public.students set name = E'김\n하늘' where login_id = 'ops_a'$$,
  '23514', null, '이름: students.name의 줄바꿈도 check 위반');
select throws_ok($$insert into public.classes (name, level) values (E'반\t1', 'middle')$$,
  '23514', null, '이름: classes.name의 탭은 check 위반');
select lives_ok($$insert into public.classes (name, level) values ('가짜 보통반 1', 'middle')$$,
  '이름: 보통 반 이름은 통과');

-- ─── 수업 삭제 시 출결·숙제도 지워진다(on delete cascade, postgres로) ─
delete from public.sessions where id = '30000000-0000-4000-8000-00000000a007';
select is((select count(*)::int from public.attendance where session_id = '30000000-0000-4000-8000-00000000a007'), 0,
  'cascade: 수업을 지우면 그 출결 행도 지워진다');
select is((select count(*)::int from public.homework_checks where session_id = '30000000-0000-4000-8000-00000000a007'), 0,
  'cascade: 수업을 지우면 그 숙제 행도 지워진다');

select * from finish();
rollback;
