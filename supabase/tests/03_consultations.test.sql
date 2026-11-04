-- consultations 권한 테스트(설계 13장 S6·S12): anon은 테이블 권한이 전혀 없고,
-- 신청은 service_role 전용 RPC submit_consultation으로만, 읽기·수정은 원장(admins + aal2)만. 가짜 데이터만 쓴다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.consultations;
delete from private.audit_log;

insert into public.consultations (parent_name, phone, grade, consent_version, consented_at)
values ('가짜보호자', '010-0000-0009', '중1', '2026-11-05', now());

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a003', 'admin3@example.test'),
  ('00000000-0000-4000-8000-00000000b003', 'nobody3@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a003');

select table_privs_are('public', 'consultations', 'service_role', ARRAY['INSERT', 'SELECT'],
  'service_role: consultations 권한은 SELECT·INSERT뿐');
select column_privs_are('public', 'consultations', 'status', 'authenticated', ARRAY['SELECT', 'UPDATE'],
  'authenticated: consultations.status는 SELECT·UPDATE');
select column_privs_are('public', 'consultations', 'memo', 'authenticated', ARRAY['SELECT', 'UPDATE'],
  'authenticated: consultations.memo는 SELECT·UPDATE');
select column_privs_are('public', 'consultations', 'phone', 'authenticated', ARRAY['SELECT'],
  'authenticated: consultations.phone은 update 불가');

-- ─── anon: 테이블·RPC 모두 권한 에러 (0행이 아니라 42501) ────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.consultations', '42501', null,
  'anon: consultations select는 권한 에러');
select throws_ok($$insert into public.consultations (parent_name, phone, grade, consent_version, consented_at)
                   values ('a', '010-0000-0001', '중2', 'v', now())$$,
  '42501', null, 'anon: consultations insert는 권한 에러');
select throws_ok($$select public.submit_consultation('홍길동','010-0000-0001','중2',null,'2026-11-05')$$,
  '42501', null, 'anon: submit_consultation 실행은 권한 에러');

-- ─── authenticated(원장 아님): 0행, 쓰기 불가 ────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b003","role":"authenticated","aal":"aal2"}';
select throws_ok($$select public.submit_consultation('홍길동','010-0000-0001','중2',null,'2026-11-05')$$,
  '42501', null, 'authenticated: submit_consultation 실행은 권한 에러');
select is((select count(*)::int from public.consultations), 0,
  'authenticated(원장 아님): select 0행');
select throws_ok($$insert into public.consultations (parent_name, phone, grade, consent_version, consented_at)
                   values ('a', '010-0000-0001', '중2', 'v', now())$$,
  '42501', null, 'authenticated(원장 아님): insert는 권한 에러');
select is_empty($$update public.consultations set memo = 'x' returning id$$,
  'authenticated(원장 아님): update 0행');
select throws_ok('delete from public.consultations', '42501', null,
  'authenticated(원장 아님): delete는 권한 에러');

-- ─── 원장 + aal1: 0행 ────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a003","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.consultations), 0,
  '원장 + aal1: select 0행');

-- ─── 원장 + aal2: 읽기·수정 ──────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a003","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.consultations), 1,
  '원장 + aal2: select 1행');
select lives_ok($$update public.consultations set status = 'contacted', memo = '통화함'$$,
  '원장 + aal2: status·memo update 성공');
select throws_ok('delete from public.consultations', '42501', null,
  '원장 + aal2: delete 권한도 없다 (파기는 pg_cron)');

reset role;
select results_eq($$select status::text, memo from public.consultations$$,
  $$values ('contacted', '통화함')$$, '원장 + aal2: update 뒤 값이 바뀐다');

-- ─── service_role: submit_consultation, 번호별 24시간 3건 ────────────
set local role service_role;
select lives_ok($$select public.submit_consultation(' 홍길동 ','010-1111-0001','중2','',  '2026-11-05')$$,
  'service_role: 1번째 신청 성공');
