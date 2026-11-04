-- students·student_private 권한 테스트(설계 13장 S1·S3·S12, v1 스펙 §7·§11). 가짜 데이터만 쓴다.
-- 학생은 본인 행만 읽고 아무것도 못 고친다(첫 로그인 해제는 password_changed()로만).
-- 퇴원생은 my_student_id()가 null이라 0행. student_private는 원장(admins + aal2)만.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(75);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.student_private;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a004', 'admin4@example.test'),
  ('00000000-0000-4000-8000-00000000c004', 'haneul_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d004', 'minjun_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e004', 'left_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000f004', 'new_s@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b004', 'nobody4@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a004');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c004', '00000000-0000-4000-8000-00000000c004', 'haneul_a', '가짜하늘', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000d004', '00000000-0000-4000-8000-00000000d004', 'minjun_b', '가짜민준', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000e004', '00000000-0000-4000-8000-00000000e004', 'left_l', '가짜퇴원', '중3', 'left');
insert into public.student_private (student_id, school, guardian_name, guardian_phone, memo) values
  ('10000000-0000-4000-8000-00000000c004', '가짜중학교', '가짜보호자A', '010-0000-0004', null),
  ('10000000-0000-4000-8000-00000000d004', '가짜고등학교', '가짜보호자B', '010-0000-0005', null);

-- ─── 권한 표 (service_role도 명시) ───────────────────────────────────
select table_privs_are('public', 'students', 'service_role', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'service_role: students 권한은 SELECT·INSERT·UPDATE');
select table_privs_are('public', 'student_private', 'service_role', ARRAY['SELECT'],
  'service_role: student_private 권한은 SELECT뿐');
select table_privs_are('public', 'students', 'anon', ARRAY[]::text[], 'anon: students 권한 없음');
select table_privs_are('public', 'student_private', 'anon', ARRAY[]::text[], 'anon: student_private 권한 없음');
-- authenticated의 student_private 쓰기는 컬럼 단위라 테이블 권한에는 SELECT만 보인다(= DELETE 없음).
-- student_id는 UPDATE에도 있다: PostgREST upsert가 payload 컬럼(student_id 포함)을 모두 do update set에 넣기 때문.
-- updated_at은 트리거만 고친다.
select table_privs_are('public', 'student_private', 'authenticated', ARRAY['SELECT'],
  'authenticated: student_private 테이블 권한은 SELECT뿐 (쓰기는 컬럼 단위, DELETE 없음)');
select column_privs_are('public', 'student_private', 'student_id', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: student_private.student_id는 INSERT·SELECT·UPDATE (upsert용)');
select column_privs_are('public', 'student_private', 'school', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: student_private.school은 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'student_private', 'guardian_name', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: student_private.guardian_name은 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'student_private', 'guardian_phone', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: student_private.guardian_phone은 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'student_private', 'memo', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: student_private.memo는 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'student_private', 'updated_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: student_private.updated_at은 읽기만 (트리거가 고친다)');

-- ─── 함수: my_student_id(), my_role() ────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c004","role":"authenticated","aal":"aal1"}';
select is(private.my_student_id(), '10000000-0000-4000-8000-00000000c004'::uuid, 'A: my_student_id() = A');
select is(public.my_role(), 'student', 'A: my_role() = student');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e004","role":"authenticated","aal":"aal1"}';
select is(private.my_student_id(), null, '퇴원생 L: my_student_id() = null');
select is(public.my_role(), null, '퇴원생 L: my_role() = null');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b004","role":"authenticated","aal":"aal2"}';
select is(private.my_student_id(), null, '아무나: my_student_id() = null');
select is(public.my_role(), null, '아무나: my_role() = null');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated","aal":"aal2"}';
select is(private.my_student_id(), null, '원장 aal2: my_student_id() = null');
select is(public.my_role(), 'admin', '원장 aal2: my_role() = admin');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated","aal":"aal1"}';
select is(public.my_role(), null, '원장 aal1: my_role() = null');

-- ─── students 읽기 ───────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c004","role":"authenticated","aal":"aal1"}';
select results_eq('select id from public.students',
  $$values ('10000000-0000-4000-8000-00000000c004'::uuid)$$,
  'A: students는 자기 행 1개만 (B는 안 보인다)');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e004","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.students), 0, '퇴원생 L: students 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b004","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.students), 0, '아무나: students 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.students), 0, '원장 aal1: students 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.students), 3, '원장 aal2: students 3행');

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.students', '42501', null, 'anon: students select는 권한 에러');
select throws_ok('select * from public.student_private', '42501', null, 'anon: student_private select는 권한 에러');

