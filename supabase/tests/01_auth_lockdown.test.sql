-- 원장 판정(설계 13장 S1·S5)과 감사 로그(S12) 잠금 테스트. 가짜 사용자만 쓴다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- postgres로 가짜 사용자를 만든다 (admins FK 때문에 auth.users에 먼저 넣는다).
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a001', 'admin@example.test'),
  ('00000000-0000-4000-8000-00000000b001', 'nobody@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a001');

-- admins에 없는 사용자는 aal2여도 원장이 아니다.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated","aal":"aal2"}';
select is(private.is_admin(), false, 'admins에 없는 사용자: is_admin() = false');

-- admins에 있어도 MFA(aal2)를 거치지 않으면 원장이 아니다.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated","aal":"aal1"}';
select is(private.is_admin(), false, 'admins + aal1: is_admin() = false');

-- aal 클레임이 없어도 원장이 아니다.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}';
select is(private.is_admin(), false, 'admins + aal 없음: is_admin() = false');

-- admins + aal2만 원장이다.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated","aal":"aal2"}';
select is(private.is_admin(), true, 'admins + aal2: is_admin() = true');

-- authenticated도 private 테이블은 직접 못 읽는다 (is_admin()으로만 판정).
select throws_ok('select * from private.admins', '42501', null,
  'authenticated: private.admins 직접 select는 권한 에러');

-- anon은 private 스키마 자체에 접근할 수 없다.
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from private.audit_log', '42501', null,
  'anon: private.audit_log select는 권한 에러');

-- private.audit() 트리거는 호출자 auth.uid()·테이블·행 id·작업을 남긴다.
-- 쓰기는 실제 호출 경로처럼 authenticated 역할로 한다 (트리거는 security definer라 audit_log 권한이 없어도 기록된다).
reset role;
create table public.__audit_probe (id int primary key);
create trigger __audit_probe_audit
  after insert or update or delete on public.__audit_probe
  for each row execute function private.audit();
grant insert, delete on public.__audit_probe to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated","aal":"aal2"}';
insert into public.__audit_probe (id) values (7);
delete from public.__audit_probe;  -- where 절은 select 권한이 필요해서 쓰지 않는다
reset role;
select results_eq(
  $$select actor, table_name, row_id, op from private.audit_log
     where table_name = 'public.__audit_probe' order by id$$,
  $$values ('00000000-0000-4000-8000-00000000a001'::uuid, 'public.__audit_probe', '7', 'INSERT'),
           ('00000000-0000-4000-8000-00000000a001'::uuid, 'public.__audit_probe', '7', 'DELETE')$$,
  'audit(): INSERT·DELETE가 actor·테이블·행 id와 함께 기록된다'
);

-- audit()는 AFTER … FOR EACH ROW로만 쓸 수 있다. 다른 형태로 달면 쓰기가 실패한다.
create table public.__audit_before (id int primary key);
create trigger __audit_before_audit
  before insert on public.__audit_before
  for each row execute function private.audit();
select throws_ok('insert into public.__audit_before (id) values (1)', 'P0001',
  'private.audit()는 AFTER … FOR EACH ROW 트리거로만 써요.',
  'audit(): BEFORE 트리거로 달면 insert가 실패한다');

create table public.__audit_stmt (id int primary key);
create trigger __audit_stmt_audit
  after insert on public.__audit_stmt
  for each statement execute function private.audit();
select throws_ok('insert into public.__audit_stmt (id) values (1)', 'P0001',
  'private.audit()는 AFTER … FOR EACH ROW 트리거로만 써요.',
  'audit(): FOR EACH STATEMENT 트리거로 달면 insert가 실패한다');

-- id가 없는 테이블은 키 컬럼 이름을 트리거 인자로 넘긴다.
create table public.__audit_keyed (student_id int primary key);
create trigger __audit_keyed_audit
  after insert on public.__audit_keyed
  for each row execute function private.audit('student_id');
insert into public.__audit_keyed (student_id) values (7);
select is(
  (select row_id from private.audit_log where table_name = 'public.__audit_keyed'),
  '7',
  'audit(''student_id''): 키 컬럼 값이 row_id로 남는다'
);

-- 인자 없이(기본 id) 달면 키 컬럼이 없으니 크게 실패한다 (row_id가 null로 조용히 빠지지 않는다).
drop trigger __audit_keyed_audit on public.__audit_keyed;
create trigger __audit_keyed_audit
  after insert on public.__audit_keyed
  for each row execute function private.audit();
select throws_ok('insert into public.__audit_keyed (student_id) values (8)', 'P0001',
  'private.audit(): __audit_keyed에 키 컬럼 id이 없어요.',
  'audit(): 키 컬럼이 없는 테이블에 인자 없이 달면 insert가 실패한다');

select * from finish();
rollback;
