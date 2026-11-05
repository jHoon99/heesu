-- 학생 앱 2단계 테스트: 영상 학교 꼬리표(내신 강의실)·학습 자료실·점수 기준 자동 재시험·학부모 화면 테스트·클리닉.
-- 가짜 데이터만 쓴다. 학생은 자기 반 자료·자기 반/자기 학교 영상만, 쓰기는 원장(admins + aal2)만.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(59);

delete from public.videos;
delete from public.materials;
delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a020', 'admin20@example.test'),
  ('00000000-0000-4000-8000-00000000c020', 'app_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d020', 'app_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e020', 'app_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000f020', 'app_n@student.heesu.internal');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a020');
-- A: 반 X, 다른학교 / B: 반 Y, 양현고 / L: 반 Y 퇴원, 양현고 / N: 반 없음, 학교 없음
insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c020', '00000000-0000-4000-8000-00000000c020', 'app_a', '가짜앱A', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000d020', '00000000-0000-4000-8000-00000000d020', 'app_b', '가짜앱B', '고1', 'paused'),
  ('10000000-0000-4000-8000-00000000e020', '00000000-0000-4000-8000-00000000e020', 'app_l', '가짜앱L', '고1', 'left'),
  ('10000000-0000-4000-8000-00000000f020', '00000000-0000-4000-8000-00000000f020', 'app_n', '가짜앱N', '고1', 'active');
insert into public.student_private (student_id, school) values
  ('10000000-0000-4000-8000-00000000c020', '(가짜)다른고'),
  ('10000000-0000-4000-8000-00000000d020', ' (가짜)양현고 '),
  ('10000000-0000-4000-8000-00000000e020', '(가짜)양현고');
insert into public.classes (id, name, level) values
  ('20000000-0000-4000-8000-00000000a020', '가짜 앱반 X', 'high'),
  ('20000000-0000-4000-8000-00000000b020', '가짜 앱반 Y', 'high');
insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-00000000a020', '10000000-0000-4000-8000-00000000c020'),
  ('20000000-0000-4000-8000-00000000b020', '10000000-0000-4000-8000-00000000d020'),
  ('20000000-0000-4000-8000-00000000b020', '10000000-0000-4000-8000-00000000e020');

-- 영상 X1(반 X, 꼬리표 없음), X2(반 X, 꼬리표 '(가짜)양현고'). 파일은 미리 올려 둔다.
insert into storage.objects (bucket_id, name) values
  ('videos', '20000000-0000-4000-8000-00000000a020/40000000-0000-4000-8000-00000000a020.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000a020/40000000-0000-4000-8000-00000000b020.mp4'),
  ('materials', '20000000-0000-4000-8000-00000000a020/50000000-0000-4000-8000-00000000a020.pdf');
insert into public.videos (id, class_id, title, storage_path, duration_seconds, published_at, school) values
  ('40000000-0000-4000-8000-00000000a020', '20000000-0000-4000-8000-00000000a020', '(가짜) 수업', '20000000-0000-4000-8000-00000000a020/40000000-0000-4000-8000-00000000a020.mp4', 600, now() - interval '1 hour', null),
  ('40000000-0000-4000-8000-00000000b020', '20000000-0000-4000-8000-00000000a020', '(가짜) 양현고 내신', '20000000-0000-4000-8000-00000000a020/40000000-0000-4000-8000-00000000b020.mp4', 600, now() - interval '1 hour', '(가짜)양현고');

-- ─── 꼬리표 형식 ─────────────────────────────────────────────────────
select throws_ok($$update public.videos set school = E'a\nb' where id = '40000000-0000-4000-8000-00000000a020'$$, '23514', null, '꼬리표 줄바꿈 거부');
select throws_ok($$update public.videos set school = '  ' where id = '40000000-0000-4000-8000-00000000a020'$$, '23514', null, '꼬리표 빈칸 거부');
select column_privs_are('public', 'videos', 'school', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'], '꼬리표는 원장 화면에서 넣고 고친다');

-- ─── 학생 A(반 X, 다른 학교) ─────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c020","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.videos), 2, '학생 A: 자기 반 영상 2개(꼬리표 상관없이)');
select is(private.my_school(), '(가짜)다른고', '학생 A: my_school = 내 학교(소문자·공백 정리)');
reset role;

