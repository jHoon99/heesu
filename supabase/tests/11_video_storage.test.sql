-- storage.objects 정책 테스트: 버킷 videos(설계 13장 S9). 가짜 데이터만 쓴다.
-- 원장(admins + aal2)만 파일을 올리고 고치고 지우고 읽는다. 학생은 자기 반(퇴원 아님)에 공개된 영상 행이 가리키는
-- 파일만 읽는다(videos.storage_path 조인, 경로 파싱 없음). 학생·anon의 insert·update·delete 정책은 없다.
-- storage.objects의 삭제 보호 트리거(storage.protect_delete)는 storage.allow_delete_query가 'true'일 때만 통과시킨다.
-- 이 파일은 delete를 할 때만 그 설정을 켜서, 트리거가 아니라 RLS를 검사한다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.videos;
delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;
set local storage.allow_delete_query = 'true';
delete from storage.objects where bucket_id = 'videos';
set local storage.allow_delete_query = 'false';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a011', 'admin11@example.test'),
  ('00000000-0000-4000-8000-00000000c011', 'vst_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d011', 'vst_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e011', 'vst_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b011', 'nobody11@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a011');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c011', '00000000-0000-4000-8000-00000000c011', 'vst_a', '가짜저장A', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000d011', '00000000-0000-4000-8000-00000000d011', 'vst_b', '가짜저장B', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000e011', '00000000-0000-4000-8000-00000000e011', 'vst_l', '가짜저장L', '중3', 'left');

-- 반 X(A·L), Y(B)
insert into public.classes (id, name, level) values
  ('20000000-0000-4000-8000-00000000a011', '가짜 저장반 X', 'middle'),
  ('20000000-0000-4000-8000-00000000b011', '가짜 저장반 Y', 'high');
insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-00000000a011', '10000000-0000-4000-8000-00000000c011'),
  ('20000000-0000-4000-8000-00000000a011', '10000000-0000-4000-8000-00000000e011'),
  ('20000000-0000-4000-8000-00000000b011', '10000000-0000-4000-8000-00000000d011');