select lives_ok($$select public.submit_consultation('홍길동','010-1111-0001','중2','궁금해요','2026-11-05')$$,
  'service_role: 2번째 신청 성공');
select lives_ok($$select public.submit_consultation('홍길동','010-1111-0001','고1',null,'2026-11-05')$$,
  'service_role: 3번째 신청 성공');
select throws_ok($$select public.submit_consultation('홍길동','010-1111-0001','중2',null,'2026-11-05')$$,
  'HS429', '오늘은 이 번호로 더 신청할 수 없어요. 전화로 문의해 주세요.',
  'service_role: 같은 번호 4번째는 HS429');
select lives_ok($$select public.submit_consultation('홍길동','010-2222-0002','중2',null,'2026-11-05')$$,
  'service_role: 다른 번호는 성공');

reset role;
select results_eq(
  $$select parent_name, consent_version, consented_at is not null, status::text, message
      from public.consultations where phone = '010-1111-0001' order by grade, message nulls first$$,
  $$values ('홍길동', '2026-11-05', true, 'new', null::text),
           ('홍길동', '2026-11-05', true, 'new', '궁금해요'),
           ('홍길동', '2026-11-05', true, 'new', null::text)$$,
  'submit_consultation: 이름 btrim, 빈 메시지는 null, 동의 버전·시각, status = new'
);

-- 24시간이 지난 신청은 세지 않는다.
update public.consultations set created_at = now() - interval '25 hours' where phone = '010-1111-0001';
set local role service_role;
select lives_ok($$select public.submit_consultation('홍길동','010-1111-0001','중2',null,'2026-11-05')$$,
  'service_role: 24시간이 지나면 다시 신청할 수 있다');
reset role;

-- ─── 제약 ────────────────────────────────────────────────────────────
select throws_ok($$insert into public.consultations (parent_name, phone, grade, consent_version, consented_at)
                   values ('a', '01000000001', '중2', 'v', now())$$,
  '23514', null, '제약: 하이픈 없는 전화번호는 check 위반');
select throws_ok($$insert into public.consultations (parent_name, phone, grade, message, consent_version, consented_at)
                   values ('a', '010-0000-0001', '중2', repeat('가', 1001), 'v', now())$$,
  '23514', null, '제약: 1001자 메시지는 check 위반');
select throws_ok($$insert into public.consultations (parent_name, phone, grade, consent_version, consented_at)
                   values ('  ', '010-0000-0001', '중2', 'v', now())$$,
  '23514', null, '제약: 공백뿐인 이름은 check 위반');
select throws_ok($$insert into public.consultations (parent_name, phone, grade, consent_version, consented_at)
                   values ('a', '010-0000-0001', '중2', '', now())$$,
  '23514', null, '제약: 빈 동의 버전은 check 위반');
select throws_ok($$insert into public.consultations (parent_name, phone, grade, consent_version, consented_at)
                   values ('a', '010-0000-0001', '초6', 'v', now())$$,
  '22P02', null, '제약: 학년 enum에 없는 값은 거부');

-- ─── 감사 로그 ───────────────────────────────────────────────────────
select cmp_ok((select count(*)::int from public.consultations), '>', 0,
  '감사: 검사할 consultations 행이 있다 (빈 테이블이면 아래 검사가 공허해진다)');
select is(
  (select count(*)::int from public.consultations c
    where not exists (select 1 from private.audit_log a
                       where a.table_name = 'public.consultations'
                         and a.op = 'INSERT' and a.row_id = c.id::text)),
  0,
  '감사: 모든 consultations insert가 audit_log에 행 id로 남는다'
);
select is(
  (select actor from private.audit_log
    where table_name = 'public.consultations' and op = 'UPDATE' order by id limit 1),
  '00000000-0000-4000-8000-00000000a003'::uuid,
  '감사: 원장의 update가 actor = 원장 uid로 남는다'
);

select * from finish();
rollback;
