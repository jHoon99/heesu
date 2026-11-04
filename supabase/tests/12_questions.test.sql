-- questions·answers·Realtime 주제 정책 테스트(설계 13장 S1·S3·S8, v1 스펙 §7). 가짜 데이터만 쓴다.
-- 학생은 자기 질문과 그 답변만 읽고, 질문만 쓴다(student_id는 서버가 정한다). 연결은 내 반 영상·수업만.
-- 답변은 원장(admins + aal2)만 쓰고 고친다. answered_at은 첫 답변 트리거가 채운다.
-- Realtime private 채널: 원장은 questions:admin, 학생은 questions:student:<자기 id>에만 들어간다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(93);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.questions;
delete from public.videos;
delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a012', 'admin12@example.test'),
  ('00000000-0000-4000-8000-00000000c012', 'q_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d012', 'q_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e012', 'q_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b012', 'nobody12@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a012');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c012', '00000000-0000-4000-8000-00000000c012', 'q_a', '가짜질문A', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000d012', '00000000-0000-4000-8000-00000000d012', 'q_b', '가짜질문B', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000e012', '00000000-0000-4000-8000-00000000e012', 'q_l', '가짜질문L', '중3', 'left');

-- 반 X(A·L), Y(B)
insert into public.classes (id, name, level) values
  ('20000000-0000-4000-8000-00000000a012', '가짜 질문반 X', 'middle'),
  ('20000000-0000-4000-8000-00000000b012', '가짜 질문반 Y', 'high');
insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-00000000a012', '10000000-0000-4000-8000-00000000c012'),
  ('20000000-0000-4000-8000-00000000a012', '10000000-0000-4000-8000-00000000e012'),
  ('20000000-0000-4000-8000-00000000b012', '10000000-0000-4000-8000-00000000d012');

-- 영상 행은 버킷에 파일이 있어야 들어간다(실제 업로드 대신 postgres로 행만 넣는다).
insert into storage.objects (bucket_id, name) values
  ('videos', '20000000-0000-4000-8000-00000000a012/40000000-0000-4000-8000-00000000a012.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000a012/40000000-0000-4000-8000-00000000b012.mp4'),
  ('videos', '20000000-0000-4000-8000-00000000b012/40000000-0000-4000-8000-00000000c012.mp4');
-- VX1(X, 어제 공개), VX2(X, 내일 공개), VY1(Y, 어제 공개)
insert into public.videos (id, class_id, title, storage_path, duration_seconds, published_at) values
  ('30000000-0000-4000-8000-00000000a012', '20000000-0000-4000-8000-00000000a012', '(테스트) 1강',
   '20000000-0000-4000-8000-00000000a012/40000000-0000-4000-8000-00000000a012.mp4', 600, now() - interval '1 day'),
  ('30000000-0000-4000-8000-00000000b012', '20000000-0000-4000-8000-00000000a012', '(테스트) 2강',
   '20000000-0000-4000-8000-00000000a012/40000000-0000-4000-8000-00000000b012.mp4', 600, now() + interval '1 day'),
  ('30000000-0000-4000-8000-00000000c012', '20000000-0000-4000-8000-00000000b012', '(테스트) Y 1강',
   '20000000-0000-4000-8000-00000000b012/40000000-0000-4000-8000-00000000c012.mp4', 600, now() - interval '1 day');
-- 수업 SX(X), SY(Y)
insert into public.sessions (id, class_id, date) values
  ('50000000-0000-4000-8000-00000000a012', '20000000-0000-4000-8000-00000000a012', current_date - 1),
  ('50000000-0000-4000-8000-00000000b012', '20000000-0000-4000-8000-00000000b012', current_date - 1);

-- 퇴원 전에 남긴 L의 질문(학생 트리거는 my_student_id()가 있어야 하므로 이 행만 트리거를 끄고 넣는다).
alter table public.questions disable trigger questions_prepare;
insert into public.questions (student_id, body) values ('10000000-0000-4000-8000-00000000e012', '(테스트) L 질문');
alter table public.questions enable trigger questions_prepare;

-- ─── 권한 표 (service_role도 명시) ───────────────────────────────────
select table_privs_are('public', 'questions', 'anon', ARRAY[]::text[], 'anon: questions 권한 없음');
select table_privs_are('public', 'answers', 'anon', ARRAY[]::text[], 'anon: answers 권한 없음');
select table_privs_are('public', 'questions', 'service_role', ARRAY[]::text[], 'service_role: questions 권한 없음');
select table_privs_are('public', 'answers', 'service_role', ARRAY[]::text[], 'service_role: answers 권한 없음');
select table_privs_are('public', 'questions', 'authenticated', ARRAY['SELECT'],
  'authenticated: questions 테이블 권한은 SELECT뿐 (insert는 컬럼 단위, update·delete 없음)');
