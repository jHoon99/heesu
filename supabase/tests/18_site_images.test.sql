-- 홈페이지 사진 버킷 site-images와 소개 카드 사진 경로(image) 검사. 가짜 데이터만 쓴다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a018', 'admin18@example.test'),
  ('00000000-0000-4000-8000-00000000c018', 'nobody18@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a018');

-- ─── 버킷·정책 모양 ──────────────────────────────────────────────────
select results_eq($$select public, allowed_mime_types, file_size_limit from storage.buckets where id = 'site-images'$$,
  $$values (true, array['image/jpeg', 'image/png', 'image/webp'], 5242880::bigint)$$,
  'site-images 버킷: 공개, jpg·png·webp, 5 MiB');
select policy_roles_are('storage', 'objects', 'site_images_admin_select', ARRAY['authenticated'], 'select는 authenticated');
select policy_roles_are('storage', 'objects', 'site_images_admin_insert', ARRAY['authenticated'], 'insert는 authenticated');
select policy_roles_are('storage', 'objects', 'site_images_admin_delete', ARRAY['authenticated'], 'delete는 authenticated');

-- ─── 올리기: 원장 aal2만 ─────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a018","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into storage.objects (bucket_id, name)
  values ('site-images', 'about/11111111-1111-4111-8111-111111111111.jpg')$$, '원장 aal2: 사진 올리기');
select is((select count(*)::int from storage.objects where bucket_id = 'site-images'), 1, '원장 aal2: 사진 1장 보인다');
select is_empty($$update storage.objects set name = 'about/x.jpg' where bucket_id = 'site-images' returning 1$$,
  '원장도 update 0행 (새 사진은 새 경로로)');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a018","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into storage.objects (bucket_id, name)
  values ('site-images', 'about/22222222-2222-4222-8222-222222222222.jpg')$$, '42501', null, '원장 aal1: 올리기 RLS 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c018","role":"authenticated","aal":"aal2"}';
select throws_ok($$insert into storage.objects (bucket_id, name)
  values ('site-images', 'about/33333333-3333-4333-8333-333333333333.jpg')$$, '42501', null, '아무나: 올리기 RLS 에러');
set local storage.allow_delete_query = 'true';
select is_empty($$delete from storage.objects where bucket_id = 'site-images' returning 1$$, '아무나: 지우기 0행');
set local storage.allow_delete_query = 'false';

reset role;
set local role anon;
select throws_ok($$insert into storage.objects (bucket_id, name)
  values ('site-images', 'about/44444444-4444-4444-8444-444444444444.jpg')$$, '42501', null, 'anon: 올리기 RLS 에러');

-- ─── 소개 카드 image 경로 ────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a018","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.site_content (key, value) values ('about',
  '{"intro":null,"items":[{"title":"t","url":"https://a.b","teaser":null,"image":"about/11111111-1111-4111-8111-111111111111.webp"},{"title":"u","url":"https://a.b","image":null}]}')
  on conflict (key) do update set value = excluded.value$$, 'image 경로·null 저장');
select throws_ok($$update public.site_content set value = '{"items":[{"title":"t","url":"https://a.b","image":"https://evil.example/x.jpg"}]}' where key = 'about'$$,
  'P0001', null, 'image에 바깥 주소는 안 된다');
select throws_ok($$update public.site_content set value = '{"items":[{"title":"t","url":"https://a.b","image":"about/../videos/x.jpg"}]}' where key = 'about'$$,
  'P0001', null, 'image에 .. 경로는 안 된다');
select throws_ok($$update public.site_content set value = '{"items":[{"title":"t","url":"https://a.b","image":"about/11111111-1111-4111-8111-111111111111.svg"}]}' where key = 'about'$$,
  'P0001', null, 'image 확장자는 jpg·png·webp만');
select throws_ok($$update public.site_content set value = '{"items":[{"title":"t","url":"https://a.b","image":1}]}' where key = 'about'$$,
  'P0001', null, 'image는 글자 또는 null');

reset role;
set local role anon;
select is((select count(*)::int from public.site_content where key = 'about'), 1, 'anon: 사진 경로가 든 about을 읽는다');

select * from finish();
rollback;