-- ─── students 쓰기 ───────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c004","role":"authenticated","aal":"aal1"}';
select is_empty($$update public.students set name = 'x'
                   where id = '10000000-0000-4000-8000-00000000d004' returning id$$,
  'A: B 행 update 0행');
select is_empty($$update public.students set name = 'x'
                   where id = '10000000-0000-4000-8000-00000000c004' returning id$$,
  'A: 자기 행 update도 0행 (수정은 원장만)');
select throws_ok('update public.students set must_change_password = false', '42501', null,
  'A: must_change_password 직접 update는 컬럼 권한 에러');
select throws_ok($$insert into public.students (login_id, name, grade) values ('a_new', 'x', '중1')$$,
  '42501', null, 'A: students insert는 권한 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b004","role":"authenticated","aal":"aal2"}';
select is_empty($$update public.students set name = 'x' returning id$$, '아무나: students update 0행');
select throws_ok('delete from public.students', '42501', null, '아무나: students delete는 권한 에러');
select throws_ok($$insert into public.students (login_id, name, grade) values ('nobody_new', 'x', '중1')$$,
  '42501', null, '아무나: students insert는 권한 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated","aal":"aal2"}';
select throws_ok('update public.students set must_change_password = false', '42501', null,
  '원장 aal2: must_change_password update는 컬럼 권한 에러');
select throws_ok($$update public.students set login_id = 'zzz'$$, '42501', null,
  '원장 aal2: login_id update는 컬럼 권한 에러');
select throws_ok($$update public.students set user_id = null$$, '42501', null,
  '원장 aal2: user_id update는 컬럼 권한 에러');
select lives_ok($$update public.students set name = '김하늘', status = 'paused'
                   where id = '10000000-0000-4000-8000-00000000c004'$$,
  '원장 aal2: name·status update 성공');
select throws_ok($$insert into public.students (login_id, name, grade) values ('admin_new', 'x', '중1')$$,
  '42501', null, '원장 aal2: students insert는 권한 에러 (생성은 service_role뿐)');
select throws_ok('delete from public.students', '42501', null,
  '원장 aal2: students delete는 권한 에러 (삭제 대신 left)');

reset role;
select results_eq($$select name, status::text from public.students
                     where id = '10000000-0000-4000-8000-00000000c004'$$,
  $$values ('김하늘', 'paused')$$, '원장 aal2: update 뒤 값이 바뀐다');
-- 휴원(paused)도 학생 본인으로 남는다. 이후 검사를 위해 되돌린다.
update public.students set status = 'active' where id = '10000000-0000-4000-8000-00000000c004';

-- ─── password_changed() ──────────────────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select public.password_changed()', '42501', null, 'anon: password_changed() 실행은 권한 에러');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c004","role":"authenticated","aal":"aal1"}';
select lives_ok('select public.password_changed()', 'A: password_changed() 성공');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e004","role":"authenticated","aal":"aal1"}';
select lives_ok('select public.password_changed()', '퇴원생 L: password_changed()는 에러 없이 아무 일도 없다');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b004","role":"authenticated","aal":"aal2"}';
select lives_ok('select public.password_changed()', '아무나: password_changed()는 에러 없이 아무 일도 없다');

reset role;
select results_eq($$select login_id, must_change_password from public.students order by login_id$$,
  $$values ('haneul_a', false), ('left_l', true), ('minjun_b', true)$$,
  'password_changed(): A만 false, B·L은 true 그대로');

-- ─── admin_user_exists() (service_role 전용) ─────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated","aal":"aal2"}';
select throws_ok($$select public.admin_user_exists('00000000-0000-4000-8000-00000000a004')$$,
  '42501', null, '원장 aal2: admin_user_exists() 실행은 권한 에러');
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select public.admin_user_exists('00000000-0000-4000-8000-00000000a004')$$,
  '42501', null, 'anon: admin_user_exists() 실행은 권한 에러');
reset role;
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select is(public.admin_user_exists('00000000-0000-4000-8000-00000000a004'), true,
  'service_role: 원장 id → true');
select is(public.admin_user_exists('00000000-0000-4000-8000-00000000c004'), false,
  'service_role: 학생 A user_id → false');

-- ─── student_private ─────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c004","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.student_private), 0, 'A: student_private 0행');
select throws_ok($$insert into public.student_private (student_id, memo)
                   values ('10000000-0000-4000-8000-00000000c004', 'x')$$,
  '42501', null, 'A: 자기 student_private insert는 RLS 에러');
select is_empty($$update public.student_private set memo = 'x' returning student_id$$,
  'A: student_private update 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d004","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.student_private), 0, 'B: student_private 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b004","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.student_private), 0, '아무나: student_private 0행');