select column_privs_are('public', 'questions', 'body', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: questions.body는 INSERT·SELECT');
select column_privs_are('public', 'questions', 'video_id', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: questions.video_id는 INSERT·SELECT');
select column_privs_are('public', 'questions', 'session_id', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: questions.session_id는 INSERT·SELECT');
select column_privs_are('public', 'questions', 'student_id', 'authenticated', ARRAY['SELECT'],
  'authenticated: questions.student_id는 읽기만 (서버가 정한다)');
select column_privs_are('public', 'questions', 'answered_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: questions.answered_at은 읽기만 (답변 트리거가 정한다)');
select column_privs_are('public', 'questions', 'created_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: questions.created_at은 읽기만');
select table_privs_are('public', 'answers', 'authenticated', ARRAY['SELECT'],
  'authenticated: answers 테이블 권한은 SELECT뿐 (insert·update는 컬럼 단위, delete 없음)');
select column_privs_are('public', 'answers', 'body', 'authenticated', ARRAY['INSERT', 'SELECT', 'UPDATE'],
  'authenticated: answers.body는 INSERT·SELECT·UPDATE');
select column_privs_are('public', 'answers', 'question_id', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: answers.question_id는 INSERT·SELECT (다른 질문으로 옮기기 없음)');

-- ─── 함수 모양 ───────────────────────────────────────────────────────
select function_privs_are('private', 'can_join_question_topic', ARRAY['text'], 'authenticated',
  ARRAY['EXECUTE'], 'authenticated: can_join_question_topic EXECUTE (realtime.messages 정책용)');
select function_privs_are('private', 'can_join_question_topic', ARRAY['text'], 'service_role',
  ARRAY[]::text[], 'service_role: can_join_question_topic 실행 권한 없음');
select isnt_definer('private', 'can_join_question_topic', ARRAY['text'],
  'can_join_question_topic은 security invoker');
select isnt_definer('private', 'prepare_question', ARRAY[]::text[],
  'prepare_question은 security invoker (학생 권한으로 영상·수업을 본다)');
select is_definer('private', 'mark_question_answered', ARRAY[]::text[],
  'mark_question_answered는 security definer (원장에게 questions update 권한이 없다)');
select function_privs_are('private', 'prepare_question', ARRAY[]::text[], 'authenticated',
  ARRAY[]::text[], 'authenticated: prepare_question 실행 권한 없음 (트리거 전용)');
select function_privs_are('private', 'mark_question_answered', ARRAY[]::text[], 'authenticated',
  ARRAY[]::text[], 'authenticated: mark_question_answered 실행 권한 없음 (트리거 전용)');

-- ─── 학생 A 질문 쓰기 ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c012","role":"authenticated","aal":"aal1"}';
select lives_ok($$insert into public.questions (body) values ('(테스트) A 질문')$$, 'A: 본문만으로 질문 insert 성공');
select throws_ok($$insert into public.questions (student_id, body)
                   values ('10000000-0000-4000-8000-00000000d012', '(테스트) 남의 이름')$$,
  '42501', null, 'A: student_id를 보내면 권한 에러');
select throws_ok($$insert into public.questions (body, answered_at) values ('(테스트) 답변됨', now())$$,
  '42501', null, 'A: answered_at을 보내면 권한 에러');
select lives_ok($$insert into public.questions (body, video_id)
                  values ('(테스트) A 영상 질문', '30000000-0000-4000-8000-00000000a012')$$,
  'A: 내 반 공개 영상(VX1)에 연결한 질문 성공');
select lives_ok($$insert into public.questions (body, session_id)
                  values ('(테스트) A 수업 질문', '50000000-0000-4000-8000-00000000a012')$$,
  'A: 내 반 수업(SX)에 연결한 질문 성공');
select throws_ok($$insert into public.questions (body, video_id)
                   values ('(테스트) 공개 전', '30000000-0000-4000-8000-00000000b012')$$,
  'P0001', '내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.', 'A: 공개 전 영상(VX2) 연결은 거부');
select throws_ok($$insert into public.questions (body, video_id)
                   values ('(테스트) 다른 반 영상', '30000000-0000-4000-8000-00000000c012')$$,
  'P0001', '내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.', 'A: 다른 반 영상(VY1) 연결은 거부');
select throws_ok($$insert into public.questions (body, video_id)
                   values ('(테스트) 없는 영상', '30000000-0000-4000-8000-00000000f012')$$,
  'P0001', '내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.', 'A: 없는 영상 연결도 같은 문구로 거부');
select throws_ok($$insert into public.questions (body, session_id)
                   values ('(테스트) 다른 반 수업', '50000000-0000-4000-8000-00000000b012')$$,
  'P0001', '내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.', 'A: 다른 반 수업(SY) 연결은 거부');
select throws_ok($$insert into public.questions (body, session_id)
                   values ('(테스트) 없는 수업', '50000000-0000-4000-8000-00000000f012')$$,
  'P0001', '내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.', 'A: 없는 수업 연결도 같은 문구로 거부');
select throws_ok($$insert into public.questions (body, video_id, session_id)
                   values ('(테스트) 둘 다', '30000000-0000-4000-8000-00000000a012', '50000000-0000-4000-8000-00000000a012')$$,
  '23514', null, 'A: 영상과 수업을 둘 다 연결하면 check 위반');
select throws_ok($$insert into public.questions (body) values ('')$$, '23514', null, 'A: 빈 본문은 check 위반');
select throws_ok($$insert into public.questions (body) values ('   ')$$, '23514', null, 'A: 공백뿐인 본문은 check 위반');
select throws_ok($$insert into public.questions (body) values (repeat('가', 2001))$$,
  '23514', null, 'A: 2001자 본문은 check 위반');
select throws_ok($$insert into public.questions (body) values (E'질문\x07')$$,
  '23514', null, 'A: 제어 문자(BEL)가 든 본문은 check 위반');
select lives_ok($$insert into public.questions (body) values (repeat('가', 2000))$$, 'A: 2000자 본문 성공');
select lives_ok($$insert into public.questions (body) values (E'첫 줄\n둘째 줄\t탭')$$, 'A: 줄바꿈·탭이 든 본문 성공');
select throws_ok($$update public.questions set body = '고침'$$, '42501', null, 'A: questions update는 권한 에러');
select throws_ok($$delete from public.questions$$, '42501', null, 'A: questions delete는 권한 에러');
reset role;

select results_eq($$select student_id, answered_at is null from public.questions where body = '(테스트) A 질문'$$,
  $$values ('10000000-0000-4000-8000-00000000c012'::uuid, true)$$,
  'A 질문: student_id는 A(서버가 정함), answered_at은 비어 있다');
select is((select count(*)::int from public.questions where student_id = '10000000-0000-4000-8000-00000000c012'), 5,
  'A 질문 5개 (본문·영상·수업·2000자·여러 줄)');

-- ─── 학생이 아닌 사람의 질문 쓰기 ────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e012","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into public.questions (body) values ('(테스트) 퇴원생')$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '퇴원생 L: 질문 insert 거부');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal2"}';
select throws_ok($$insert into public.questions (body) values ('(테스트) 원장')$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '원장 aal2: 질문 insert 거부');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b012","role":"authenticated","aal":"aal2"}';
select throws_ok($$insert into public.questions (body) values ('(테스트) 아무나')$$,
  'P0001', '학생 계정으로 로그인해 주세요.', '아무나: 질문 insert 거부');

-- B의 질문 하나
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d012","role":"authenticated","aal":"aal1"}';
select lives_ok($$insert into public.questions (body, session_id)
                  values ('(테스트) B 질문', '50000000-0000-4000-8000-00000000b012')$$, 'B: 내 반 수업 질문 성공');

-- ─── 질문 읽기 ───────────────────────────────────────────────────────
select results_eq('select body from public.questions', $$values ('(테스트) B 질문')$$,
  'B: 자기 질문만 (A·L 질문은 안 보인다)');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c012","role":"authenticated","aal":"aal1"}';
select results_eq($$select count(*)::int, count(*) filter (where student_id = '10000000-0000-4000-8000-00000000c012')::int
                    from public.questions$$,
  $$values (5, 5)$$, 'A: 자기 질문 5개만');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e012","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.questions), 0, '퇴원생 L: 자기 옛 질문도 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b012","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.questions), 0, '아무나: questions 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.questions), 0, '원장 aal1: questions 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.questions), 7, '원장 aal2: questions 전부 7행');
select throws_ok($$update public.questions set answered_at = now()$$, '42501', null,
  '원장 aal2: questions update는 권한 에러 (answered_at은 트리거만)');
reset role;
set local role anon;
select throws_ok('select 1 from public.questions', '42501', null, 'anon: questions select는 권한 에러');
select throws_ok('select 1 from public.answers', '42501', null, 'anon: answers select는 권한 에러');
reset role;

-- ─── 답변 ────────────────────────────────────────────────────────────
-- 원장 aal1에게는 질문이 안 보이므로 A 질문 id를 미리 꺼내 둔다.
do $$ begin
  perform set_config('test.qa', (select id::text from public.questions where body = '(테스트) A 질문'), true);
end $$;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal1"}';
select throws_ok($$insert into public.answers (question_id, body)
                   values (current_setting('test.qa')::uuid, '(테스트) aal1 답변')$$,
  '42501', null, '원장 aal1: 답변 insert는 RLS 에러');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.answers (question_id, body)
                  select id, '(테스트) 첫 답변' from public.questions where body = '(테스트) A 질문'$$,
  '원장 aal2: A 질문에 답변 insert 성공');
