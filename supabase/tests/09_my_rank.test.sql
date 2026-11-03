-- my_rank() 테스트(아키텍처 §13, v1 스펙 §7·§11). 가짜 데이터만 쓴다.
-- 재원(active) 학생만 누적 포인트 내림차순으로 순위를 매기고(동점 같은 순위 1,2,2,4), 호출자 자신의 {rank, total}만 돌려준다.
-- 휴원·퇴원·원장·아무나는 0행, anon·service_role은 권한 에러. 인자가 없어 다른 학생의 합계·이름을 물어볼 길이 없다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.points;
delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a009', 'admin9@example.test'),
  ('00000000-0000-4000-8000-00000000c009', 'rank_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d009', 'rank_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e009', 'rank_c@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000f009', 'rank_d@student.heesu.internal'),
  ('00000000-0000-4000-8000-000000001009', 'rank_p@student.heesu.internal'),
  ('00000000-0000-4000-8000-000000002009', 'rank_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b009', 'nobody9@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a009');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c009', '00000000-0000-4000-8000-00000000c009', 'rank_a', '가짜순위A', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000d009', '00000000-0000-4000-8000-00000000d009', 'rank_b', '가짜순위B', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000e009', '00000000-0000-4000-8000-00000000e009', 'rank_c', '가짜순위C', '중3', 'active'),
  ('10000000-0000-4000-8000-00000000f009', '00000000-0000-4000-8000-00000000f009', 'rank_d', '가짜순위D', '중3', 'active'),
  ('10000000-0000-4000-8000-000000001009', '00000000-0000-4000-8000-000000001009', 'rank_p', '가짜순위P', '고1', 'paused'),
  ('10000000-0000-4000-8000-000000002009', '00000000-0000-4000-8000-000000002009', 'rank_l', '가짜순위L', '고1', 'left');

-- 수동 포인트: A 5, B 3(+4 −1), C 3, D 없음(0), P 10(휴원이라 제외), L 9(퇴원이라 제외)
insert into public.points (student_id, amount, reason) values
  ('10000000-0000-4000-8000-00000000c009', 5, '(테스트) A'),
  ('10000000-0000-4000-8000-00000000d009', 4, '(테스트) B'),
  ('10000000-0000-4000-8000-00000000d009', -1, '(테스트) B 차감'),
  ('10000000-0000-4000-8000-00000000e009', 3, '(테스트) C'),
  ('10000000-0000-4000-8000-000000001009', 10, '(테스트) P'),
  ('10000000-0000-4000-8000-000000002009', 9, '(테스트) L');

-- ─── 함수 모양·권한 ──────────────────────────────────────────────────
select has_function('public', 'my_rank', ARRAY[]::text[], 'my_rank() 함수가 있다 (인자 없음)');
select is_definer('public', 'my_rank', ARRAY[]::text[], 'my_rank()는 security definer');
select function_privs_are('public', 'my_rank', ARRAY[]::text[], 'anon', ARRAY[]::text[],
  'anon: my_rank EXECUTE 없음');
select function_privs_are('public', 'my_rank', ARRAY[]::text[], 'service_role', ARRAY[]::text[],
  'service_role: my_rank EXECUTE 없음');
select function_privs_are('public', 'my_rank', ARRAY[]::text[], 'authenticated', ARRAY['EXECUTE'],
  'authenticated: my_rank는 EXECUTE');
select is(pg_get_function_result('public.my_rank()'::regprocedure), 'TABLE(rank integer, total integer)',
  'my_rank() 반환 열은 rank·total 정수 둘뿐 (다른 학생 정보가 끼어들 열이 없다)');
select is((select count(*)::int from pg_catalog.pg_proc p
             join pg_catalog.pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'my_rank'),
  1, 'my_rank 오버로드가 없다 (인자를 받는 판이 없다)');

-- ─── 재원 학생: 동점 같은 순위 (1, 2, 2, 4) ───────────────────────────
set local role authenticated;

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (1, 4)$$, 'A(5점): 전체 4명 중 1등');
select is((select count(*)::int from public.my_rank()), 1, 'A: my_rank()는 자기 한 행만');
-- 비공개 회귀: 순위 함수가 생겨도 다른 학생 합계·포인트는 여전히 못 읽는다.
select is((select count(*)::int from public.student_point_totals), 1, 'A: student_point_totals는 자기 1행뿐');
select is((select count(*)::int from public.points where student_id <> '10000000-0000-4000-8000-00000000c009'),
  0, 'A: 다른 학생의 points는 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (2, 4)$$, 'B(3점): 동점 2등');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (2, 4)$$, 'C(3점): 동점 2등');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (4, 4)$$,
  'D(포인트 행 없음 = 0점): 4등 (3이 아니라 4 — 동점 다음은 건너뛴다)');

-- ─── 재원이 아닌 호출자: 0행 ─────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000001009","role":"authenticated","aal":"aal1"}';
select is_empty('select * from public.my_rank()', 'P(휴원, 10점): 0행 (1등 자리도 차지하지 않는다)');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000002009","role":"authenticated","aal":"aal1"}';
select is_empty('select * from public.my_rank()', 'L(퇴원): 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a009","role":"authenticated","aal":"aal2"}';
select is_empty('select * from public.my_rank()', '원장 aal2: 0행');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b009","role":"authenticated","aal":"aal1"}';
select is_empty('select * from public.my_rank()', '원장도 학생도 아닌 사용자: 0행');

-- ─── anon·service_role: 권한 에러 ───────────────────────────────────
reset role;
set local role anon;
select throws_ok('select * from public.my_rank()', '42501', null, 'anon: my_rank는 권한 에러');
reset role;
set local role service_role;
select throws_ok('select * from public.my_rank()', '42501', null, 'service_role: my_rank는 권한 에러');
reset role;

-- ─── 마이너스 합계: D −2 → 여전히 4등 ───────────────────────────────
insert into public.points (student_id, amount, reason)
  values ('10000000-0000-4000-8000-00000000f009', -2, '(테스트) D 차감');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (4, 4)$$, 'D(−2점): 4등 그대로');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (1, 4)$$, 'D 차감 후 A: 1등 그대로');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (2, 4)$$, 'D 차감 후 B: 2등 그대로');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (2, 4)$$, 'D 차감 후 C: 2등 그대로');
reset role;

-- ─── B 휴원 → 모집단에서 빠지고 B는 0행 ──────────────────────────────
update public.students set status = 'paused' where id = '10000000-0000-4000-8000-00000000d009';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (1, 3)$$, 'B 휴원 후 A: 전체 3명 중 1등');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (2, 3)$$, 'B 휴원 후 C: 전체 3명 중 2등');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f009","role":"authenticated","aal":"aal1"}';
select results_eq('select rank, total from public.my_rank()', $$values (3, 3)$$, 'B 휴원 후 D: 전체 3명 중 3등');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d009","role":"authenticated","aal":"aal1"}';
select is_empty('select * from public.my_rank()', 'B(휴원): 0행');
-- 휴원생도 자기 합계는 여전히 읽는다(my_student_id는 휴원생을 돌려준다) — my_rank만 숨긴다.
select is((select count(*)::int from public.student_point_totals), 1, 'B(휴원): student_point_totals 자기 1행');
reset role;

-- ─── 인자를 넘겨 다른 학생을 물어볼 수 없다 ──────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c009","role":"authenticated","aal":"aal1"}';
select throws_ok($$select * from public.my_rank('10000000-0000-4000-8000-00000000e009'::uuid)$$, '42883', null,
  'my_rank(uuid)는 없다 (다른 학생 id를 넘길 수 없다)');
reset role;

select * from finish();
rollback;
