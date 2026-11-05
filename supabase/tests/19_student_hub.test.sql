-- 학생 허브 테스트: lesson_notes·clinic_items·clinic_board·test_results·counsel_notes(설계 13장 S1·S3·S12). 가짜 데이터만 쓴다.
-- 쓰기는 원장(admins + aal2)만. 학생은 자기 테스트·클리닉만 읽고, 수업 메모·상담 기록은 못 본다.
-- 수업 메모 체크 → 클리닉 행 자동 추가·해제는 트리거가 보장한다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(83);

delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;
delete from private.audit_log where table_name = 'public.counsel_notes';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a019', 'admin19@example.test'),
  ('00000000-0000-4000-8000-00000000c019', 'hub_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d019', 'hub_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000e019', 'hub_l@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b019', 'nobody19@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a019');
insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c019', '00000000-0000-4000-8000-00000000c019', 'hub_a', '가짜허브A', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000d019', '00000000-0000-4000-8000-00000000d019', 'hub_b', '가짜허브B', '고1', 'active'),
  ('10000000-0000-4000-8000-00000000e019', '00000000-0000-4000-8000-00000000e019', 'hub_l', '가짜허브L', '고1', 'left');
-- 반 X(A·B·L), Y(아무도 없음)
insert into public.classes (id, name, level) values
  ('20000000-0000-4000-8000-00000000a019', '가짜 허브반 X', 'high'),
  ('20000000-0000-4000-8000-00000000b019', '가짜 허브반 Y', 'high');
insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000c019'),
  ('20000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000d019'),
  ('20000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000e019');
insert into public.sessions (id, class_id, date) values
  ('30000000-0000-4000-8000-00000000a019', '20000000-0000-4000-8000-00000000a019', '2026-11-05'),
  ('30000000-0000-4000-8000-00000000b019', '20000000-0000-4000-8000-00000000b019', '2026-11-05');

-- ─── 권한 ───────────────────────────────────────────────────────────
select table_privs_are('public', 'lesson_notes', 'anon', ARRAY[]::text[], 'anon: lesson_notes 권한 없음');
select table_privs_are('public', 'clinic_items', 'anon', ARRAY[]::text[], 'anon: clinic_items 권한 없음');
select table_privs_are('public', 'clinic_board', 'anon', ARRAY[]::text[], 'anon: clinic_board 권한 없음');
select table_privs_are('public', 'test_results', 'anon', ARRAY[]::text[], 'anon: test_results 권한 없음');
select table_privs_are('public', 'counsel_notes', 'anon', ARRAY[]::text[], 'anon: counsel_notes 권한 없음');
select table_privs_are('public', 'lesson_notes', 'service_role', ARRAY[]::text[], 'service_role: lesson_notes 권한 없음');
select table_privs_are('public', 'counsel_notes', 'service_role', ARRAY[]::text[], 'service_role: counsel_notes 권한 없음');
select table_privs_are('public', 'clinic_items', 'authenticated', ARRAY['DELETE', 'SELECT'],
  'authenticated: clinic_items 테이블 권한은 select·delete (insert·update는 컬럼 단위)');
select column_privs_are('public', 'clinic_items', 'done_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: done_at은 select만(트리거가 쓴다)');
select column_privs_are('public', 'clinic_items', 'student_id', 'authenticated', ARRAY['INSERT', 'SELECT'],
  'authenticated: clinic_items.student_id는 바꿀 수 없다');
select table_privs_are('public', 'test_results', 'authenticated', ARRAY['DELETE', 'SELECT'],
  'authenticated: test_results는 select·delete + 컬럼 insert(수정 없음)');
select table_privs_are('public', 'counsel_notes', 'authenticated', ARRAY['DELETE', 'SELECT'],
  'authenticated: counsel_notes는 select·delete + 컬럼 insert(수정 없음)');
select table_privs_are('public', 'clinic_board', 'authenticated', ARRAY['SELECT'], 'authenticated: clinic_board select만');

-- ─── 원장 aal2: 수업 메모 → 클리닉 ──────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a019","role":"authenticated","aal":"aal2"}';

