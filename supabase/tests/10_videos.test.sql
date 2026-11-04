-- videos·video_views·save_video_progress 테스트(설계 13장 S1·S3·S9, v1 스펙 §7). 가짜 데이터만 쓴다.
-- 학생은 자기 반(퇴원 아님)의 공개된 영상만 읽고, 시청 기록은 자기 행만 읽는다. 쓰기는 save_video_progress 하나.
-- 영상 행은 원장(admins + aal2)만 만들고 고치고 지운다. 버킷에 파일이 없는 행은 트리거가 막는다(P0001).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(77);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.videos;
delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a010', 'admin10@example.test'),
  ('00000000-0000-4000-8000-00000000c010', 'vid_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000f010', 'vid_p@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d010', 'vid_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e010', 'vid_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b010', 'nobody10@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a010');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c010', '00000000-0000-4000-8000-00000000c010', 'vid_a', '가짜영상A', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000f010', '00000000-0000-4000-8000-00000000f010', 'vid_p', '가짜영상P', '중2', 'paused'),
  ('10000000-0000-4000-8000-00000000d010', '00000000-0000-4000-8000-00000000d010', 'vid_b', '가짜영상B', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000e010', '00000000-0000-4000-8000-00000000e010', 'vid_l', '가짜영상L', '중3', 'left');

-- 반 X(A·P·L), Y(B)
insert into public.classes (id, name, level) values
  ('20000000-0000-4000-8000-00000000a010', '가짜 영상반 X', 'middle'),
  ('20000000-0000-4000-8000-00000000b010', '가짜 영상반 Y', 'high');
insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-00000000a010', '10000000-0000-4000-8000-00000000c010'),
  ('20000000-0000-4000-8000-00000000a010', '10000000-0000-4000-8000-00000000f010'),
  ('20000000-0000-4000-8000-00000000a010', '10000000-0000-4000-8000-00000000e010'),
  ('20000000-0000-4000-8000-00000000b010', '10000000-0000-4000-8000-00000000d010');

-- 버킷의 파일(실제 업로드 대신 postgres로 행만 넣는다). 4번째는 원장 insert 검사용 빈 경로,
-- '../x.mp4'는 존재 트리거를 통과시켜 경로 형식 check가 걸리는지 보려고 넣는다.
insert into storage.objects (bucket_id, name) values
  ('videos', '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000a010.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000b010.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000b010/40000000-0000-4000-8000-00000000c010.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4'),
  ('videos', '../x.mp4');

-- 영상 VX1(X, 어제 공개, 600초), VX2(X, 내일 공개), VY1(Y, 어제 공개)
insert into public.videos (id, class_id, title, storage_path, duration_seconds, published_at) values
  ('30000000-0000-4000-8000-00000000a010', '20000000-0000-4000-8000-00000000a010', '(테스트) 1강',
   '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000a010.mp4', 600, now() - interval '1 day'),
  ('30000000-0000-4000-8000-00000000b010', '20000000-0000-4000-8000-00000000a010', '(테스트) 2강',
   '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000b010.mp4', 900, now() + interval '1 day'),
  ('30000000-0000-4000-8000-00000000c010', '20000000-0000-4000-8000-00000000b010', '(테스트) Y 1강',
   '20000000-0000-4000-8000-00000000b010/40000000-0000-4000-8000-00000000c010.mp4', 1200, now() - interval '1 day');

-- ─── 버킷 ────────────────────────────────────────────────────────────
select results_eq($$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'videos'$$,
  $$values (false, 1073741824::bigint, array['video/mp4'])$$,
  'videos 버킷: 비공개, 1 GiB, video/mp4만');

-- ─── 권한 표 (service_role도 명시) ───────────────────────────────────
select table_privs_are('public', 'videos', 'anon', ARRAY[]::text[], 'anon: videos 권한 없음');
select table_privs_are('public', 'video_views', 'anon', ARRAY[]::text[], 'anon: video_views 권한 없음');
select table_privs_are('public', 'videos', 'service_role', ARRAY[]::text[], 'service_role: videos 권한 없음');
select table_privs_are('public', 'video_views', 'service_role', ARRAY[]::text[], 'service_role: video_views 권한 없음');
select table_privs_are('public', 'videos', 'authenticated', ARRAY['DELETE', 'SELECT'],
  'authenticated: videos 테이블 권한은 DELETE·SELECT (insert·update는 컬럼 단위)');
select table_privs_are('public', 'video_views', 'authenticated', ARRAY['SELECT'],
  'authenticated: video_views는 SELECT뿐 (쓰기는 save_video_progress)');
select column_privs_are('public', 'videos', 'storage_path', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: videos.storage_path는 INSERT·SELECT (경로 바꾸기 없음)');
select column_privs_are('public', 'videos', 'class_id', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: videos.class_id는 INSERT·SELECT (반 옮기기 없음)');
select column_privs_are('public', 'videos', 'duration_seconds', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: videos.duration_seconds는 INSERT·SELECT');
select column_privs_are('public', 'videos', 'title', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: videos.title은 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'videos', 'published_at', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: videos.published_at은 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'videos', 'id', 'authenticated', ARRAY['SELECT'],
  'authenticated: videos.id는 읽기만');
select column_privs_are('public', 'video_views', 'watched_seconds', 'authenticated', ARRAY['SELECT'],
  'authenticated: video_views.watched_seconds는 읽기만');
select column_privs_are('public', 'video_views', 'position_seconds', 'authenticated', ARRAY['SELECT'],
  'authenticated: video_views.position_seconds는 읽기만');

-- ─── 함수 모양 ───────────────────────────────────────────────────────
select is_definer('public', 'save_video_progress', ARRAY['uuid', 'integer', 'integer'],
  'save_video_progress는 security definer');
select function_privs_are('public', 'save_video_progress', ARRAY['uuid', 'integer', 'integer'], 'anon',
  ARRAY[]::text[], 'anon: save_video_progress 실행 권한 없음');
select function_privs_are('public', 'save_video_progress', ARRAY['uuid', 'integer', 'integer'], 'service_role',
  ARRAY[]::text[], 'service_role: save_video_progress 실행 권한 없음');
select function_privs_are('public', 'save_video_progress', ARRAY['uuid', 'integer', 'integer'], 'authenticated',
  ARRAY['EXECUTE'], 'authenticated: save_video_progress EXECUTE');
select is_definer('private', 'require_video_object', ARRAY[]::text[],
  'require_video_object는 security definer (storage.objects 정책 없이도 파일을 본다)');
select function_privs_are('private', 'require_video_object', ARRAY[]::text[], 'authenticated',
  ARRAY[]::text[], 'authenticated: require_video_object 실행 권한 없음 (트리거 전용)');

-- ─── 읽기 ────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c010","role":"authenticated","aal":"aal1"}';
select results_eq('select id from public.videos order by id',
  $$values ('30000000-0000-4000-8000-00000000a010'::uuid)$$,
  'A: 자기 반의 공개된 영상 VX1만 (내일 공개 VX2·다른 반 VY1은 안 보인다)');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f010","role":"authenticated","aal":"aal1"}';
select results_eq('select id from public.videos order by id',
  $$values ('30000000-0000-4000-8000-00000000a010'::uuid)$$, 'P(휴원): VX1만');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d010","role":"authenticated","aal":"aal1"}';
select results_eq('select id from public.videos order by id',
  $$values ('30000000-0000-4000-8000-00000000c010'::uuid)$$, 'B: VY1만');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e010","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.videos), 0, '퇴원생 L: videos 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b010","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.videos), 0, '아무나: videos 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a010","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.videos), 0, '원장 aal1: videos 0행');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '(테스트) aal1',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 60)$$,
  '42501', null, '원장 aal1: videos insert는 RLS 에러');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a010","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.videos), 3, '원장 aal2: videos 3행 (공개 전 영상 포함)');