-- 파일 4개: VX1·VX2·VY1의 파일, 그리고 행이 없는 orphan(X 반 폴더에 있어도 학생에게 안 보여야 한다).
insert into storage.objects (bucket_id, name) values
  ('videos', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000a011.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000b011.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000b011/40000000-0000-4000-8000-00000000c011.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000d011.mp4');

-- 영상 VX1(X, 어제 공개), VX2(X, 내일 공개), VY1(Y, 어제 공개)
insert into public.videos (id, class_id, title, storage_path, duration_seconds, published_at) values
  ('30000000-0000-4000-8000-00000000a011', '20000000-0000-4000-8000-00000000a011', '(테스트) 저장 1강',
   '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000a011.mp4', 600, now() - interval '1 day'),
  ('30000000-0000-4000-8000-00000000b011', '20000000-0000-4000-8000-00000000a011', '(테스트) 저장 2강',
   '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000b011.mp4', 600, now() + interval '1 day'),
  ('30000000-0000-4000-8000-00000000c011', '20000000-0000-4000-8000-00000000b011', '(테스트) 저장 Y 1강',
   '20000000-0000-4000-8000-00000000b011/40000000-0000-4000-8000-00000000c011.mp4', 600, now() - interval '1 day');

-- ─── 버킷 ────────────────────────────────────────────────────────────
select results_eq($$select public, allowed_mime_types, file_size_limit from storage.buckets where id = 'videos'$$,
  $$values (false, array['video/mp4'], 1073741824::bigint)$$,
  'videos 버킷: 비공개, video/mp4만, 1 GiB');

-- ─── 정책 모양 ───────────────────────────────────────────────────────
select policies_are('storage', 'objects',
  ARRAY['materials_admin_delete', 'materials_admin_insert', 'materials_admin_select', 'materials_member_select',
        'site_images_admin_delete', 'site_images_admin_insert', 'site_images_admin_select',
        'videos_admin_delete', 'videos_admin_insert', 'videos_admin_select', 'videos_admin_update', 'videos_member_select'],
  'storage.objects 정책 = videos(원장 4개 + 학생 select 1개) + site-images(원장 3개) + materials(원장 3개 + 학생 select 1개)');
select policy_roles_are('storage', 'objects', 'videos_admin_select', ARRAY['authenticated'], 'videos_admin_select는 authenticated');
select policy_roles_are('storage', 'objects', 'videos_admin_insert', ARRAY['authenticated'], 'videos_admin_insert는 authenticated');
select policy_roles_are('storage', 'objects', 'videos_admin_update', ARRAY['authenticated'], 'videos_admin_update는 authenticated');
select policy_roles_are('storage', 'objects', 'videos_admin_delete', ARRAY['authenticated'], 'videos_admin_delete는 authenticated');
select policy_roles_are('storage', 'objects', 'videos_member_select', ARRAY['authenticated'], 'videos_member_select는 authenticated');
select policy_cmd_is('storage', 'objects', 'videos_admin_select', 'SELECT', 'videos_admin_select는 SELECT');
select policy_cmd_is('storage', 'objects', 'videos_admin_insert', 'INSERT', 'videos_admin_insert는 INSERT');
select policy_cmd_is('storage', 'objects', 'videos_admin_update', 'UPDATE', 'videos_admin_update는 UPDATE');
select policy_cmd_is('storage', 'objects', 'videos_admin_delete', 'DELETE', 'videos_admin_delete는 DELETE');
select policy_cmd_is('storage', 'objects', 'videos_member_select', 'SELECT', 'videos_member_select는 SELECT');

-- ─── 읽기 ────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c011","role":"authenticated","aal":"aal1"}';
select results_eq($$select name from storage.objects where bucket_id = 'videos' order by name$$,
  $$values ('20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000a011.mp4')$$,
  'A: 자기 반 공개 영상 VX1의 파일만 (공개 전 VX2·다른 반 VY1·행 없는 orphan은 안 보인다)');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d011","role":"authenticated","aal":"aal1"}';
select results_eq($$select name from storage.objects where bucket_id = 'videos' order by name$$,
  $$values ('20000000-0000-4000-8000-00000000b011/40000000-0000-4000-8000-00000000c011.mp4')$$,
  'B: VY1의 파일만');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e011","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 0, '퇴원생 L: 파일 0개');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b011","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 0, '아무나: 파일 0개');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a011","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 0, '원장 aal1: 파일 0개');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a011","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 4, '원장 aal2: 파일 4개 (orphan 포함)');

-- ─── 공개일·삭제가 바로 반영된다 (Review Focus 2) ─────────────────────
reset role;
update public.videos set published_at = now() - interval '1 minute' where id = '30000000-0000-4000-8000-00000000b011';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c011","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 2, 'A: VX2가 공개되면 파일 2개');

reset role;
update public.videos set published_at = now() + interval '1 day' where id = '30000000-0000-4000-8000-00000000b011';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c011","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 1, 'A: 공개일을 미래로 되돌리면 VX2 파일이 다시 안 보인다');

reset role;
delete from public.videos where id = '30000000-0000-4000-8000-00000000a011';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c011","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 0,
  'A: VX1 행을 지우면 VX1 파일이 바로 안 보인다');

-- VX1 행을 되살린다(아래 쓰기 검사용).
reset role;
insert into public.videos (id, class_id, title, storage_path, duration_seconds, published_at) values
  ('30000000-0000-4000-8000-00000000a011', '20000000-0000-4000-8000-00000000a011', '(테스트) 저장 1강',
   '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000a011.mp4', 600, now() - interval '1 day');

-- ─── 학생 쓰기 ───────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c011","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into storage.objects (bucket_id, name)
                   values ('videos', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4')$$,
  '42501', null, 'A: 파일 insert는 RLS 에러');
select is_empty($$update storage.objects set name = '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000f011.mp4'
                   where bucket_id = 'videos' returning 1$$,
  'A: 파일 update 0행 (보이는 VX1 파일도 못 고친다)');
set local storage.allow_delete_query = 'true';
select is_empty($$delete from storage.objects where bucket_id = 'videos' returning 1$$,
  'A: 파일 delete 0행 (보이는 VX1 파일도 못 지운다)');