select is((select answered_at is not null from public.questions where body = '(테스트) A 질문'), true,
  '첫 답변 뒤 A 질문 answered_at이 채워진다');
select throws_ok($$insert into public.answers (question_id, body)
                   select id, repeat('가', 2001) from public.questions where body = '(테스트) A 질문'$$,
  '23514', null, '원장 aal2: 2001자 답변은 check 위반');
select throws_ok($$insert into public.answers (question_id, body)
                   select id, E'답변\x07' from public.questions where body = '(테스트) A 질문'$$,
  '23514', null, '원장 aal2: 제어 문자가 든 답변은 check 위반');
select throws_ok($$insert into public.answers (question_id, body)
                   select id, '   ' from public.questions where body = '(테스트) A 질문'$$,
  '23514', null, '원장 aal2: 공백뿐인 답변은 check 위반');
select throws_ok($$delete from public.answers$$, '42501', null, '원장 aal2: answers delete는 권한 에러');

-- 학생
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c012","role":"authenticated","aal":"aal1"}';
select results_eq('select body from public.answers', $$values ('(테스트) 첫 답변')$$, 'A: 자기 질문의 답변 1행');
select throws_ok($$insert into public.answers (question_id, body)
                   select id, '(테스트) 셀프 답변' from public.questions where body = '(테스트) A 질문'$$,
  '42501', null, 'A: 답변 insert는 RLS 에러');
