-- 미등록 상담 6개월 삭제(pg_cron)와 consultations 컬럼 권한 테스트(설계 13장 S12). 가짜 데이터만 쓴다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.consultations;
delete from private.audit_log where table_name = 'public.consultations';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a014', 'admin14@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a014');

insert into public.consultations (parent_name, phone, grade, status, consent_version, consented_at, created_at) values
  ('가짜 새신청', '010-0000-0141', '중1', 'new', 'v', now(), now() - interval '7 months'),
  ('가짜 6개월 하루 넘음', '010-0000-0147', '중1', 'new', 'v', now(), now() - interval '6 months' - interval '1 day'),
  ('가짜 연락함', '010-0000-0142', '중1', 'contacted', 'v', now(), now() - interval '7 months'),
  ('가짜 보류', '010-0000-0143', '중1', 'on_hold', 'v', now(), now() - interval '7 months'),
  ('가짜 등록', '010-0000-0144', '중1', 'enrolled', 'v', now(), now() - interval '2 years'),
  ('가짜 거의 6개월', '010-0000-0145', '중1', 'new', 'v', now(), now() - interval '6 months' + interval '1 day'),
  ('가짜 오늘', '010-0000-0146', '중1', 'new', 'v', now(), now());

-- ─── 삭제 함수 ───────────────────────────────────────────────────────
select is(private.purge_stale_consultations(), 4, '삭제: 6개월 넘은 미등록 4건을 지운다');
select results_eq(
  $$select parent_name from public.consultations order by parent_name$$,
  $$values ('가짜 거의 6개월'), ('가짜 등록'), ('가짜 오늘')$$,
  '삭제: 등록 건과 6개월 안의 건은 남는다');
select is(private.purge_stale_consultations(), 0, '삭제: 다시 부르면 0건');
select is(
  (select count(*)::int from private.audit_log
    where table_name = 'public.consultations' and op = 'DELETE' and actor is null),
  4, '감사: DELETE 4행이 actor null로 남는다');

-- ─── cron 작업 ───────────────────────────────────────────────────────
select is((select count(*)::int from cron.job where jobname = 'purge-stale-consultations'), 1,
  'cron: 작업이 하나 있다');
select is((select schedule from cron.job where jobname = 'purge-stale-consultations'), '0 18 * * *',
  'cron: 일정 = 매일 18:00 UTC (03:00 KST)');
select is((select command from cron.job where jobname = 'purge-stale-consultations'),
  'select private.purge_stale_consultations()', 'cron: 명령이 삭제 함수다');
select ok((select active from cron.job where jobname = 'purge-stale-consultations'), 'cron: 켜져 있다');

-- ─── 함수 실행 권한 ──────────────────────────────────────────────────
select function_privs_are('private', 'purge_stale_consultations', ARRAY[]::text[], 'anon', ARRAY[]::text[],
  'anon: 삭제 함수 실행 불가');
select function_privs_are('private', 'purge_stale_consultations', ARRAY[]::text[], 'authenticated', ARRAY[]::text[],
  'authenticated: 삭제 함수 실행 불가');
select function_privs_are('private', 'purge_stale_consultations', ARRAY[]::text[], 'service_role', ARRAY[]::text[],
  'service_role: 삭제 함수 실행 불가');

-- ─── 원장 aal2: status·memo만 고친다 ─────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a014","role":"authenticated","aal":"aal2"}';
select lives_ok($$update public.consultations set status = 'contacted', memo = '(가짜) 통화함'$$,
  '원장 aal2: status·memo update 성공');
select throws_ok($$update public.consultations set phone = '010-0000-0000'$$, '42501', null,
  '원장 aal2: phone update는 권한 에러');
select throws_ok($$update public.consultations set created_at = now()$$, '42501', null,
  '원장 aal2: created_at update는 권한 에러');
reset role;
select is((select count(*)::int from public.consultations where memo = '(가짜) 통화함'), 3,
  '원장 aal2: update가 반영됐다');

select * from finish();
rollback;