-- ─── 학생 B(반 Y, 양현고) ────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d020","role":"authenticated","aal":"aal1"}';
select is((select array_agg(title) from public.videos), ARRAY['(가짜) 양현고 내신'], '학생 B: 다른 반이어도 내 학교 꼬리표 영상만 보인다');
select is((select count(*)::int from storage.objects where bucket_id = 'videos'), 1, '학생 B: 파일도 꼬리표 영상 것만');
select lives_ok($$select public.save_video_progress('40000000-0000-4000-8000-00000000b020', 10, 10)$$, '학생 B: 꼬리표 영상 시청 저장');
select throws_ok($$select public.save_video_progress('40000000-0000-4000-8000-00000000a020', 10, 10)$$, 'P0001',
  '내 반에 공개된 영상만 볼 수 있어요. 목록에서 다시 골라 주세요.', '학생 B: 꼬리표 없는 다른 반 영상 시청 저장 거부');
select is((select count(*)::int from public.student_private), 0, '학생 B: 학교 정보 테이블은 여전히 0행');
reset role;

-- 퇴원생 L(양현고) · 학교 없는 N
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e020","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.videos), 0, '퇴원생: 내 학교 꼬리표 영상도 0개');
select is(private.my_school(), null, '퇴원생: my_school = null');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f020","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.videos), 0, '학교·반 없는 학생: 0개');
reset role;

-- ─── 학습 자료실 ─────────────────────────────────────────────────────
select is((select row(public, file_size_limit)::text from storage.buckets where id = 'materials'), '(f,20971520)',
  'materials 버킷: 비공개, 20 MiB');
select ok((select allowed_mime_types @> array['application/pdf', 'application/x-hwp', 'application/vnd.hancom.hwpx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png']
  from storage.buckets where id = 'materials'), 'materials 버킷: PDF·한글·워드·이미지');
select ok(not (select allowed_mime_types @> array['video/mp4'] from storage.buckets where id = 'materials'), 'materials 버킷: 영상은 안 받는다');
select table_privs_are('public', 'materials', 'anon', ARRAY[]::text[], 'anon: materials 권한 없음');
select table_privs_are('public', 'materials', 'authenticated', ARRAY['DELETE', 'SELECT'], 'authenticated: select·delete + 컬럼 insert');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a020","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.materials (class_id, title, file_name, storage_path, size_bytes)
  values ('20000000-0000-4000-8000-00000000a020', '(가짜) 1과 프린트', '1과.pdf',
          '20000000-0000-4000-8000-00000000a020/50000000-0000-4000-8000-00000000a020.pdf', 1000)$$, '원장: 자료 등록');
select throws_ok($$insert into public.materials (class_id, title, file_name, storage_path, size_bytes)
  values ('20000000-0000-4000-8000-00000000a020', '(가짜)', 'x.pdf',
          '20000000-0000-4000-8000-00000000a020/50000000-0000-4000-8000-00000000b020.pdf', 1000)$$, 'P0001',
  '자료 파일이 아직 올라가지 않았어요. 파일을 다시 올려 주세요.', '원장: 파일 없는 자료는 거부');
reset role;
-- 형식 검사(파일 존재 트리거는 원장일 때만 돈다: 여기서는 원장 아닌 마이그레이션 역할로 제약만 본다)
set local request.jwt.claims = '{}';
select throws_ok($$insert into public.materials (class_id, title, file_name, storage_path, size_bytes)
  values ('20000000-0000-4000-8000-00000000a020', '(가짜)', 'x.exe',
          '20000000-0000-4000-8000-00000000a020/50000000-0000-4000-8000-00000000c020.exe', 1000)$$, '23514', null, '실행 파일 경로 거부');