select is_empty($$update public.answers set body = '해킹' returning 1$$, 'A: answers update 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d012","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.answers), 0, 'B: A 질문의 답변 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b012","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.answers), 0, '아무나: answers 0행');

-- 원장 고치기
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal2"}';
select results_eq($$update public.answers set body = '(테스트) 고친 답변' returning body$$,
  $$values ('(테스트) 고친 답변')$$, '원장 aal2: answers update 1행');
reset role;

-- 두 번째 답변은 answered_at을 바꾸지 않는다(한 트랜잭션 안에서는 now()가 같아서, 먼저 알아볼 수 있는 값으로 바꿔 둔다).
update public.questions set answered_at = '2026-01-01T00:00:00+09:00' where body = '(테스트) A 질문';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into public.answers (question_id, body)
                  select id, '(테스트) 두 번째 답변' from public.questions where body = '(테스트) A 질문'$$,
  '원장 aal2: 두 번째 답변 insert 성공');
reset role;
select is((select answered_at from public.questions where body = '(테스트) A 질문'),
  '2026-01-01T00:00:00+09:00'::timestamptz, '두 번째 답변 뒤에도 answered_at은 첫 답변 시각 그대로');
select is((select count(*)::int from public.questions where answered_at is null), 6, '답변 없는 질문 6개는 미답변 그대로');

-- ─── 주제 함수 ───────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c012","role":"authenticated","aal":"aal1"}';
select is(private.can_join_question_topic('questions:student:10000000-0000-4000-8000-00000000c012'), true,
  'A: 자기 주제 참여 가능');
select is(private.can_join_question_topic('questions:student:10000000-0000-4000-8000-00000000d012'), false,
  'A: B 주제 참여 불가');
select is(private.can_join_question_topic('questions:admin'), false, 'A: 원장 주제 참여 불가');
select is(private.can_join_question_topic(null), false, 'A: 주제가 없으면 불가');
select is(private.can_join_question_topic('questions:student:10000000-0000-4000-8000-00000000c012x'), false,
  'A: 자기 id 뒤에 글자가 붙은 주제는 불가');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal2"}';