select lives_ok($$insert into public.lesson_notes (session_id, student_id, note, needs_word_retest)
  values ('30000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000c019', '(가짜) 단어 약함', true)$$,
  '원장: 단어 재시험 체크한 메모 insert');
select is((select count(*)::int from public.clinic_items where kind = 'word_retest'
            and student_id = '10000000-0000-4000-8000-00000000c019'
            and session_id = '30000000-0000-4000-8000-00000000a019' and status = 'open'), 1,
  '트리거: 단어 재시험 클리닉이 생긴다');
select is((select count(*)::int from public.clinic_items where kind = 'concept_review'), 0,
  '트리거: 체크 안 한 개념 보완은 없다');

select lives_ok($$insert into public.lesson_notes (session_id, student_id, note, needs_word_retest, needs_concept_review)
  values ('30000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000c019', '(가짜) 다시', true, true)
  on conflict (session_id, student_id) do update set note = excluded.note,
    needs_word_retest = excluded.needs_word_retest, needs_concept_review = excluded.needs_concept_review$$,
  '원장: upsert로 개념 보완도 체크');
select is((select count(*)::int from public.clinic_items where student_id = '10000000-0000-4000-8000-00000000c019'), 2,
  '트리거: 두 번 저장해도 종류별로 한 행씩(2행)');

-- 단어 재시험을 끝낸 뒤 체크를 끄면 끝낸 행은 남는다. 개념 보완(안 끝냄) 체크를 끄면 지워진다.
select lives_ok($$update public.clinic_items set status = 'done' where kind = 'word_retest'$$, '원장: 단어 재시험 끝냄');
select isnt((select done_at from public.clinic_items where kind = 'word_retest'), null, '트리거: done_at이 채워진다');
select lives_ok($$update public.lesson_notes set needs_word_retest = false, needs_concept_review = false
  where student_id = '10000000-0000-4000-8000-00000000c019'$$, '원장: 체크 둘 다 끔');
select is((select count(*)::int from public.clinic_items where kind = 'concept_review'), 0,
  '트리거: 안 끝낸 개념 보완은 지워진다');
select is((select count(*)::int from public.clinic_items where kind = 'word_retest' and status = 'done'), 1,
  '트리거: 끝낸 단어 재시험은 기록으로 남는다');
select lives_ok($$update public.clinic_items set status = 'open' where kind = 'word_retest'$$, '원장: 다시 열기');
select is((select done_at from public.clinic_items where kind = 'word_retest'), null, '트리거: 다시 열면 done_at이 비워진다');
select lives_ok($$update public.clinic_items set status = 'done' where kind = 'word_retest'$$, '원장: 다시 끝냄');

-- 메모 행을 지우면 안 끝낸 클리닉만 지워진다.
select lives_ok($$update public.lesson_notes set needs_concept_review = true
  where student_id = '10000000-0000-4000-8000-00000000c019'$$, '원장: 개념 보완 다시 체크');
select lives_ok($$delete from public.lesson_notes where student_id = '10000000-0000-4000-8000-00000000c019'$$,
  '원장: 메모 삭제');
select is((select array_agg(kind::text || ':' || status::text order by kind) from public.clinic_items
            where student_id = '10000000-0000-4000-8000-00000000c019'), ARRAY['word_retest:done'],
  '트리거: 메모를 지우면 안 끝낸 개념 보완만 사라진다');

-- 반 소속·형식 검사
select throws_ok($$insert into public.lesson_notes (session_id, student_id, needs_word_retest)
  values ('30000000-0000-4000-8000-00000000b019', '10000000-0000-4000-8000-00000000c019', true)$$,
  'P0001', '이 반 학생이 아니에요. 반 배정을 먼저 확인해 주세요.', '반에 없는 학생 메모는 거부');
select throws_ok($$insert into public.lesson_notes (session_id, student_id, note)
  values ('30000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000d019', repeat('가', 1001))$$,
  '23514', null, '메모 1001자 거부');