select throws_ok($$insert into public.materials (class_id, title, file_name, storage_path, size_bytes)
  values ('20000000-0000-4000-8000-00000000a020', '(가짜)', 'x.pdf',
          '20000000-0000-4000-8000-00000000a020/50000000-0000-4000-8000-00000000c020.pdf', 20971521)$$, '23514', null, '20 MiB 초과 거부');
select throws_ok($$insert into public.materials (class_id, title, file_name, storage_path, size_bytes)
  values ('20000000-0000-4000-8000-00000000a020', E'(가짜)\n', 'x.pdf',
          '20000000-0000-4000-8000-00000000a020/50000000-0000-4000-8000-00000000c020.pdf', 1)$$, '23514', null, '제목 줄바꿈 거부');
select throws_ok($$insert into public.materials (class_id, title, file_name, storage_path, size_bytes)
  values ('20000000-0000-4000-8000-00000000a020', '(가짜)', '../x.pdf',
          '20000000-0000-4000-8000-00000000a020/50000000-0000-4000-8000-00000000c020.pdf', 1)$$, '23514', null, '파일 이름 / 거부');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c020","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.materials), 1, '학생 A(반 X): 자료 1개');
select is((select count(*)::int from storage.objects where bucket_id = 'materials'), 1, '학생 A: 자료 파일도 보인다');
select throws_ok($$insert into public.materials (class_id, title, file_name, storage_path, size_bytes)
  values ('20000000-0000-4000-8000-00000000a020', '(가짜)', 'x.pdf',
          '20000000-0000-4000-8000-00000000a020/50000000-0000-4000-8000-00000000a020.pdf', 1)$$, '42501', null, '학생: 자료 insert는 RLS 에러');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('materials', '20000000-0000-4000-8000-00000000a020/x.pdf')$$,
  '42501', null, '학생: 자료 파일 올리기는 RLS 에러');
select lives_ok($$delete from public.materials$$, '학생: 자료 delete는 에러 없이 0행');
reset role;
select is((select count(*)::int from public.materials), 1, '학생: 자료 원본 그대로');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d020","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.materials), 0, '학생 B(반 Y): 다른 반 자료 0개');
select is((select count(*)::int from storage.objects where bucket_id = 'materials'), 0, '학생 B: 다른 반 자료 파일 0개');
reset role;

-- 퇴원생은 반 X에 넣어 봐도 0행
insert into public.class_members (class_id, student_id) values ('20000000-0000-4000-8000-00000000a020', '10000000-0000-4000-8000-00000000e020');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e020","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.materials), 0, '퇴원생: 자기 반 자료도 0개');
select is((select count(*)::int from storage.objects where bucket_id = 'materials'), 0, '퇴원생: 자료 파일 0개');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select * from public.materials$$, '42501', null, 'anon: materials select는 권한 에러');
select is((select count(*)::int from storage.objects where bucket_id = 'materials'), 0, 'anon: 자료 파일 0개');
reset role;

-- ─── 점수 기준 자동 재시험 ───────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a020","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score, pass_score)
  values ('10000000-0000-4000-8000-00000000c020', current_date, 'word', '(가짜) Day 1', 12, 20, 16)$$,
  '원장: 기준 미달 단어 테스트');
select is((select kind::text || ':' || status::text || ':' || memo from public.clinic_items
            where test_result_id = (select id from public.test_results where title = '(가짜) Day 1')),
  'word_retest:open:(가짜) Day 1 12/20점 (기준 16점)', '트리거: 단어 재시험이 메모와 함께 생긴다');
select lives_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score, pass_score)
  values ('10000000-0000-4000-8000-00000000c020', current_date, 'grammar', '(가짜) 시제', 5, 10, 8)$$,
  '원장: 기준 미달 문법 테스트');
select is((select kind::text from public.clinic_items
            where test_result_id = (select id from public.test_results where title = '(가짜) 시제')),
  'concept_review', '트리거: 문법 테스트 미달은 개념 보완');
select lives_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score, pass_score)
  values ('10000000-0000-4000-8000-00000000c020', current_date, 'word', '(가짜) Day 2', 16, 20, 16)$$, '원장: 기준과 같은 점수');