-- ─── 학생 쓰기 ───────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c010","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '(테스트) 학생',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 60)$$,
  '42501', null, 'A: videos insert는 RLS 에러');
select is_empty($$update public.videos set title = '해킹' returning 1$$, 'A: videos update 0행');
select is_empty($$delete from public.videos returning 1$$, 'A: videos delete 0행');
reset role;
select is((select count(*)::int from public.videos where title <> '해킹'), 3,
  'A의 update·delete 뒤에도 영상 3개, 제목 그대로');

-- ─── 원장 aal2 쓰기 ──────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a010","role":"authenticated","aal":"aal2"}';
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '(테스트) 파일 없음',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000e010.mp4', 60)$$,
  'P0001', '영상 파일이 아직 올라가지 않았어요. 파일을 다시 올려 주세요.',
  '원장 aal2: 버킷에 파일이 없는 경로는 거부');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 60)$$,
  '23514', null, '원장 aal2: 빈 제목은 check 위반');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '   ',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 60)$$,
  '23514', null, '원장 aal2: 공백뿐인 제목은 check 위반');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', repeat('가', 101),
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 60)$$,
  '23514', null, '원장 aal2: 101자 제목은 check 위반');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', E'제목\x07',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 60)$$,
  '23514', null, '원장 aal2: 제어 문자(BEL)가 든 제목은 check 위반');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', E'제목\n둘째 줄',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 60)$$,
  '23514', null, '원장 aal2: 줄바꿈이 든 제목도 check 위반');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '(테스트) 0초',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 0)$$,
  '23514', null, '원장 aal2: 길이 0초는 check 위반');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '(테스트) 6시간 넘음',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 21601)$$,
  '23514', null, '원장 aal2: 길이 21601초는 check 위반');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '(테스트) 경로', '../x.mp4', 60)$$,
  '23514', null, '원장 aal2: 형식이 아닌 경로(../x.mp4)는 파일이 있어도 check 위반');
