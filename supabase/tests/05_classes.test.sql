-- classes·class_members 권한·시간표 검사 테스트(설계 13장 S1·S3, v1 스펙 §7·§11). 가짜 데이터만 쓴다.
-- 학생은 자기가 속한 반과 자기 배정 행만 읽고 아무것도 못 고친다. 퇴원생은 0행.
-- 반 만들기·고치기·배정은 원장(admins + aal2)만. 반 삭제는 누구도 못 한다(v1은 이름 바꾸기로 대신).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(63);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.class_members;
delete from public.classes;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a005', 'admin5@example.test'),
  ('00000000-0000-4000-8000-00000000c005', 'class_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d005', 'class_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e005', 'class_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b005', 'nobody5@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a005');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c005', '00000000-0000-4000-8000-00000000c005', 'class_a', '가짜학생A', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000d005', '00000000-0000-4000-8000-00000000d005', 'class_b', '가짜학생B', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000e005', '00000000-0000-4000-8000-00000000e005', 'class_l', '가짜퇴원L', '중3', 'left');

-- 반 X(A, L 소속), Y(B 소속)
insert into public.classes (id, name, level, schedule, capacity) values
  ('20000000-0000-4000-8000-00000000a005', '가짜 반 X', 'middle', '[{"day":1,"start":"17:00","end":"19:00"}]', 8),
  ('20000000-0000-4000-8000-00000000b005', '가짜 반 Y', 'high', '[]', null);
insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-00000000a005', '10000000-0000-4000-8000-00000000c005'),
  ('20000000-0000-4000-8000-00000000a005', '10000000-0000-4000-8000-00000000e005'),
  ('20000000-0000-4000-8000-00000000b005', '10000000-0000-4000-8000-00000000d005');

-- ─── 권한 표 (service_role도 명시) ───────────────────────────────────
select table_privs_are('public', 'classes', 'authenticated', ARRAY['SELECT'],
  'authenticated: classes 테이블 권한은 SELECT뿐 (INSERT·UPDATE는 컬럼 단위, DELETE 없음)');
select column_privs_are('public', 'classes', 'name', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: classes.name은 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'classes', 'level', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: classes.level은 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'classes', 'schedule', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: classes.schedule은 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'classes', 'capacity', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: classes.capacity는 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'classes', 'id', 'authenticated', ARRAY['SELECT'],
  'authenticated: classes.id는 insert·update 불가');
select column_privs_are('public', 'classes', 'created_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: classes.created_at은 insert·update 불가');
select table_privs_are('public', 'class_members', 'authenticated', ARRAY['DELETE', 'INSERT', 'SELECT'],
  'authenticated: class_members 권한은 SELECT·INSERT·DELETE (UPDATE 없음)');
select table_privs_are('public', 'classes', 'anon', ARRAY[]::text[], 'anon: classes 권한 없음');
select table_privs_are('public', 'class_members', 'anon', ARRAY[]::text[], 'anon: class_members 권한 없음');
select table_privs_are('public', 'classes', 'service_role', ARRAY[]::text[], 'service_role: classes 권한 없음');
select table_privs_are('public', 'class_members', 'service_role', ARRAY[]::text[],
  'service_role: class_members 권한 없음');

-- ─── 학생 A ──────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c005","role":"authenticated","aal":"aal1"}';
select results_eq('select name from public.classes', $$values ('가짜 반 X')$$,
  'A: classes는 자기 반 X만 1행');
select results_eq('select class_id, student_id from public.class_members',
  $$values ('20000000-0000-4000-8000-00000000a005'::uuid, '10000000-0000-4000-8000-00000000c005'::uuid)$$,
  'A: class_members는 자기 행 1개만 (같은 반 L·다른 반 B 행은 안 보인다)');
select is_empty($$update public.classes set name = '해킹' returning id$$, 'A: classes update 0행');
select throws_ok($$insert into public.classes (name, level) values ('가짜 학생반', 'middle')$$,
  '42501', null, 'A: classes insert는 RLS 에러');
select throws_ok($$insert into public.class_members (class_id, student_id)
                   values ('20000000-0000-4000-8000-00000000b005', '10000000-0000-4000-8000-00000000c005')$$,
  '42501', null, 'A: 다른 반 Y에 자기 배정 insert는 RLS 에러');
select is_empty($$delete from public.class_members returning class_id$$, 'A: class_members delete 0행');
select throws_ok('delete from public.classes', '42501', null, 'A: classes delete는 권한 에러');

-- ─── 학생 B, 퇴원생 L ────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d005","role":"authenticated","aal":"aal1"}';
select results_eq('select name from public.classes', $$values ('가짜 반 Y')$$,
  'B: classes는 반 Y만 (X는 안 보인다)');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e005","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.classes), 0, '퇴원생 L: classes 0행');
select is((select count(*)::int from public.class_members), 0, '퇴원생 L: class_members 0행');

-- ─── 아무나(원장도 학생도 아님, aal2) ────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b005","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.classes), 0, '아무나: classes 0행');
select is((select count(*)::int from public.class_members), 0, '아무나: class_members 0행');
select throws_ok($$insert into public.classes (name, level) values ('가짜 아무반', 'middle')$$,
  '42501', null, '아무나: classes insert는 RLS 에러');
select is_empty($$update public.classes set name = '해킹' returning id$$, '아무나: classes update 0행');
select throws_ok($$insert into public.class_members (class_id, student_id)
                   values ('20000000-0000-4000-8000-00000000b005', '10000000-0000-4000-8000-00000000c005')$$,
  '42501', null, '아무나: class_members insert는 RLS 에러');
select is_empty($$delete from public.class_members returning class_id$$, '아무나: class_members delete 0행');
select throws_ok($$update public.class_members set student_id = student_id$$, '42501', null,
  '아무나: class_members update는 권한 에러');