set local storage.allow_delete_query = 'false';
-- 학생은 파일이 있는지 없는지 알 수 없다: 없는 경로로 영상 행을 만들어도 존재 검사(P0001)가 아니라 RLS(42501).
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a011', '(테스트) 학생 없는 경로',
                           '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4', 60)$$,
  '42501', null, 'A: 없는 경로로 videos insert도 RLS 에러 (파일 유무를 알려 주지 않는다)');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a011', '(테스트) 학생 있는 경로',
                           '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000d011.mp4', 60)$$,
  '42501', null, 'A: 있는 경로로 videos insert도 같은 RLS 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b011","role":"authenticated","aal":"aal2"}';
select throws_ok($$insert into storage.objects (bucket_id, name)
                   values ('videos', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4')$$,
  '42501', null, '아무나: 파일 insert는 RLS 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a011","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into storage.objects (bucket_id, name)
                   values ('videos', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4')$$,
  '42501', null, '원장 aal1: 파일 insert는 RLS 에러');
select is_empty($$update storage.objects set name = name where bucket_id = 'videos' returning 1$$,
  '원장 aal1: 파일 update 0행');
set local storage.allow_delete_query = 'true';
select is_empty($$delete from storage.objects where bucket_id = 'videos' returning 1$$, '원장 aal1: 파일 delete 0행');
set local storage.allow_delete_query = 'false';

reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'videos'
            and name like '20000000-0000-4000-8000-00000000_011/40000000-0000-4000-8000-00000000_011.mp4'
            and name not like '%f011.mp4'), 4,
  '학생·원장 aal1의 쓰기 뒤에도 파일 4개, 이름 그대로');

-- ─── 원장 aal2 쓰기 ──────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a011","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into storage.objects (bucket_id, name)
                  values ('videos', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4')$$,
  '원장 aal2: 파일 insert 성공');
select throws_ok($$insert into storage.objects (bucket_id, name)
                   values ('other', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000f011.mp4')$$,
  '42501', null, '원장 aal2: videos가 아닌 버킷에는 insert 못 한다');
select results_eq($$update storage.objects set metadata = '{"x":1}'
                    where bucket_id = 'videos'
                      and name = '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4'
                    returning name$$,
  $$values ('20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4')$$,
  '원장 aal2: 파일 update 성공');
select throws_ok($$update storage.objects set bucket_id = 'other'
                    where bucket_id = 'videos'
                      and name = '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4'$$,
  '42501', null, '원장 aal2: 파일을 다른 버킷으로 옮기지 못한다 (with check)');
set local storage.allow_delete_query = 'true';
select results_eq($$delete from storage.objects
                    where bucket_id = 'videos'
                      and name = '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4'
                    returning name$$,
  $$values ('20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4')$$,
  '원장 aal2: 파일 delete 성공');
set local storage.allow_delete_query = 'false';
-- 원장에게는 존재 검사가 그대로 돈다(Task 1의 P0001).
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a011', '(테스트) 파일 없음',
                           '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4', 60)$$,
  'P0001', '영상 파일이 아직 올라가지 않았어요. 파일을 다시 올려 주세요.',
  '원장 aal2: 지운 파일 경로로 videos insert는 존재 검사가 거부');

-- ─── anon ────────────────────────────────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 0, 'anon: 파일 0개');
select throws_ok($$insert into storage.objects (bucket_id, name)
                   values ('videos', '20000000-0000-4000-8000-00000000a011/40000000-0000-4000-8000-00000000e011.mp4')$$,
  '42501', null, 'anon: 파일 insert는 RLS 에러');
select is_empty($$update storage.objects set name = name where bucket_id = 'videos' returning 1$$, 'anon: 파일 update 0행');
set local storage.allow_delete_query = 'true';
select is_empty($$delete from storage.objects where bucket_id = 'videos' returning 1$$, 'anon: 파일 delete 0행');
set local storage.allow_delete_query = 'false';

reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 4, '끝: 파일 4개 그대로');

select * from finish();
rollback;
