-- payments(수기 수납 기록) 테스트(설계 13장 S1·S12). 가짜 데이터만 쓴다.
-- 원장(admins + aal2)만 읽고 쓴다. 학생·익명·aal1 원장은 못 본다. 감사 로그가 남는다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(38);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.payments;
delete from public.students;
delete from private.audit_log where table_name = 'public.payments';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a016', 'admin16@example.test'),
  ('00000000-0000-4000-8000-00000000c016', 'p_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b016', 'nobody16@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a016');
insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c016', '00000000-0000-4000-8000-00000000c016', 'p_a', '가짜수납A', '중2', 'active');

-- ─── 권한 ───────────────────────────────────────────────────────────
select table_privs_are('public', 'payments', 'anon', ARRAY[]::text[], 'anon: payments 권한 없음');
select table_privs_are('public', 'payments', 'service_role', ARRAY[]::text[], 'service_role: payments 권한 없음');
select table_privs_are('public', 'payments', 'authenticated', ARRAY['DELETE', 'SELECT'],
  'authenticated: 테이블 권한은 select·delete (insert·update는 컬럼 단위)');
select column_privs_are('public', 'payments', 'amount', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: amount는 select·insert·update');
select column_privs_are('public', 'payments', 'updated_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: updated_at은 select만');

-- ─── 원장 aal2 ──────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a016","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.payments (student_id, month, amount, paid_at, memo)
  values ('10000000-0000-4000-8000-00000000c016', '2026-11', 250000, null, '(가짜) 카드')$$,
  '원장 aal2: insert 성공');
select is((select count(*)::int from public.payments), 1, '원장 aal2: 1행이 보인다');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-11', 1)$$, '23505', null,
  '원장 aal2: 같은 (학생, 달)은 unique 위반');
select lives_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-11', 300000)
  on conflict (student_id, month) do update set amount = excluded.amount$$,
  '원장 aal2: upsert 성공');
select is((select amount from public.payments), 300000, '원장 aal2: upsert로 금액이 바뀐다');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-13', 1)$$, '23514', null, 'month 2026-13 거부');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-1', 1)$$, '23514', null, 'month 2026-1 거부');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '202611', 1)$$, '23514', null, 'month 202611 거부');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-10', -1)$$, '23514', null, 'amount -1 거부');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-10', 10000001)$$, '23514', null, 'amount 10000001 거부');
select throws_ok($$insert into public.payments (student_id, month, amount, memo)
  values ('10000000-0000-4000-8000-00000000c016', '2026-10', 1, repeat('가', 201))$$, '23514', null, 'memo 201자 거부');
select throws_ok($$insert into public.payments (student_id, month, amount, memo)
  values ('10000000-0000-4000-8000-00000000c016', '2026-10', 1, E'a\x07')$$, '23514', null, 'memo 제어문자 거부');
reset role;

-- ─── 학생·아무나·aal1 원장: 못 본다 ─────────────────────────────────
-- 학생 A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c016","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.payments), 0, '학생: select 0행');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-09', 1)$$, '42501', null, '학생: insert는 RLS 에러');
select lives_ok($$update public.payments set amount = 1$$, '학생: update는 에러 없이 0행');
select lives_ok($$delete from public.payments$$, '학생: delete는 에러 없이 0행');
reset role;
select is((select amount from public.payments), 300000, '학생: 원본이 그대로다');

-- 아무나(원장 아님, aal2)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b016","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.payments), 0, '아무나: select 0행');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-09', 1)$$, '42501', null, '아무나: insert는 RLS 에러');
select lives_ok($$update public.payments set amount = 1$$, '아무나: update는 에러 없이 0행');
select lives_ok($$delete from public.payments$$, '아무나: delete는 에러 없이 0행');
reset role;
select is((select amount from public.payments), 300000, '아무나: 원본이 그대로다');

-- 원장 aal1
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a016","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.payments), 0, '원장 aal1: select 0행');
select throws_ok($$insert into public.payments (student_id, month, amount)
  values ('10000000-0000-4000-8000-00000000c016', '2026-09', 1)$$, '42501', null, '원장 aal1: insert는 RLS 에러');
select lives_ok($$update public.payments set amount = 1$$, '원장 aal1: update는 에러 없이 0행');
select lives_ok($$delete from public.payments$$, '원장 aal1: delete는 에러 없이 0행');
reset role;
select is((select amount from public.payments), 300000, '원장 aal1: 원본이 그대로다');

-- anon
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select * from public.payments$$, '42501', null, 'anon: select는 권한 에러');
reset role;

-- ─── 원장 aal2 삭제 ─────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a016","role":"authenticated","aal":"aal2"}';
select lives_ok($$delete from public.payments$$, '원장 aal2: delete 성공');
select is((select count(*)::int from public.payments), 0, '원장 aal2: 삭제 뒤 0행');
reset role;

-- ─── 감사 ───────────────────────────────────────────────────────────
select is((select count(*)::int from private.audit_log
            where table_name = 'public.payments' and op = 'INSERT'
              and actor = '00000000-0000-4000-8000-00000000a016'), 1, '감사: INSERT가 actor = 원장으로 남는다');
select is((select count(*)::int from private.audit_log
            where table_name = 'public.payments' and op = 'UPDATE'
              and actor = '00000000-0000-4000-8000-00000000a016'), 1, '감사: UPDATE(upsert)가 actor = 원장으로 남는다');
select is((select count(*)::int from private.audit_log
            where table_name = 'public.payments' and op = 'DELETE'
              and actor = '00000000-0000-4000-8000-00000000a016'), 1, '감사: DELETE가 actor = 원장으로 남는다');

select * from finish();
rollback;
