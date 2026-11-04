-- site_content 권한 테스트: anon·authenticated는 읽기만, 쓰기는 원장(admins + aal2)만. 가짜 데이터만 쓴다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- seed.sql의 예시 행을 비우고 이 테스트의 두 행만 둔다 (rollback으로 되돌아간다).
delete from public.site_content;
insert into public.site_content (key, value) values
  ('notice', '{"title":"t","body":"b","visible":false}'),
  ('contact', '{"phone":"063-000-0000","address":"a"}');

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a002', 'admin2@example.test'),
  ('00000000-0000-4000-8000-00000000b002', 'nobody2@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a002');

-- ─── anon: 읽기 성공, 쓰기 권한 에러 ─────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.site_content), 2,
  'anon: site_content select 성공 (2행)');
select throws_ok($$insert into public.site_content (key, value) values ('x', '{}')$$,
  '42501', null, 'anon: insert는 권한 에러');

-- ─── authenticated(원장 아님, aal2): 읽기만 ──────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b002","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.site_content), 2,
  'authenticated(원장 아님): select 2행');
select throws_ok($$insert into public.site_content (key, value) values ('x', '{}')$$,
  '42501', null, 'authenticated(원장 아님): insert는 RLS 에러');
update public.site_content set value = '{}' where key = 'notice';
select throws_ok($$delete from public.site_content$$,
  '42501', null, 'authenticated(원장 아님): delete는 권한 에러');

reset role;
select is((select value->>'title' from public.site_content where key = 'notice'), 't',
  'authenticated(원장 아님): update가 값을 바꾸지 못한다');
select is((select count(*)::int from public.site_content), 2,
  'authenticated(원장 아님): 행이 그대로 2개다');

-- ─── 원장 + aal1: 쓰기 불가 ──────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a002","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into public.site_content (key, value) values ('x', '{}')$$,
  '42501', null, '원장 + aal1: insert는 RLS 에러');

-- ─── 원장 + aal2: 쓰기 가능 ──────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a002","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.site_content (key, value) values ('tuition', '{"monthly":"m"}')$$,
  '원장 + aal2: insert 성공');
select lives_ok($$update public.site_content set value = '{"title":"바뀜"}' where key = 'notice'$$,
  '원장 + aal2: update 성공');
select throws_ok($$delete from public.site_content where key = 'tuition'$$,
  '42501', null, '원장 + aal2: delete는 권한 에러 (delete 권한 없음)');

reset role;
select is((select value->>'title' from public.site_content where key = 'notice'), '바뀜',
  '원장 + aal2: update 뒤 값이 바뀐다');
select is((select count(*)::int from public.site_content where key = 'tuition'), 1,
  '원장 + aal2: delete가 막혀 행이 남는다');

-- updated_at 트리거: update하면 now()로 갱신된다.
update public.site_content set updated_at = '2000-01-01' where key = 'contact';
select is((select updated_at from public.site_content where key = 'contact'), now(),
  'set_updated_at(): update 시 updated_at = now()');

-- ─── 키 형식 ─────────────────────────────────────────────────────────
select throws_ok($$insert into public.site_content (key, value) values ('Bad-Key', '{}')$$,
  '23514', null, '키 형식: 대문자·하이픈은 check 위반');
select throws_ok($$insert into public.site_content (key, value) values ('a' || repeat('b', 40), '{}')$$,
  '23514', null, '키 형식: 41자는 check 위반');
-- (40자 허용 검사는 키가 고정 목록(site_content_key_known)이 되어 15_site_content_write로 옮겼다.)

-- set_updated_at()은 anon·authenticated가 직접 실행할 수 없다.
select is(
  (select coalesce(array_agg(r.rolname order by 1), '{}')
     from (values ('anon'), ('authenticated')) as r(rolname)
    where has_function_privilege(r.rolname, 'private.set_updated_at()', 'execute')),
  '{}'::text[],
  'private.set_updated_at(): anon·authenticated EXECUTE 없음'
);

-- 권한 표: authenticated는 key·value만 쓰고 delete는 없다.
select table_privs_are('public', 'site_content', 'authenticated', ARRAY['SELECT'],
  'site_content: authenticated 테이블 권한 = SELECT뿐 (delete 없음)');
select column_privs_are('public', 'site_content', 'key', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'site_content.key: authenticated INSERT·SELECT·UPDATE');
select column_privs_are('public', 'site_content', 'value', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'site_content.value: authenticated INSERT·SELECT·UPDATE');
select column_privs_are('public', 'site_content', 'updated_at', 'authenticated', ARRAY['SELECT'],
  'site_content.updated_at: authenticated SELECT뿐');

select * from finish();
rollback;