select lives_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000c020', current_date, 'word', '(가짜) Day 3', 0, 20)$$, '원장: 기준 없는 테스트');
select is((select count(*)::int from public.clinic_items), 2, '트리거: 기준 이상·기준 없음은 클리닉 없음(2행뿐)');
select throws_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score, pass_score)
  values ('10000000-0000-4000-8000-00000000c020', current_date, 'word', '(가짜)', 1, 20, 21)$$, '23514', null, '기준 > 만점 거부');
select is((select test_date from public.clinic_board
            where test_result_id = (select id from public.test_results where title = '(가짜) Day 1')), current_date,
  'clinic_board: 테스트 날짜가 붙는다');

-- 문법 재시험은 끝내고, 테스트 둘 다 지우면: 안 끝낸 단어 재시험은 사라지고 끝낸 것은 남는다.
select lives_ok($$update public.clinic_items set status = 'done'
  where test_result_id = (select id from public.test_results where title = '(가짜) 시제')$$, '원장: 개념 보완 끝냄');
select lives_ok($$delete from public.test_results where title in ('(가짜) Day 1', '(가짜) 시제')$$, '원장: 테스트 삭제');
select is((select array_agg(kind::text || ':' || status::text || ':' || coalesce(test_result_id::text, 'null')) from public.clinic_items),
  ARRAY['concept_review:done:null'], '테스트 삭제: 안 끝낸 재시험은 지워지고 끝낸 것은 연결만 끊긴다');
select lives_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score, pass_score, memo)
  values ('10000000-0000-4000-8000-00000000c020', current_date, 'word', '(가짜) Day 4', 10, 20, 16, '(가짜) 원장 메모')$$, '원장: 다시 미달');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c020","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.clinic_items), 2, '학생 A: 자기 클리닉 2행(끝낸 1 + 새 재시험 1)');
select throws_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score, pass_score)
  values ('10000000-0000-4000-8000-00000000c020', current_date, 'word', '(가짜)', 0, 20, 16)$$, '42501', null, '학생: 테스트 insert는 RLS 에러(재시험 경로 없음)');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d020","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.clinic_items), 0, '학생 B: 학생 A 클리닉 0행');
select is((select count(*)::int from public.test_results), 0, '학생 B: 학생 A 테스트 0행');
reset role;

-- ─── 학부모 화면 ─────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a020","role":"authenticated","aal":"aal2"}';
select set_config('test.tok', public.issue_guardian_token('10000000-0000-4000-8000-00000000c020'), true);
select set_config('test.tokb', public.issue_guardian_token('10000000-0000-4000-8000-00000000d020'), true);
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select set_config('request.method', 'POST', true);
select set_config('test.view', public.guardian_view(current_setting('test.tok'))::text, true);
select is(jsonb_array_length(current_setting('test.view')::jsonb -> 'tests'), 3, '학부모 A: 최근 테스트 3개(남은 Day 2·3·4)');
select is((current_setting('test.view')::jsonb -> 'tests' -> 0) ? 'memo', false, '학부모: 테스트 메모는 안 보낸다');
select is((select array_agg(e ->> 'status' order by e ->> 'status') from jsonb_array_elements(current_setting('test.view')::jsonb -> 'clinic') e),
  ARRAY['done', 'open'], '학부모 A: 클리닉 안 끝낸 것 + 최근 끝낸 것');
select is((select count(*)::int from jsonb_array_elements(current_setting('test.view')::jsonb -> 'clinic') e where e ? 'memo'), 0,
  '학부모: 클리닉 메모는 안 보낸다');
select set_config('test.viewb', public.guardian_view(current_setting('test.tokb'))::text, true);
select is(current_setting('test.viewb')::jsonb -> 'tests', '[]'::jsonb, '학부모 B: 다른 학생 테스트는 없다');
select is(current_setting('test.viewb')::jsonb -> 'clinic', '[]'::jsonb, '학부모 B: 다른 학생 클리닉은 없다');
reset role;

select * from finish();
rollback;
