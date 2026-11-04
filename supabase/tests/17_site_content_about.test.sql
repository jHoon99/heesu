-- site_content 소개(about: 소개 글·링크 카드) 모양 검사·권한 테스트. 가짜 데이터만 쓴다. 시드 행은 그대로 둔다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a017', 'admin17@example.test'),
  ('00000000-0000-4000-8000-00000000c017', 'nobody17@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a017');

-- ─── 원장 aal2: 정상 값 ──────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a017","role":"authenticated","aal":"aal2"}';

select lives_ok($$insert into public.site_content (key, value) values ('about',
  '{"intro":"전주에서 영어를 가르쳐요.\n둘째 줄이에요.","items":[{"title":"네이버 블로그 — 개원 이야기","url":"https://blog.naver.com/heesu/1"},{"title":"인스타그램","url":"https://www.instagram.com/heesu?igsh=a&b=1"}]}')
  on conflict (key) do update set value = excluded.value$$, 'about 정상 upsert');
select lives_ok($$update public.site_content set value = '{"intro":null,"items":[]}' where key = 'about'$$,
  'about 0칸·intro null');
select lives_ok($$update public.site_content set value =
  jsonb_build_object('items', (select jsonb_agg(jsonb_build_object('title','t' || i,'url','https://example.com/' || i)) from generate_series(1,10) i))
  where key = 'about'$$, 'about 10칸');
select lives_ok($$update public.site_content set value =
  jsonb_build_object('items', jsonb_build_array(jsonb_build_object('title', 't', 'url', 'https://' || repeat('a', 500))))
  where key = 'about'$$, 'about 주소 500자');
select lives_ok($$update public.site_content set value =
  jsonb_build_object('intro', repeat('가', 300), 'items', jsonb_build_array(jsonb_build_object('title', repeat('가', 40), 'url', 'https://a.b')))
  where key = 'about'$$, 'about intro 300자·title 40자');

-- ─── 모양 위반: P0001 ────────────────────────────────────────────────
create temp table bad (label text, v jsonb);
grant all on bad to authenticated;
insert into bad values
  ('11칸', jsonb_build_object('items', (select jsonb_agg(jsonb_build_object('title','t','url','https://a.b')) from generate_series(1,11)))),
  ('javascript: 주소', '{"items":[{"title":"t","url":"javascript:alert(1)"}]}'),
  ('http:// 주소', '{"items":[{"title":"t","url":"http://blog.naver.com"}]}'),
  ('data: 주소', '{"items":[{"title":"t","url":"data:text/html,x"}]}'),
  ('주소에 공백', '{"items":[{"title":"t","url":"https://a.b/x y"}]}'),
  ('주소에 <', '{"items":[{"title":"t","url":"https://a.b/<script>"}]}'),
  ('빈 제목', '{"items":[{"title":"","url":"https://a.b"}]}'),
  ('공백뿐인 제목', '{"items":[{"title":"   ","url":"https://a.b"}]}'),
  ('제목 41자', jsonb_build_object('items', jsonb_build_array(jsonb_build_object('title', repeat('가', 41), 'url', 'https://a.b')))),
  ('칸에 모르는 필드', '{"items":[{"title":"t","url":"https://a.b","icon":"x"}]}'),
  ('모르는 필드', '{"items":[],"extra":1}'),
  ('intro 301자', jsonb_build_object('intro', repeat('가', 301), 'items', '[]'::jsonb)),
  ('heading 필드(없어진 필드)', '{"heading":"h","items":[]}'),
  ('intro 숫자', '{"intro":1}'),
  ('items 배열 아님', '{"items":{"title":"t"}}'),
  ('주소 501자', jsonb_build_object('items', jsonb_build_array(jsonb_build_object('title', 't', 'url', 'https://' || repeat('a', 501))))),
  ('url 없음', '{"items":[{"title":"t"}]}');

select throws_ok(format('update public.site_content set value = %L where key = %L', v::text, 'about'),
  'P0001', '랜딩 내용 형식이 맞지 않아요. 새로고침한 뒤 다시 저장해 주세요.', 'about: ' || label)
  from bad;

-- ─── 원장 아닌 로그인 사용자: 쓰기 불가 ──────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c017","role":"authenticated","aal":"aal2"}';
select throws_ok($$insert into public.site_content (key, value) values ('about', '{"items":[]}')
  on conflict (key) do update set value = excluded.value$$, '42501', null, '아무나: about upsert는 RLS 에러');

-- ─── anon: 공개 읽기 ─────────────────────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.site_content where key = 'about'), 1, 'anon: about 행 select 성공');

select * from finish();
rollback;