select throws_ok($$insert into public.student_private (student_id, memo)
                   values ('10000000-0000-4000-8000-00000000e004', 'x')$$,
  '42501', null, '아무나: student_private insert는 RLS 에러');
select is_empty($$update public.student_private set memo = 'x' returning student_id$$,
  '아무나: student_private update 0행');
select throws_ok('delete from public.student_private', '42501', null,
  '아무나: student_private delete는 권한 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.student_private), 0, '원장 aal1: student_private 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a004","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.student_private), 2, '원장 aal2: student_private 2행');
select lives_ok($$insert into public.student_private (student_id, memo)
                   values ('10000000-0000-4000-8000-00000000c004', '가짜 메모')
                   on conflict (student_id) do update set memo = excluded.memo$$,
  '원장 aal2: upsert로 A 메모 수정 성공');

-- 앱(saveStudentPrivate)이 PostgREST로 보내는 upsert 모양: payload 컬럼이 모두 do update set에 들어간다.
select lives_ok($$insert into public.student_private (student_id, school, guardian_name, guardian_phone, memo)
                   values ('10000000-0000-4000-8000-00000000c004', '가짜중학교', '가짜보호자A', '010-0000-0004', '가짜 메모')
                   on conflict (student_id) do update
                   set student_id = excluded.student_id, school = excluded.school,
                       guardian_name = excluded.guardian_name, guardian_phone = excluded.guardian_phone,
                       memo = excluded.memo$$,
  '원장 aal2: 앱 모양 upsert(student_id까지 set) 성공');
select throws_ok($$update public.student_private set updated_at = now()$$,
  '42501', null, '원장 aal2: student_private.updated_at 직접 update는 권한 에러');

reset role;
select is((select memo from public.student_private where student_id = '10000000-0000-4000-8000-00000000c004'),
  '가짜 메모', '원장 aal2: upsert 뒤 메모가 바뀐다');

-- ─── 제약 ────────────────────────────────────────────────────────────
select throws_ok($$insert into public.students (login_id, name, grade) values ('Bad-Id', 'x', '중1')$$,
  '23514', null, '제약: 대문자·하이픈 아이디는 check 위반');
select throws_ok($$insert into public.students (login_id, name, grade) values ('ab', 'x', '중1')$$,
  '23514', null, '제약: 2자 아이디는 check 위반');
select throws_ok($$insert into public.students (login_id, name, grade) values ('haneul_a', 'x', '중1')$$,
  '23505', null, '제약: 중복 아이디는 unique 위반');
select throws_ok($$insert into public.students (login_id, name, grade) values ('blank_n', '  ', '중1')$$,
  '23514', null, '제약: 공백뿐인 이름은 check 위반');
select throws_ok($$insert into public.student_private (student_id, guardian_phone)
                   values ('10000000-0000-4000-8000-00000000e004', '01000000000')$$,
  '23514', null, '제약: 하이픈 없는 보호자 번호는 check 위반');

-- ─── service_role: 학생 생성 ─────────────────────────────────────────
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select lives_ok($$insert into public.students (user_id, login_id, name, grade)
                   values ('00000000-0000-4000-8000-00000000f004', 'new_s', '가짜새학생', '고2')$$,
  'service_role: students insert 성공');
reset role;
select results_eq($$select must_change_password, status::text, joined_at = current_date
                     from public.students where login_id = 'new_s'$$,
  $$values (true, 'active', true)$$,
  'service_role insert: must_change_password = true, status = active, joined_at = 오늘');

-- ─── 감사 로그 ───────────────────────────────────────────────────────
select ok(exists (select 1 from private.audit_log
                   where table_name = 'public.students' and op = 'UPDATE'
                     and row_id = '10000000-0000-4000-8000-00000000c004'
                     and actor = '00000000-0000-4000-8000-00000000a004'),
  '감사: 원장의 students update가 actor = 원장으로 남는다');
select ok(exists (select 1 from private.audit_log
                   where table_name = 'public.students' and op = 'UPDATE'
                     and row_id = '10000000-0000-4000-8000-00000000c004'
                     and actor = '00000000-0000-4000-8000-00000000c004'),
  '감사: A의 password_changed()가 actor = A로 남는다');
select ok(exists (select 1 from private.audit_log
                   where table_name = 'public.student_private' and op = 'UPDATE'
                     and row_id = '10000000-0000-4000-8000-00000000c004'
                     and actor = '00000000-0000-4000-8000-00000000a004'),
  '감사: student_private update가 row_id = student_id로 남는다');
select ok(exists (select 1 from private.audit_log a
                   join public.students s on a.row_id = s.id::text
                   where a.table_name = 'public.students' and a.op = 'INSERT' and s.login_id = 'new_s'),
  '감사: service_role의 students insert도 남는다');

select * from finish();
rollback;
