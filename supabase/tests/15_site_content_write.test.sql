-- site_content 쓰기 모양 검사·권한 테스트. 가짜 데이터만 쓴다. 시드 행은 그대로 둔다
-- (db reset이 시드를 새 검사로 넣었다는 것이 시드가 통과한다는 증거).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(34);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a015', 'admin15@example.test'),
  ('00000000-0000-4000-8000-00000000b015', 'student15@example.test'),
  ('00000000-0000-4000-8000-00000000c015', 'nobody15@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a015');

select is((select count(*)::int from public.site_content), 6, '시드: 6행이 새 검사를 통과해 들어 있다');

-- ─── 원장 aal2: 정상 값 ──────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a015","role":"authenticated","aal":"aal2"}';

select lives_ok($$insert into public.site_content (key, value) values ('notice', '{"title":"t","body":"b","visible":false}')
  on conflict (key) do update set value = excluded.value$$, 'notice 정상 upsert');
select lives_ok($$insert into public.site_content (key, value) values ('classes',
  (select jsonb_agg(jsonb_build_object('name','n','grades','g','schedule','s','capacity',null)) from generate_series(1,10)))
  on conflict (key) do update set value = excluded.value$$, 'classes 10칸·정원 빈칸 upsert');
select lives_ok($$insert into public.site_content (key, value) values ('classes', '[{"name":"a","capacity":1},{"capacity":50}]')
  on conflict (key) do update set value = excluded.value$$, 'classes 정원 1·50 upsert');
select lives_ok($$insert into public.site_content (key, value) values ('tuition', '{"monthly":"m","textbook":null,"note":"n"}')
  on conflict (key) do update set value = excluded.value$$, 'tuition 정상 upsert');
select lives_ok($$insert into public.site_content (key, value) values ('contact', '{"phone":"063-000-0000","address":"a"}')
  on conflict (key) do update set value = excluded.value$$, 'contact 정상 upsert');
select lives_ok($$insert into public.site_content (key, value) values ('legal', '{"academy_name":"a","registration_no":"r","subjects":"s","tuition_notice":"t"}')
  on conflict (key) do update set value = excluded.value$$, 'legal 정상 upsert');
select lives_ok($$insert into public.site_content (key, value) values ('points_goal', '30')
  on conflict (key) do update set value = excluded.value$$, 'points_goal 30');
select lives_ok($$update public.site_content set value = '1' where key = 'points_goal'$$, 'points_goal 1');
select lives_ok($$update public.site_content set value = '10000' where key = 'points_goal'$$, 'points_goal 10000');

-- ─── 모양 위반: P0001 ────────────────────────────────────────────────
create temp table bad (label text, k text, v jsonb);
grant all on bad to authenticated;
insert into bad values
  ('notice visible 문자열', 'notice', '{"visible":"yes"}'),
  ('notice title 숫자', 'notice', '{"title":1}'),
  ('notice 모르는 필드', 'notice', '{"extra":"x"}'),
  ('classes 11칸', 'classes', (select jsonb_agg(jsonb_build_object('name','n')) from generate_series(1,11))),
  ('classes 정원 0', 'classes', '[{"capacity":0}]'),
  ('classes 정원 51', 'classes', '[{"capacity":51}]'),
  ('classes 정원 1.5', 'classes', '[{"capacity":1.5}]'),
  ('classes 배열 아님', 'classes', '{"name":"n"}'),
  ('contact 전화 형식', 'contact', '{"phone":"010-1234"}'),
  ('points_goal 0', 'points_goal', '0'),
  ('points_goal 10001', 'points_goal', '10001'),
  ('points_goal 1.5', 'points_goal', '1.5'),
  ('points_goal 문자열', 'points_goal', '"30"'),
  ('points_goal jsonb null', 'points_goal', 'null'),
  ('제어 문자', 'notice', '{"body":"a\u0007b"}'),
  ('9000바이트', 'notice', jsonb_build_object('body', repeat('a', 9000)));

select throws_ok(format('update public.site_content set value = %L where key = %L', v::text, k),
  'P0001', '랜딩 내용 형식이 맞지 않아요. 새로고침한 뒤 다시 저장해 주세요.', 'update: ' || label)
  from bad;

select throws_ok($$insert into public.site_content (key, value) values ('banner', '{}')$$,
  '23514', null, '모르는 키 banner는 check 위반');

-- ─── 원장 aal2: delete·updated_at 직접 쓰기 막힘 ─────────────────────
select throws_ok($$delete from public.site_content$$, '42501', null, '원장 aal2: delete는 권한 에러');
select throws_ok($$update public.site_content set updated_at = now()$$, '42501', null,
  '원장 aal2: updated_at 직접 update는 권한 에러');

-- ─── 학생·아무나·원장 aal1: 쓰기 불가 ────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b015","role":"authenticated","aal":"aal2"}';
select throws_ok($$insert into public.site_content (key, value) values ('points_goal', '5')
  on conflict (key) do update set value = excluded.value$$, '42501', null, '학생: upsert는 RLS 에러');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c015","role":"authenticated","aal":"aal2"}';
select throws_ok($$insert into public.site_content (key, value) values ('points_goal', '5')
  on conflict (key) do update set value = excluded.value$$, '42501', null, '아무나: upsert는 RLS 에러');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a015","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into public.site_content (key, value) values ('points_goal', '5')
  on conflict (key) do update set value = excluded.value$$, '42501', null, '원장 aal1: upsert는 RLS 에러');

-- ─── anon: 공개 읽기 그대로 ──────────────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.site_content), 6, 'anon: site_content select 6행');

-- ─── 함수 권한 ───────────────────────────────────────────────────────
reset role;
select is(
  (select coalesce(array_agg(r.rolname order by 1), '{}')
     from (values ('anon'), ('authenticated'), ('service_role')) as r(rolname)
    where has_function_privilege(r.rolname, 'private.check_site_content()', 'execute')),
  '{}'::text[],
  'private.check_site_content(): anon·authenticated·service_role EXECUTE 없음'
);

select * from finish();
rollback;