select throws_ok($$insert into public.lesson_notes (session_id, student_id, note)
  values ('30000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000d019', E'a\x07')$$,
  '23514', null, '메모 제어 문자 거부');
select lives_ok($$insert into public.lesson_notes (session_id, student_id, note, needs_concept_review)
  values ('30000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000d019', E'(가짜)\n두 줄', true)$$,
  '메모 줄바꿈은 허용, 학생 B 개념 보완');
select lives_ok($$insert into public.clinic_items (student_id, kind, memo)
  values ('10000000-0000-4000-8000-00000000c019', 'concept_review', '(가짜) 관계대명사')$$, '원장: 클리닉 직접 추가');
select throws_ok($$insert into public.clinic_items (student_id, kind, memo)
  values ('10000000-0000-4000-8000-00000000c019', 'concept_review', E'a\tb')$$, '23514', null, '클리닉 메모 제어 문자 거부');
select throws_ok($$update public.clinic_items set done_at = now()$$, '42501', null, 'done_at 직접 수정은 권한 에러');

-- 테스트·상담
select lives_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'word', '(가짜) Day 1', 18, 20)$$, '원장: 테스트 A');
select lives_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000d019', '2026-11-05', 'grammar', '(가짜) 시제', 7, 10)$$, '원장: 테스트 B');
select throws_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'word', '(가짜)', 21, 20)$$, '23514', null, '점수 > 만점 거부');
select throws_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'word', ' ', 1, 20)$$, '23514', null, '빈 제목 거부');
select throws_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'word', E'a\nb', 1, 20)$$, '23514', null, '제목 줄바꿈 거부');
select throws_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'word', '(가짜)', 1, 0)$$, '23514', null, '만점 0 거부');
select lives_ok($$insert into public.counsel_notes (student_id, counseled_on, method, party, body)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'phone', 'guardian', E'(가짜) 상담\n내용')$$, '원장: 상담 기록');
select throws_ok($$insert into public.counsel_notes (student_id, counseled_on, method, party, body)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'phone', 'guardian', '  ')$$, '23514', null, '빈 상담 내용 거부');
select throws_ok($$insert into public.counsel_notes (student_id, counseled_on, method, party, body)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'phone', 'guardian', repeat('가', 2001))$$,
  '23514', null, '상담 2001자 거부');

-- 퇴원생 클리닉은 원장 테이블에는 있어도 명단 view에서는 빠진다.
reset role;
insert into public.clinic_items (student_id, kind) values ('10000000-0000-4000-8000-00000000e019', 'word_retest');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a019","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.clinic_items), 4, '원장: clinic_items 4행(퇴원생 포함)');
select is((select count(*)::int from public.clinic_board), 3, '원장: clinic_board는 퇴원생을 뺀 3행');
select is((select count(*)::int from public.clinic_board where student_id = '10000000-0000-4000-8000-00000000e019'), 0,
  '원장: clinic_board에 퇴원생 없음');
select is((select session_date::text from public.clinic_board where session_id is not null limit 1), '2026-11-05',
  'clinic_board: 수업 날짜가 붙는다');
reset role;

-- ─── 학생 A ─────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c019","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.lesson_notes), 0, '학생: 수업 메모 0행(원장만)');
select is((select count(*)::int from public.counsel_notes), 0, '학생: 상담 기록 0행(원장만)');
select is((select count(*)::int from public.test_results), 1, '학생 A: 자기 테스트 1행만');
select is((select count(*)::int from public.test_results where student_id <> '10000000-0000-4000-8000-00000000c019'), 0,
  '학생 A: 학생 B 테스트 0행');
select is((select count(*)::int from public.clinic_items), 2, '학생 A: 자기 클리닉 2행만');
select is((select count(*)::int from public.clinic_board), 2, '학생 A: clinic_board도 자기 행만');
select throws_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'word', '(가짜)', 20, 20)$$, '42501', null, '학생: 테스트 insert는 RLS 에러');
select throws_ok($$insert into public.clinic_items (student_id, kind)
  values ('10000000-0000-4000-8000-00000000c019', 'word_retest')$$, '42501', null, '학생: 클리닉 insert는 RLS 에러');
