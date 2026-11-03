-- consents(법정대리인 동의 기록) 권한 테스트(설계 13장 S1·S3·S12, v1 스펙 §7·§11). 가짜 데이터만 쓴다.
-- 원장(admins + aal2)만 읽고 추가한다. 법정 기록이라 고치거나 지우지 못한다(틀리면 새 기록).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.consents;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a006', 'admin6@example.test'),
  ('00000000-0000-4000-8000-00000000c006', 'consent_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b006', 'nobody6@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a006');
insert into public.students (id, user_id, login_id, name, grade) values
  ('10000000-0000-4000-8000-00000000c006', '00000000-0000-4000-8000-00000000c006', 'consent_a', '가짜학생A', '중2');

-- ─── 권한 표 (service_role도 명시) ───────────────────────────────────
select table_privs_are('public', 'consents', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: consents 권한은 SELECT·INSERT (UPDATE·DELETE 없음)');
select table_privs_are('public', 'consents', 'anon', ARRAY[]::text[], 'anon: consents 권한 없음');
select table_privs_are('public', 'consents', 'service_role', ARRAY[]::text[], 'service_role: consents 권한 없음');

-- ─── 원장 aal2: 추가·읽기만 ──────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a006","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.consents (student_id, guardian_name, method, version, consented_at)
                   values ('10000000-0000-4000-8000-00000000c006', '김보호', 'kakao', '2026-11', now())$$,
  '원장 aal2: 동의 기록 insert 성공');
select is((select count(*)::int from public.consents), 1, '원장 aal2: consents 1행');
select throws_ok($$update public.consents set version = 'x'$$, '42501', null,
  '원장 aal2: consents update는 권한 에러 (추가만)');
select throws_ok('delete from public.consents', '42501', null, '원장 aal2: consents delete는 권한 에러 (추가만)');

-- ─── 학생 A ──────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c006","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.consents), 0, 'A: 자기 동의 기록도 0행');
select throws_ok($$insert into public.consents (student_id, guardian_name, method, version, consented_at)
                   values ('10000000-0000-4000-8000-00000000c006', '가짜보호자', 'phone', '2026-11', now())$$,
  '42501', null, 'A: 자기 student_id로 insert는 RLS 에러');

-- ─── 아무나(원장도 학생도 아님, aal2) ────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b006","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.consents), 0, '아무나: consents 0행');
select throws_ok($$insert into public.consents (student_id, guardian_name, method, version, consented_at)
                   values ('10000000-0000-4000-8000-00000000c006', '가짜보호자', 'phone', '2026-11', now())$$,
  '42501', null, '아무나: consents insert는 RLS 에러');
select throws_ok($$update public.consents set version = 'x'$$, '42501', null, '아무나: consents update는 권한 에러');
select throws_ok('delete from public.consents', '42501', null, '아무나: consents delete는 권한 에러');

-- ─── 원장 aal1 ───────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a006","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.consents), 0, '원장 aal1: consents 0행');
select throws_ok($$insert into public.consents (student_id, guardian_name, method, version, consented_at)
                   values ('10000000-0000-4000-8000-00000000c006', '가짜보호자', 'phone', '2026-11', now())$$,
  '42501', null, '원장 aal1: consents insert는 RLS 에러');

-- ─── anon ────────────────────────────────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.consents', '42501', null, 'anon: consents select는 권한 에러');
select throws_ok($$insert into public.consents (student_id, guardian_name, method, version, consented_at)
                   values ('10000000-0000-4000-8000-00000000c006', '가짜보호자', 'phone', '2026-11', now())$$,
  '42501', null, 'anon: consents insert는 권한 에러');

-- ─── 쓰기 실패 뒤 행은 그대로 ────────────────────────────────────────
reset role;
select results_eq('select guardian_name, method::text, version from public.consents',
  $$values ('김보호', 'kakao', '2026-11')$$, 'postgres: 원장이 넣은 1행만 그대로 남는다');

-- ─── 제약 ────────────────────────────────────────────────────────────
select throws_ok($$insert into public.consents (student_id, guardian_name, method, version, consented_at)
                   values ('10000000-0000-4000-8000-00000000c006', '가짜보호자', 'email', '2026-11', now())$$,
  '22P02', null, '제약: 없는 동의 방법(email)은 enum 에러');
select throws_ok($$insert into public.consents (student_id, guardian_name, method, version, consented_at)
                   values ('10000000-0000-4000-8000-00000000c006', ' ', 'written', '2026-11', now())$$,
  '23514', null, '제약: 공백뿐인 보호자 이름은 check 위반');
select throws_ok($$insert into public.consents (student_id, guardian_name, method, version, consented_at)
                   values ('10000000-0000-4000-8000-00000000c006', '가짜보호자', 'written', ' ', now())$$,
  '23514', null, '제약: 공백뿐인 버전은 check 위반');
select throws_ok($$insert into public.consents (student_id, guardian_name, method, version)
                   values ('10000000-0000-4000-8000-00000000c006', '가짜보호자', 'written', '2026-11')$$,
  '23502', null, '제약: 동의 시각이 없으면 not null 위반');

-- ─── 감사 로그 ───────────────────────────────────────────────────────
select ok(exists (select 1 from private.audit_log a
                   join public.consents c on a.row_id = c.id::text
                   where a.table_name = 'public.consents' and a.op = 'INSERT'
                     and a.actor = '00000000-0000-4000-8000-00000000a006'),
  '감사: 원장의 consents insert가 (public.consents, id, INSERT, 원장)으로 남는다');

select * from finish();
rollback;