select throws_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', '(테스트) 같은 경로',
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000a010.mp4', 60)$$,
  '23505', null, '원장 aal2: 이미 쓰인 경로는 unique 위반');
select lives_ok($$insert into public.videos (class_id, title, storage_path, duration_seconds)
                   values ('20000000-0000-4000-8000-00000000a010', repeat('가', 100),
                           '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4', 21600)$$,
  '원장 aal2: 100자 제목·21600초 영상 insert 성공');
select throws_ok($$update public.videos
                     set storage_path = '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000b010.mp4'
                   where id = '30000000-0000-4000-8000-00000000a010'$$,
  '42501', null, '원장 aal2: videos.storage_path update는 권한 에러');
select throws_ok($$update public.videos set class_id = '20000000-0000-4000-8000-00000000b010'
                   where id = '30000000-0000-4000-8000-00000000a010'$$,
  '42501', null, '원장 aal2: videos.class_id update는 권한 에러 (반 옮기기 없음)');
select throws_ok($$update public.videos set duration_seconds = 1
                   where id = '30000000-0000-4000-8000-00000000a010'$$,
  '42501', null, '원장 aal2: videos.duration_seconds update는 권한 에러');
select results_eq($$update public.videos set title = '(테스트) 1강 고침', published_at = now() - interval '2 days'
                    where id = '30000000-0000-4000-8000-00000000a010' returning title$$,
  $$values ('(테스트) 1강 고침')$$, '원장 aal2: 제목·공개일 update 성공');
select results_eq($$delete from public.videos
                    where storage_path = '20000000-0000-4000-8000-00000000a010/40000000-0000-4000-8000-00000000d010.mp4'
                    returning char_length(title)$$,
  $$values (100)$$, '원장 aal2: 영상 delete 성공');

-- ─── save_video_progress ─────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c010","role":"authenticated","aal":"aal1"}';
select is(public.save_video_progress('30000000-0000-4000-8000-00000000a010', 100, 100), 100,
  'A: VX1 100초까지 봄 → 100');
select is(public.save_video_progress('30000000-0000-4000-8000-00000000a010', 50, 50), 100,
  'A: 뒤로 돌려 50초 → 시청 위치는 100 그대로');
reset role;
select results_eq($$select position_seconds, watched_seconds from public.video_views
                     where video_id = '30000000-0000-4000-8000-00000000a010'
                       and student_id = '10000000-0000-4000-8000-00000000c010'$$,
  $$values (50, 100)$$, 'A: 이어 보기 위치는 50, 시청 위치는 100');
update public.video_views set updated_at = '2000-01-01';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c010","role":"authenticated","aal":"aal1"}';
select is(public.save_video_progress('30000000-0000-4000-8000-00000000a010', 9999, 9999), 600,
  'A: 길이(600초)를 넘는 값은 600으로 자른다');
reset role;
select results_eq($$select position_seconds, watched_seconds, updated_at > '2000-01-01' from public.video_views
                     where video_id = '30000000-0000-4000-8000-00000000a010'$$,
  $$values (600, 600, true)$$, 'A: 위치 600, 시청 600, updated_at 새로 고침');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c010","role":"authenticated","aal":"aal1"}';
select is(public.save_video_progress('30000000-0000-4000-8000-00000000a010', -5, -5), 600,
  'A: 음수 → 시청 위치 600 그대로');
