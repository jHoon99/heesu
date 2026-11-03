-- points·자동 포인트 트리거·student_point_totals 테스트(설계 13장 S1·S3, 아키텍처 §7, v1 스펙 §7·§11). 가짜 데이터만 쓴다.
-- 자동 포인트: 출결 present|makeup + 숙제 done이면 그 학생·수업에 자동 행 정확히 1개, 조건이 깨지면 그 행을 지운다.
-- 수동 가감은 원장(admins + aal2)만, session_id 없이 사유와 함께 insert만(고치기·지우기 없음).
-- 학생은 자기 행만, 같은 반 다른 학생·퇴원생·원장도 학생도 아닌 사용자·원장 aal1은 0행, anon은 권한 에러.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(63);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.points;
delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a008', 'admin8@example.test'),
  ('00000000-0000-4000-8000-00000000c008', 'pts_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000f008', 'pts_c@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e008', 'pts_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b008', 'nobody8@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a008');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c008', '00000000-0000-4000-8000-00000000c008', 'pts_a', '가짜포인트A', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000f008', '00000000-0000-4000-8000-00000000f008', 'pts_c', '가짜포인트C', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000e008', '00000000-0000-4000-8000-00000000e008', 'pts_l', '가짜포인트L', '중3', 'left');

-- 반 X(A·C·L)
insert into public.classes (id, name, level) values
  ('20000000-0000-4000-8000-00000000a008', '가짜 포인트반 X', 'middle');
insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008'),
  ('20000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000f008'),
  ('20000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000e008');

-- 수업 S1(X, 숙제 있음 — submit_homework 가능), S2(X, 숙제 없음 — submit_homework 불가, 여기서는 제출하지 않는다)
insert into public.sessions (id, class_id, date, homework) values
  ('30000000-0000-4000-8000-00000000a008', '20000000-0000-4000-8000-00000000a008', '2026-11-02', '(테스트) 단어 20개'),
  ('30000000-0000-4000-8000-00000000b008', '20000000-0000-4000-8000-00000000a008', '2026-11-04', null);

-- ─── 권한 표 (service_role도 명시) ───────────────────────────────────
select table_privs_are('public', 'points', 'anon', ARRAY[]::text[], 'anon: points 권한 없음');
select table_privs_are('public', 'points', 'service_role', ARRAY[]::text[], 'service_role: points 권한 없음');
-- insert는 컬럼 단위라 테이블 권한에는 SELECT만 보인다(= UPDATE·DELETE 없음).
select table_privs_are('public', 'points', 'authenticated', ARRAY['SELECT'],
  'authenticated: points 테이블 권한은 SELECT뿐 (UPDATE·DELETE 없음, insert는 컬럼 단위)');
select column_privs_are('public', 'points', 'student_id', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: points.student_id는 INSERT·SELECT');
select column_privs_are('public', 'points', 'amount', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: points.amount는 INSERT·SELECT');
select column_privs_are('public', 'points', 'reason', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: points.reason은 INSERT·SELECT');
select column_privs_are('public', 'points', 'session_id', 'authenticated', ARRAY['SELECT'],
  'authenticated: points.session_id는 읽기만 (자동 행은 위조할 수 없다)');
select column_privs_are('public', 'points', 'id', 'authenticated', ARRAY['SELECT'],
  'authenticated: points.id는 읽기만');
select column_privs_are('public', 'points', 'created_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: points.created_at은 읽기만');
select table_privs_are('public', 'student_point_totals', 'anon', ARRAY[]::text[],
  'anon: student_point_totals 권한 없음');
select table_privs_are('public', 'student_point_totals', 'service_role', ARRAY[]::text[],
  'service_role: student_point_totals 권한 없음');
select table_privs_are('public', 'student_point_totals', 'authenticated', ARRAY['SELECT'],
  'authenticated: student_point_totals는 SELECT뿐');

-- ─── 자동 포인트 트리거 (원장 aal2, Task 1의 PostgREST upsert 모양 그대로) ─
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a008","role":"authenticated","aal":"aal2"}';

-- A·S1: 출결 present → 숙제 done
insert into public.attendance (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'present')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000a008'),
  0, '트리거: 출결 present만으로는 자동 행 없음 (숙제 미입력)');
insert into public.homework_checks (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'done')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select results_eq($$select student_id, session_id, amount, reason from public.points
                     where session_id = '30000000-0000-4000-8000-00000000a008'$$,
  $$values ('10000000-0000-4000-8000-00000000c008'::uuid, '30000000-0000-4000-8000-00000000a008'::uuid, 1, '출석·숙제 완료')$$,
  '트리거: present + done이면 (A, S1, 1, 출석·숙제 완료) 정확히 1행');

-- A·S2: 숙제 done 먼저 → 출결 makeup
insert into public.homework_checks (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000b008', '10000000-0000-4000-8000-00000000c008', 'done')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000b008'),
  0, '트리거: 숙제 done만으로는 자동 행 없음 (출결 미입력)');
insert into public.attendance (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000b008', '10000000-0000-4000-8000-00000000c008', 'makeup')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select results_eq($$select student_id, amount, reason from public.points
                     where session_id = '30000000-0000-4000-8000-00000000b008'$$,
  $$values ('10000000-0000-4000-8000-00000000c008'::uuid, 1, '출석·숙제 완료')$$,
  '트리거: 숙제 done 뒤 출결 makeup이어도 자동 행 정확히 1행');

-- A·S1: present → late → present
insert into public.attendance (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'late')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000a008'),
  0, '트리거: late인 동안은 자동 행 0행');