select is(private.can_join_question_topic('questions:admin'), true, '원장 aal2: 원장 주제 참여 가능');
select is(private.can_join_question_topic('questions:student:10000000-0000-4000-8000-00000000c012'), false,
  '원장 aal2: 학생 주제 참여 불가 (원장 주제 하나로 받는다)');
select is(private.can_join_question_topic(null), false, '원장 aal2: 주제가 없으면 불가');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal1"}';
select is(private.can_join_question_topic('questions:admin'), false, '원장 aal1: 원장 주제 참여 불가');
select is(private.can_join_question_topic('questions:student:10000000-0000-4000-8000-00000000c012'), false,
  '원장 aal1: 학생 주제 참여 불가');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b012","role":"authenticated","aal":"aal2"}';
select is(private.can_join_question_topic('questions:admin'), false, '아무나: 원장 주제 참여 불가');
select is(private.can_join_question_topic('questions:student:10000000-0000-4000-8000-00000000c012'), false,
  '아무나: 학생 주제 참여 불가');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e012","role":"authenticated","aal":"aal1"}';
select is(private.can_join_question_topic('questions:student:10000000-0000-4000-8000-00000000e012'), false,
  '퇴원생 L: 자기 주제도 참여 불가');
select is(private.can_join_question_topic('questions:admin'), false, '퇴원생 L: 원장 주제 참여 불가');
reset role;

-- ─── realtime.messages 정책 ──────────────────────────────────────────
select policies_are('realtime', 'messages', ARRAY['question_topics_select'],
  'realtime.messages 정책은 question_topics_select 하나 (insert 정책 없음: 아무도 broadcast 못 한다)');
select policy_cmd_is('realtime', 'messages', 'question_topics_select', 'SELECT', 'question_topics_select는 SELECT');
select policy_roles_are('realtime', 'messages', 'question_topics_select', ARRAY['authenticated'],
  'question_topics_select는 authenticated에만');

-- Realtime이 private 채널 참여를 판단하는 방식대로(realtime.topic 설정 + select) 정책을 직접 확인한다.
-- 그날의 파티션은 Realtime 서비스가 만든다. 없으면 이 다섯 검사는 건너뛴다.
do $$
begin
  insert into realtime.messages (topic, extension, private) values ('questions:probe', 'broadcast', true);
  perform set_config('test.has_partition', 'true', true);
exception when check_violation then
  perform set_config('test.has_partition', 'false', true);
end;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c012","role":"authenticated","aal":"aal1"}';
set local realtime.topic = 'questions:student:10000000-0000-4000-8000-00000000c012';
select case when current_setting('test.has_partition') = 'true'
  then ok((select count(*) from realtime.messages) > 0, 'realtime: A는 자기 주제에서 messages를 읽는다')
  else skip('realtime.messages 오늘 파티션 없음', 1) end;
set local realtime.topic = 'questions:student:10000000-0000-4000-8000-00000000d012';
select case when current_setting('test.has_partition') = 'true'
  then is((select count(*)::int from realtime.messages), 0, 'realtime: A는 B 주제에서 0행')
  else skip('realtime.messages 오늘 파티션 없음', 1) end;
set local realtime.topic = 'questions:admin';
select case when current_setting('test.has_partition') = 'true'
  then is((select count(*)::int from realtime.messages), 0, 'realtime: A는 원장 주제에서 0행')
  else skip('realtime.messages 오늘 파티션 없음', 1) end;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a012","role":"authenticated","aal":"aal2"}';
select case when current_setting('test.has_partition') = 'true'
  then ok((select count(*) from realtime.messages) > 0, 'realtime: 원장 aal2는 원장 주제에서 messages를 읽는다')
  else skip('realtime.messages 오늘 파티션 없음', 1) end;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c012","role":"authenticated","aal":"aal1"}';
set local realtime.topic = 'questions:student:10000000-0000-4000-8000-00000000c012';
select case when current_setting('test.has_partition') = 'true'
  then throws_ok($$insert into realtime.messages (topic, extension, private)
                   values ('questions:student:10000000-0000-4000-8000-00000000c012', 'broadcast', true)$$,
    '42501', null, 'realtime: A는 자기 주제에도 broadcast(insert) 못 한다')
  else skip('realtime.messages 오늘 파티션 없음', 1) end;
reset role;

select * from finish();
rollback;