reset role;
select results_eq($$select position_seconds, watched_seconds from public.video_views
                     where video_id = '30000000-0000-4000-8000-00000000a010'$$,
  $$values (0, 600)$$, 'A: 음수 위치는 0으로 자른다');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c010","role":"authenticated","aal":"aal1"}';
select throws_ok($$select public.save_video_progress('30000000-0000-4000-8000-00000000b010', 10, 10)$$,
  'P0001', '내 반에 공개된 영상만 볼 수 있어요. 목록에서 다시 골라 주세요.', 'A: 공개 전 VX2는 거부');
select throws_ok($$select public.save_video_progress('30000000-0000-4000-8000-00000000c010', 10, 10)$$,
  'P0001', '내 반에 공개된 영상만 볼 수 있어요. 목록에서 다시 골라 주세요.', 'A: 다른 반 VY1은 거부');
select throws_ok($$select public.save_video_progress(gen_random_uuid(), 10, 10)$$,
  'P0001', '내 반에 공개된 영상만 볼 수 있어요. 목록에서 다시 골라 주세요.', 'A: 없는 영상도 같은 문구로 거부');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e010","role":"authenticated","aal":"aal1"}';
select throws_ok($$select public.save_video_progress('30000000-0000-4000-8000-00000000a010', 10, 10)$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '퇴원생 L: 거부');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a010","role":"authenticated","aal":"aal2"}';
select throws_ok($$select public.save_video_progress('30000000-0000-4000-8000-00000000a010', 10, 10)$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '원장 aal2: 거부');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b010","role":"authenticated","aal":"aal2"}';
select throws_ok($$select public.save_video_progress('30000000-0000-4000-8000-00000000a010', 10, 10)$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '아무나: 거부');

-- P(휴원)도 자기 반 공개 영상은 저장된다.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f010","role":"authenticated","aal":"aal1"}';
select is(public.save_video_progress('30000000-0000-4000-8000-00000000a010', 30, 30), 30, 'P(휴원): VX1 저장');

-- ─── video_views 읽기·쓰기 ───────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c010","role":"authenticated","aal":"aal1"}';
select results_eq('select video_id, student_id from public.video_views',
  $$values ('30000000-0000-4000-8000-00000000a010'::uuid, '10000000-0000-4000-8000-00000000c010'::uuid)$$,
  'A: video_views는 자기 행만 (같은 반 P 행은 안 보인다)');
select throws_ok($$insert into public.video_views (video_id, student_id, watched_seconds)
                   values ('30000000-0000-4000-8000-00000000a010', '10000000-0000-4000-8000-00000000c010', 1)$$,
  '42501', null, 'A: video_views 직접 insert는 권한 에러');
select throws_ok($$update public.video_views set watched_seconds = 0$$,
  '42501', null, 'A: video_views 직접 update는 권한 에러');
select throws_ok($$delete from public.video_views$$,
  '42501', null, 'A: video_views 직접 delete는 권한 에러');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d010","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.video_views), 0, 'B: video_views 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e010","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.video_views), 0, '퇴원생 L: video_views 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a010","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.video_views), 0, '원장 aal1: video_views 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a010","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.video_views), 2, '원장 aal2: video_views 2행 (A·P)');

-- ─── anon ────────────────────────────────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from public.videos', '42501', null, 'anon: videos select는 권한 에러');
select throws_ok('select * from public.video_views', '42501', null, 'anon: video_views select는 권한 에러');
select throws_ok($$select public.save_video_progress('30000000-0000-4000-8000-00000000a010', 10, 10)$$,
  '42501', null, 'anon: save_video_progress 실행은 권한 에러');

-- ─── 지우면 시청 기록도 지운다 ───────────────────────────────────────
reset role;
delete from public.videos where id = '30000000-0000-4000-8000-00000000a010';
select is((select count(*)::int from public.video_views), 0, '영상을 지우면 video_views도 지워진다 (cascade)');

-- 학생을 지우면 그 학생의 시청 기록도 지운다.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d010","role":"authenticated","aal":"aal1"}';
select is(public.save_video_progress('30000000-0000-4000-8000-00000000c010', 10, 10), 10, 'B: VY1 저장');
reset role;
delete from public.students where id = '10000000-0000-4000-8000-00000000d010';
select is((select count(*)::int from public.video_views), 0, '학생을 지우면 video_views도 지워진다 (cascade)');

select * from finish();
rollback;