insert into public.attendance (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'present')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000a008'),
  1, '트리거: present → late → present 뒤 자동 행 1행');
-- 같은 값으로 다시 저장해도 중복이 생기지 않는다.
insert into public.attendance (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'present')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000a008'),
  1, '트리거: 같은 present를 다시 저장해도 자동 행 1행 (중복 없음)');

-- A·S1: 숙제 done → missing → done
insert into public.homework_checks (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'missing')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000a008'),
  0, '트리거: 숙제 done → missing이면 그 수업 자동 행 0행');
insert into public.homework_checks (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'done')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000a008'),
  1, '트리거: 숙제를 다시 done으로 고치면 자동 행 1행');

-- 수동 행이 있을 때 A·S1 출결 absent → S1 자동 행만 지워진다.
select lives_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 3, '발표')$$,
  '원장 aal2: 수동 +3 (발표) insert 성공');
insert into public.attendance (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'absent')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000a008'),
  0, '트리거: absent가 되면 S1 자동 행은 지워진다');
select results_eq($$select amount, reason from public.points
                     where student_id = '10000000-0000-4000-8000-00000000c008' and session_id is null$$,
  $$values (3, '발표')$$,
  '트리거: 수동 행(session_id 없음)은 지워지지 않는다');
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000b008'),
  1, '트리거: 다른 수업 S2의 자동 행은 그대로');
insert into public.attendance (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000c008', 'present')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;

-- C·S1: 출결 present, 숙제 none
insert into public.attendance (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000f008', 'present')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
insert into public.homework_checks (session_id, student_id, status)
  values ('30000000-0000-4000-8000-00000000a008', '10000000-0000-4000-8000-00000000f008', 'none')
  on conflict (session_id, student_id) do update
  set session_id = excluded.session_id, student_id = excluded.student_id, status = excluded.status;
select is((select count(*)::int from public.points
            where student_id = '10000000-0000-4000-8000-00000000f008'),
  0, '트리거: present + 숙제 none이면 0행');

-- 학생 제출(submitted_at만 바뀐다)은 포인트를 바꾸지 않는다. S1은 숙제가 있어 제출할 수 있다.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f008","role":"authenticated","aal":"aal1"}';
select isnt(public.submit_homework('30000000-0000-4000-8000-00000000a008'), null, 'C: S1 숙제 제출 성공');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c008","role":"authenticated","aal":"aal1"}';
select isnt(public.submit_homework('30000000-0000-4000-8000-00000000a008'), null, 'A: S1 숙제 제출 성공');
reset role;
select is((select count(*)::int from public.points
            where student_id = '10000000-0000-4000-8000-00000000f008'),
  0, '트리거: C가 제출해도 여전히 0행 (숙제 상태는 원장이 매긴다)');
select is((select count(*)::int from public.points
            where session_id = '30000000-0000-4000-8000-00000000a008'
              and student_id = '10000000-0000-4000-8000-00000000c008'),
  1, '트리거: 숙제 done인 A가 제출해도 S1 자동 행은 여전히 1행');

-- ─── 수동 가감 (원장 aal2) ───────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a008","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', -2, '지각 정정')$$,
  '원장 aal2: 수동 -2 (지각 정정) insert 성공');
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 0, '영점')$$,
  '23514', null, '원장 aal2: amount 0은 check 위반');
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 101, '너무 많음')$$,
  '23514', null, '원장 aal2: amount 101은 check 위반');
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', -101, '너무 적음')$$,
  '23514', null, '원장 aal2: amount -101은 check 위반');
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 1, '  ')$$,
  '23514', null, '원장 aal2: 공백뿐인 reason은 check 위반');
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 1, E'사유\x07')$$,
  '23514', null, '원장 aal2: reason의 제어 문자(BEL)는 check 위반');
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 1, repeat('가', 101))$$,
  '23514', null, '원장 aal2: reason 101자는 check 위반');