select throws_ok($$insert into public.lesson_notes (session_id, student_id, needs_word_retest)
  values ('30000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000c019', true)$$, '42501', null,
  '학생: 수업 메모 insert는 RLS 에러');
select throws_ok($$insert into public.counsel_notes (student_id, counseled_on, method, party, body)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'phone', 'student', '(가짜)')$$, '42501', null,
  '학생: 상담 insert는 RLS 에러');
select lives_ok($$update public.clinic_items set status = 'done'$$, '학생: 클리닉 update는 에러 없이 0행');
select lives_ok($$delete from public.clinic_items$$, '학생: 클리닉 delete는 에러 없이 0행');
select lives_ok($$delete from public.test_results$$, '학생: 테스트 delete는 에러 없이 0행');
reset role;
select is((select count(*)::int from public.clinic_items where status = 'open'), 3, '학생: 클리닉 원본 그대로(안 끝낸 3행)');
select is((select count(*)::int from public.test_results), 2, '학생: 테스트 원본 그대로');

-- ─── 퇴원생·아무나·원장 aal1 ─────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000e019","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.clinic_items), 0, '퇴원생: 자기 클리닉도 0행');
select is((select count(*)::int from public.test_results), 0, '퇴원생: 테스트 0행');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b019","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.lesson_notes), 0, '아무나: 수업 메모 0행');
select is((select count(*)::int from public.clinic_items), 0, '아무나: 클리닉 0행');
select is((select count(*)::int from public.test_results), 0, '아무나: 테스트 0행');
select is((select count(*)::int from public.counsel_notes), 0, '아무나: 상담 0행');
select throws_ok($$insert into public.test_results (student_id, taken_on, kind, title, score, max_score)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'word', '(가짜)', 1, 20)$$, '42501', null, '아무나: 테스트 insert는 RLS 에러');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a019","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.lesson_notes), 0, '원장 aal1: 수업 메모 0행');
select is((select count(*)::int from public.counsel_notes), 0, '원장 aal1: 상담 0행');
select throws_ok($$insert into public.counsel_notes (student_id, counseled_on, method, party, body)
  values ('10000000-0000-4000-8000-00000000c019', '2026-11-05', 'phone', 'student', '(가짜)')$$, '42501', null,
  '원장 aal1: 상담 insert는 RLS 에러');
select throws_ok($$insert into public.lesson_notes (session_id, student_id, needs_word_retest)
  values ('30000000-0000-4000-8000-00000000a019', '10000000-0000-4000-8000-00000000c019', true)$$, 'P0001', null,
  '원장 aal1: 수업 메모 insert 거부(반 명단이 안 보여 소속 트리거가 먼저 막는다)');
reset role;

-- anon
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select * from public.clinic_items$$, '42501', null, 'anon: clinic_items select는 권한 에러');
select throws_ok($$select * from public.test_results$$, '42501', null, 'anon: test_results select는 권한 에러');
select throws_ok($$select * from public.counsel_notes$$, '42501', null, 'anon: counsel_notes select는 권한 에러');
select throws_ok($$select * from public.lesson_notes$$, '42501', null, 'anon: lesson_notes select는 권한 에러');
reset role;

-- ─── 원장 삭제 ──────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a019","role":"authenticated","aal":"aal2"}';
select lives_ok($$delete from public.counsel_notes$$, '원장: 상담 삭제');
select lives_ok($$delete from public.test_results where kind = 'word'$$, '원장: 테스트 삭제');
select is((select count(*)::int from public.test_results), 1, '원장: 삭제 뒤 테스트 1행');
reset role;

-- ─── 감사 ───────────────────────────────────────────────────────────
select is((select count(*)::int from private.audit_log
            where table_name = 'public.counsel_notes' and actor = '00000000-0000-4000-8000-00000000a019'
              and op in ('INSERT', 'DELETE')), 2, '감사: 상담 INSERT·DELETE가 actor = 원장으로 남는다');

select * from finish();
rollback;