-- ─── 원장 aal1 ───────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a005","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.classes), 0, '원장 aal1: classes 0행');
select is((select count(*)::int from public.class_members), 0, '원장 aal1: class_members 0행');
select throws_ok($$insert into public.classes (name, level) values ('가짜 aal1반', 'middle')$$,
  '42501', null, '원장 aal1: classes insert는 RLS 에러');
select throws_ok($$insert into public.class_members (class_id, student_id)
                   values ('20000000-0000-4000-8000-00000000b005', '10000000-0000-4000-8000-00000000c005')$$,
  '42501', null, '원장 aal1: class_members insert는 RLS 에러');

-- ─── anon ────────────────────────────────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.classes', '42501', null, 'anon: classes select는 권한 에러');
select throws_ok('select * from public.class_members', '42501', null, 'anon: class_members select는 권한 에러');

-- ─── 원장 aal2 ───────────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a005","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.classes), 2, '원장 aal2: classes 2행');
select is((select count(*)::int from public.class_members), 3, '원장 aal2: class_members 3행');
select lives_ok($$insert into public.classes (name, level, schedule, capacity)
                   values ('가짜 독해반', 'high', '[{"day":2,"start":"19:00","end":"21:00"}]', 8)$$,
  '원장 aal2: 반 insert 성공');
select lives_ok($$update public.classes set name = '가짜 반 X2'
                   where id = '20000000-0000-4000-8000-00000000a005'$$,
  '원장 aal2: 반 이름 update 성공');
select lives_ok($$insert into public.class_members (class_id, student_id)
                   values ('20000000-0000-4000-8000-00000000b005', '10000000-0000-4000-8000-00000000c005')$$,
  '원장 aal2: class_members insert 성공');
select lives_ok($$delete from public.class_members
                   where class_id = '20000000-0000-4000-8000-00000000b005'
                     and student_id = '10000000-0000-4000-8000-00000000c005'$$,
  '원장 aal2: class_members delete 성공');
select throws_ok('delete from public.classes', '42501', null, '원장 aal2: classes delete는 권한 에러');

-- 위에서 A·아무나의 delete·update는 아무 행도 바꾸지 못했다.
reset role;
select is((select count(*)::int from public.class_members), 3, 'postgres: class_members 3행 그대로');
select results_eq('select name from public.classes order by name',
  $$values ('가짜 독해반'), ('가짜 반 X2'), ('가짜 반 Y')$$,
  'postgres: 학생·아무나의 update는 반영되지 않고 원장 변경만 남는다');

-- ─── 시간표 검사 (트리거, P0001) ─────────────────────────────────────
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사1', 'middle', '[{"day":8,"start":"17:00","end":"19:00"}]')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: day 8은 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사2', 'middle', '[{"day":1,"start":"19:00","end":"17:00"}]')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: 시작이 끝보다 늦으면 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사3', 'middle', '[{"day":1,"start":"7:00","end":"9:00"}]')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: 한 자리 시(7:00)는 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사4', 'middle', '{}')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: 배열이 아니면 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사5', 'middle', '[{"day":1,"start":"17:00"}]')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: end가 없으면 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사6', 'middle', '[{"day":1,"start":"17:00","end":"19:00","x":1}]')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: 다른 키가 있으면 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사7', 'middle', '[{"day":"1","start":"17:00","end":"19:00"}]')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: 문자열 day는 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사8', 'middle', '[{"day":1.5,"start":"17:00","end":"19:00"}]')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: 정수가 아닌 day는 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사9', 'middle', '[1]')$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: 원소가 객체가 아니면 거부');
select throws_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 검사10', 'middle',
                     (select jsonb_agg('{"day":1,"start":"17:00","end":"19:00"}'::jsonb)
                        from generate_series(1, 15)))$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: 15칸은 거부 (최대 14칸)');
select lives_ok($$insert into public.classes (name, level, schedule) values ('가짜 빈 시간표', 'middle', '[]')$$,
  '시간표: 빈 배열은 통과');
select lives_ok($$insert into public.classes (name, level, schedule)
                   values ('가짜 두 칸', 'middle',
                     '[{"day":1,"start":"17:00","end":"19:00"},{"day":7,"start":"09:00","end":"23:59"}]')$$,
  '시간표: 두 칸짜리 정상 값은 통과 (7 = 일요일)');
select throws_ok($$update public.classes set schedule = '[{"day":0,"start":"17:00","end":"19:00"}]'
                   where name = '가짜 두 칸'$$,
  'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.',
  '시간표: update로 잘못 바꾸기도 거부');
select throws_ok($$insert into public.classes (name, level, schedule) values ('가짜 널', 'middle', null)$$,
  '23502', null, '시간표: null은 not null 위반');

-- ─── 제약 ────────────────────────────────────────────────────────────
select throws_ok($$insert into public.classes (name, level, capacity) values ('가짜 정원0', 'middle', 0)$$,
  '23514', null, '제약: 정원 0은 check 위반');
select throws_ok($$insert into public.classes (name, level, capacity) values ('가짜 정원51', 'middle', 51)$$,
  '23514', null, '제약: 정원 51은 check 위반');
select throws_ok($$insert into public.classes (name, level) values ('가짜 반 Y', 'high')$$,
  '23505', null, '제약: 같은 반 이름은 unique 위반');
select throws_ok($$insert into public.classes (name, level) values ('  ', 'high')$$,
  '23514', null, '제약: 공백뿐인 반 이름은 check 위반');
select throws_ok($$insert into public.classes (name, level) values ('가짜 구분', 'elementary')$$,
  '22P02', null, '제약: 없는 반 구분은 enum 에러');

select * from finish();
rollback;