select throws_ok($$insert into public.points (student_id, session_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', '30000000-0000-4000-8000-00000000a008', 1, '위조')$$,
  '42501', null, '원장 aal2: session_id를 넣는 insert는 권한 에러 (자동 행 위조 불가)');
select throws_ok('update public.points set amount = 5', '42501', null, '원장 aal2: points update는 권한 에러');
select throws_ok('delete from public.points', '42501', null, '원장 aal2: points delete는 권한 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c008","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 5, '셀프')$$,
  '42501', null, 'A: 자기 student_id로 points insert는 RLS 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a008","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 5, '원장 aal1')$$,
  '42501', null, '원장 aal1: points insert는 RLS 에러');

-- ─── 읽기 ────────────────────────────────────────────────────────────
-- 지금 A: S1 자동 1 + S2 자동 1 + 수동 3 + 수동 -2 = 3, C: 0, L: 0.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c008","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.points), 4, 'A: points 4행 (자동 2 + 수동 2)');
select is((select count(*)::int from public.points where student_id <> '10000000-0000-4000-8000-00000000c008'),
  0, 'A: points는 자기 행만');
select results_eq('select student_id, name, total from public.student_point_totals',
  $$values ('10000000-0000-4000-8000-00000000c008'::uuid, '가짜포인트A', 3)$$,
  'A: student_point_totals는 자기 1행 (total 3)');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f008","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.points where student_id = '10000000-0000-4000-8000-00000000c008'),
  0, 'C: 같은 반 A의 points 0행');
select results_eq('select student_id, total from public.student_point_totals',
  $$values ('10000000-0000-4000-8000-00000000f008'::uuid, 0)$$,
  'C: student_point_totals는 자기 1행 (total 0)');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e008","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.points), 0, '퇴원생 L: points 0행');
select is((select count(*)::int from public.student_point_totals), 0, '퇴원생 L: student_point_totals 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b008","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.points), 0, '아무나: points 0행');
select is((select count(*)::int from public.student_point_totals), 0, '아무나: student_point_totals 0행');
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 5, '아무나')$$,
  '42501', null, '아무나: points insert는 RLS 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a008","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.points), 0, '원장 aal1: points 0행');
select is((select count(*)::int from public.student_point_totals), 0, '원장 aal1: student_point_totals 0행');

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.points', '42501', null, 'anon: points select는 권한 에러');
select throws_ok('select * from public.student_point_totals', '42501', null,
  'anon: student_point_totals select는 권한 에러');
select throws_ok($$insert into public.points (student_id, amount, reason)
                   values ('10000000-0000-4000-8000-00000000c008', 5, 'anon')$$,
  '42501', null, 'anon: points insert는 권한 에러');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a008","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.points), 4, '원장 aal2: points 4행');
select results_eq($$select student_id, name, grade::text, status::text, total
                     from public.student_point_totals order by student_id$$,
  $$values ('10000000-0000-4000-8000-00000000c008'::uuid, '가짜포인트A', '중2', 'active', 3),
           ('10000000-0000-4000-8000-00000000e008'::uuid, '가짜포인트L', '중3', 'left', 0),
           ('10000000-0000-4000-8000-00000000f008'::uuid, '가짜포인트C', '중2', 'active', 0)$$,
  '원장 aal2: student_point_totals에 A·C·L 모두 (포인트 없는 학생 total 0)');

-- ─── 트리거 함수는 직접 부를 수 없다 ─────────────────────────────────
select is(has_function_privilege('authenticated', 'private.sync_session_points()', 'execute'), false,
  'authenticated: private.sync_session_points 실행 권한 없음');
select is(has_function_privilege('service_role', 'private.sync_session_points()', 'execute'), false,
  'service_role: private.sync_session_points 실행 권한 없음');

-- ─── 수업을 지우면 그 자동 행도 지워진다(on delete cascade, postgres로) ─
reset role;
delete from public.sessions where id = '30000000-0000-4000-8000-00000000b008';
select is((select count(*)::int from public.points where session_id = '30000000-0000-4000-8000-00000000b008'), 0,
  'cascade: 수업 S2를 지우면 S2 자동 행도 지워진다');
select is((select count(*)::int from public.points
            where student_id = '10000000-0000-4000-8000-00000000c008' and session_id is null), 2,
  'cascade: 수동 행 2개는 그대로');

select * from finish();
rollback;
