-- guardian_tokens·issue_guardian_token·guardian_view·퇴원 폐기 테스트(설계 13장 S7·S12). 가짜 데이터만 쓴다.
-- 토큰 원문은 어디에도 저장되지 않는다(해시만). 발급은 원장(admins + aal2)만, 조회는 토큰만으로(anon 포함).
-- 실패 원인(없음·형식·틀림·만료·폐기·퇴원)은 모두 같은 문구라 구분할 수 없다. 응답에 다른 학생 값이 섞이지 않는다.
-- guardian_view는 POST(request.method = 'POST')로만 동작한다. 성공 경로는 아래에서 POST를 설정한 뒤 부른다.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;
select plan(81);

-- 시드는 테스트 파일 사이에 남아 있다. 세는 테이블은 비우고 시작한다(rollback으로 되돌린다).
delete from public.guardian_tokens;
delete from public.points;
delete from public.attendance;
delete from public.homework_checks;
delete from public.sessions;
delete from public.class_members;
delete from public.classes;
delete from public.students;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a013', 'admin13@example.test'),
  ('00000000-0000-4000-8000-00000000c013', 'g_a@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000d013', 'g_b@student.heesu.internal'),
  ('00000000-0000-4000-8000-00000000b013', 'nobody13@example.test');
insert into private.admins (user_id) values ('00000000-0000-4000-8000-00000000a013');

insert into public.students (id, user_id, login_id, name, grade, status) values
  ('10000000-0000-4000-8000-00000000c013', '00000000-0000-4000-8000-00000000c013', 'g_a', '가짜링크A', '중2', 'active'),
  ('10000000-0000-4000-8000-00000000d013', '00000000-0000-4000-8000-00000000d013', 'g_b', '가짜링크B', '중2', 'active');

-- 반 X(A·B, 60일 전 배정), 반 Y(A, 오늘 배정)
insert into public.classes (id, name, level) values
  ('20000000-0000-4000-8000-00000000a013', '가짜 링크반 X', 'middle'),
  ('20000000-0000-4000-8000-00000000b013', '가짜 링크반 Y', 'middle'),
  ('20000000-0000-4000-8000-00000000c013', '가짜 링크반 Z', 'middle');
insert into public.class_members (class_id, student_id, created_at) values
  ('20000000-0000-4000-8000-00000000a013', '10000000-0000-4000-8000-00000000c013', now() - interval '60 days'),
  ('20000000-0000-4000-8000-00000000a013', '10000000-0000-4000-8000-00000000d013', now() - interval '60 days'),
  ('20000000-0000-4000-8000-00000000b013', '10000000-0000-4000-8000-00000000c013', now()),
  ('20000000-0000-4000-8000-00000000c013', '10000000-0000-4000-8000-00000000c013', now() - interval '60 days');

-- 서울 기준 오늘 t. X: t, t-10, t-27, t-28, t+1. Y: t-5(배정 전, A 행 없음), t-8(배정 전, A 출결 행 있음).
-- Z: t-15(A 숙제 행만 있고, 아래에서 A를 Z에서 뺀다 = 지금 소속이 아닌 반).
insert into public.sessions (id, class_id, date, summary, homework, homework_due)
select v.id::uuid, v.class_id::uuid, (now() at time zone 'Asia/Seoul')::date + v.off, v.summary, v.homework,
       case when v.homework is null then null else (now() at time zone 'Asia/Seoul')::date + 2 end
  from (values
    ('30000000-0000-4000-8000-00000000a013', '20000000-0000-4000-8000-00000000a013', 0, '(가짜) 현재완료', '(가짜) 단어 20개'),
    ('30000000-0000-4000-8000-00000000b013', '20000000-0000-4000-8000-00000000a013', -10, null, null),
    ('30000000-0000-4000-8000-00000000c013', '20000000-0000-4000-8000-00000000a013', -27, null, null),
    ('30000000-0000-4000-8000-00000000d013', '20000000-0000-4000-8000-00000000a013', -28, null, null),
    ('30000000-0000-4000-8000-00000000e013', '20000000-0000-4000-8000-00000000a013', 1, null, null),
    ('30000000-0000-4000-8000-00000000f013', '20000000-0000-4000-8000-00000000b013', -5, null, null),
    ('30000000-0000-4000-8000-000000001013', '20000000-0000-4000-8000-00000000b013', -8, null, null),
    ('30000000-0000-4000-8000-000000002013', '20000000-0000-4000-8000-00000000c013', -15, null, null)
  ) as v(id, class_id, off, summary, homework);

-- A: t present/done(자동 +1), t-10 late/missing, Y t-8 makeup(숙제 없음), Z t-15 숙제 done(출결 없음). B: t absent. A 수동 +2.
insert into public.attendance (session_id, student_id, status) values
  ('30000000-0000-4000-8000-00000000a013', '10000000-0000-4000-8000-00000000c013', 'present'),
  ('30000000-0000-4000-8000-00000000b013', '10000000-0000-4000-8000-00000000c013', 'late'),
  ('30000000-0000-4000-8000-00000000a013', '10000000-0000-4000-8000-00000000d013', 'absent'),
  ('30000000-0000-4000-8000-000000001013', '10000000-0000-4000-8000-00000000c013', 'makeup');
insert into public.homework_checks (session_id, student_id, status) values
  ('30000000-0000-4000-8000-00000000a013', '10000000-0000-4000-8000-00000000c013', 'done'),
  ('30000000-0000-4000-8000-00000000b013', '10000000-0000-4000-8000-00000000c013', 'missing'),
  ('30000000-0000-4000-8000-000000002013', '10000000-0000-4000-8000-00000000c013', 'done');
-- A를 Z에서 뺀다(행은 남는다).
delete from public.class_members
 where class_id = '20000000-0000-4000-8000-00000000c013' and student_id = '10000000-0000-4000-8000-00000000c013';
insert into public.points (student_id, amount, reason) values
  ('10000000-0000-4000-8000-00000000c013', 2, '(가짜) 발표');

-- ─── 권한 표 ────────────────────────────────────────────────────────
select table_privs_are('public', 'guardian_tokens', 'anon', ARRAY[]::text[], 'anon: guardian_tokens 권한 없음');
select table_privs_are('public', 'guardian_tokens', 'service_role', ARRAY[]::text[],
  'service_role: guardian_tokens 권한 없음');
select table_privs_are('public', 'guardian_tokens', 'authenticated', ARRAY[]::text[],
  'authenticated: guardian_tokens 테이블 권한 없음 (읽기는 컬럼 단위)');
select column_privs_are('public', 'guardian_tokens', 'token_hash', 'authenticated', ARRAY[]::text[],
  'authenticated: token_hash는 아무 권한 없음');
select column_privs_are('public', 'guardian_tokens', 'expires_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: expires_at은 SELECT뿐');
select column_privs_are('public', 'guardian_tokens', 'revoked_at', 'authenticated', ARRAY['SELECT'],
  'authenticated: revoked_at은 SELECT뿐 (폐기는 함수만)');

-- ─── 원장 직접 접근 ─────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a013","role":"authenticated","aal":"aal2"}';
select throws_ok($$select token_hash from public.guardian_tokens$$, '42501', null, '원장: token_hash select → 권한 에러');
select throws_ok($$insert into public.guardian_tokens (student_id, token_hash, expires_at)
                   values ('10000000-0000-4000-8000-00000000c013', pg_catalog.sha256('x'::bytea), now() + interval '1 day')$$,
  '42501', null, '원장: insert → 권한 에러');
select throws_ok($$update public.guardian_tokens set revoked_at = now()$$, '42501', null, '원장: update → 권한 에러');
select throws_ok($$delete from public.guardian_tokens$$, '42501', null, '원장: delete → 권한 에러');

-- ─── 발급 ───────────────────────────────────────────────────────────
select set_config('test.tok1', public.issue_guardian_token('10000000-0000-4000-8000-00000000c013'), true);
select ok(current_setting('test.tok1') ~ '^[A-Za-z0-9_-]{43}$', '발급: 원문은 base64url 43자');

reset role;
select is((select count(*)::int from public.guardian_tokens
            where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok1'), 'UTF8'))
              and student_id = '10000000-0000-4000-8000-00000000c013' and revoked_at is null),
  1, '발급: 원문 sha256 해시 행 1개 (A, 살아 있음)');
select ok((select expires_at > now() + interval '89 days' and expires_at < now() + interval '91 days'
             from public.guardian_tokens
            where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok1'), 'UTF8'))),
  '발급: 만료는 약 90일 뒤');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a013","role":"authenticated","aal":"aal2"}';
select set_config('test.tok2', public.issue_guardian_token('10000000-0000-4000-8000-00000000c013'), true);
select isnt(current_setting('test.tok2'), current_setting('test.tok1'), '재발급: 새 원문');
select is((select count(id)::int from public.guardian_tokens), 2, '원장 select: 2행 (해시 제외 컬럼)');
select is((select count(id)::int from public.guardian_tokens where revoked_at is null), 1,
  '재발급: 살아 있는 토큰은 1개');

reset role;
select ok((select revoked_at is not null from public.guardian_tokens
            where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok1'), 'UTF8'))),
  '재발급: tok1은 폐기됨');
select ok((select revoked_at is null from public.guardian_tokens
            where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok2'), 'UTF8'))),
  '재발급: tok2는 살아 있음');

-- ─── 발급 거절 ──────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000c013","role":"authenticated","aal":"aal1"}';
select throws_ok($$select public.issue_guardian_token('10000000-0000-4000-8000-00000000c013')$$,
  'P0001', '원장 계정으로 다시 로그인해 주세요.', '학생 A: 발급 거절');
select is((select count(id)::int from public.guardian_tokens), 0, '학생 A: guardian_tokens 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000b013","role":"authenticated","aal":"aal2"}';
select throws_ok($$select public.issue_guardian_token('10000000-0000-4000-8000-00000000c013')$$,
  'P0001', '원장 계정으로 다시 로그인해 주세요.', '아무나: 발급 거절');
select is((select count(id)::int from public.guardian_tokens), 0, '아무나: guardian_tokens 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a013","role":"authenticated","aal":"aal1"}';
select throws_ok($$select public.issue_guardian_token('10000000-0000-4000-8000-00000000c013')$$,
  'P0001', '원장 계정으로 다시 로그인해 주세요.', '원장 aal1: 발급 거절');
select is((select count(id)::int from public.guardian_tokens), 0, '원장 aal1: guardian_tokens 0행');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a013","role":"authenticated","aal":"aal2"}';
select throws_ok($$select public.issue_guardian_token('10000000-0000-4000-8000-0000000ff013')$$,
  'P0001', '학생을 찾을 수 없어요. 목록에서 다시 골라 주세요.', '원장: 없는 학생 → 거절');
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select public.issue_guardian_token('10000000-0000-4000-8000-00000000c013')$$,
  '42501', null, 'anon: issue_guardian_token 실행 권한 없음');

-- ─── 요청 방법: POST만 ─────────────────────────────────────────────
-- PostgREST는 volatile 함수도 GET으로 부른다(읽기 전용 트랜잭션). GET이면 토큰이 쿼리스트링에 실리므로 거부한다.
select throws_ok($$select public.guardian_view(current_setting('test.tok2'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '요청 방법 없음(설정 안 됨): 같은 실패 문구');
select set_config('request.method', '', true);
select throws_ok($$select public.guardian_view(current_setting('test.tok2'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '요청 방법 빈 문자열: 같은 실패 문구');
select set_config('request.method', 'GET', true);
select throws_ok($$select public.guardian_view(current_setting('test.tok2'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', 'GET: 같은 실패 문구');
select set_config('request.method', 'post', true);
select throws_ok($$select public.guardian_view(current_setting('test.tok2'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '소문자 post: 같은 실패 문구 (PostgREST는 대문자로 넣는다)');
select set_config('request.method', 'POST', true);
select lives_ok($$select public.guardian_view(current_setting('test.tok2'))$$, 'POST: 조회 성공');

-- ─── 조회 (anon, POST, tok2) ────────────────────────────────────────
select set_config('test.view', public.guardian_view(current_setting('test.tok2'))::text, true);
select is((select array_agg(k order by k) from jsonb_object_keys(current_setting('test.view')::jsonb) k),
  ARRAY['name', 'records', 'today', 'total_points', 'week'], '조회: 키는 name·records·today·total_points·week뿐');
select is(current_setting('test.view')::jsonb ->> 'name', '가짜링크A', '조회: 이름 = A');
select is(current_setting('test.view')::jsonb ->> 'today', ((now() at time zone 'Asia/Seoul')::date)::text,
  '조회: today = 서울 날짜');
select is((current_setting('test.view')::jsonb ->> 'total_points')::int, 3, '조회: 포인트 = 자동 1 + 수동 2');
select is((select array_agg((e ->> 'date')::date order by ord)
             from jsonb_array_elements(current_setting('test.view')::jsonb -> 'records') with ordinality as r(e, ord)),
  ARRAY[(now() at time zone 'Asia/Seoul')::date,
        (now() at time zone 'Asia/Seoul')::date - 8,
        (now() at time zone 'Asia/Seoul')::date - 10,
        (now() at time zone 'Asia/Seoul')::date - 15,
        (now() at time zone 'Asia/Seoul')::date - 27],
  '조회: records = t, t-8, t-10, t-15, t-27 (내림차순; t-28·미래·행 없는 배정 전 수업 없음)');
select is((select array_agg(distinct k order by k)
             from jsonb_array_elements(current_setting('test.view')::jsonb -> 'records') e, jsonb_object_keys(e) k),
  ARRAY['attendance', 'class_name', 'date', 'homework'], '조회: records 항목 키');
select is(current_setting('test.view')::jsonb -> 'records' -> 0,
  jsonb_build_object('date', (now() at time zone 'Asia/Seoul')::date, 'class_name', '가짜 링크반 X',
                     'attendance', 'present', 'homework', 'done'),
  '조회: records[0] = 오늘 present/done');
select is(current_setting('test.view')::jsonb -> 'records' -> 1,
  jsonb_build_object('date', (now() at time zone 'Asia/Seoul')::date - 8, 'class_name', '가짜 링크반 Y',
                     'attendance', 'makeup', 'homework', 'none'),
  '조회: 배정 전 수업이라도 A 출결 행이 있으면 들어간다 (Y t-8 makeup/none)');
select is(current_setting('test.view')::jsonb -> 'records' -> 2 ->> 'attendance', 'late', '조회: t-10 출결 late');
select is(current_setting('test.view')::jsonb -> 'records' -> 2 ->> 'homework', 'missing', '조회: t-10 숙제 missing');
select is(current_setting('test.view')::jsonb -> 'records' -> 3,
  jsonb_build_object('date', (now() at time zone 'Asia/Seoul')::date - 15, 'class_name', '가짜 링크반 Z',
                     'attendance', 'none', 'homework', 'done'),
  '조회: 지금 소속이 아닌 반이라도 A 숙제 행이 있으면 들어간다 (Z t-15 none/done)');
select is(current_setting('test.view')::jsonb -> 'records' -> 4 ->> 'attendance', 'none', '조회: t-27 출결 none');
select is(current_setting('test.view')::jsonb -> 'records' -> 4 ->> 'homework', 'none', '조회: t-27 숙제 none');
select ok(position('absent' in current_setting('test.view')) = 0, '조회: B의 absent가 섞이지 않는다');
select is(current_setting('test.view')::jsonb -> 'week',
  jsonb_build_array(jsonb_build_object(
    'date', (now() at time zone 'Asia/Seoul')::date, 'class_name', '가짜 링크반 X',
    'summary', '(가짜) 현재완료', 'homework', '(가짜) 단어 20개',
    'homework_due', (now() at time zone 'Asia/Seoul')::date + 2)),
  '조회: week = 오늘 수업 하나, 글자 그대로');
select ok(position('가짜링크B' in current_setting('test.view')) = 0, '조회: B 이름이 없다');

-- ─── 조회 실패: 모두 같은 문구 ───────────────────────────────────────
select throws_ok($$select public.guardian_view(current_setting('test.tok1'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 폐기된 tok1');
select throws_ok($$select public.guardian_view(null)$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: null');
select throws_ok($$select public.guardian_view('')$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 빈 문자열');
select throws_ok($$select public.guardian_view(left(current_setting('test.tok2'), 42))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 42자');
select throws_ok($$select public.guardian_view(current_setting('test.tok2') || 'a')$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 44자');
select throws_ok($$select public.guardian_view(current_setting('test.tok2') || '%20')$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 뒤에 %20');
select throws_ok($$select public.guardian_view(current_setting('test.tok2') || E'\n')$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 뒤에 줄바꿈');
select throws_ok($$select public.guardian_view(
                     case when left(current_setting('test.tok2'), 1) = 'A' then 'B' else 'A' end
                     || substr(current_setting('test.tok2'), 2))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 첫 글자만 다름');
select throws_ok($$select public.guardian_view(repeat('a', 10000))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 10000자');

reset role;
update public.guardian_tokens
   set created_at = now() - interval '2 days', expires_at = now() - interval '1 second'
 where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok2'), 'UTF8'));
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select public.guardian_view(current_setting('test.tok2'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '조회 실패: 만료');
reset role;
update public.guardian_tokens
   set created_at = now(), expires_at = now() + interval '90 days'
 where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok2'), 'UTF8'));

-- 토큰만으로 판단한다: 다른 학생(B)으로 로그인해 있어도 A의 기록이 보인다.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000d013","role":"authenticated","aal":"aal1"}';
select is(public.guardian_view(current_setting('test.tok2')) ->> 'name', '가짜링크A',
  'authenticated(B): tok2로 A 조회 성공');
select is((select count(id)::int from public.guardian_tokens), 0, '학생 B: guardian_tokens 0행');

-- ─── 퇴원 폐기 ──────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a013","role":"authenticated","aal":"aal2"}';
update public.students set status = 'left' where id = '10000000-0000-4000-8000-00000000c013';
select throws_ok($$select public.issue_guardian_token('10000000-0000-4000-8000-00000000c013')$$,
  'P0001', '퇴원한 학생은 학부모 링크를 만들 수 없어요. 학생 상태를 먼저 바꿔 주세요.', '퇴원: 발급 거절');
reset role;
select is((select count(*)::int from public.guardian_tokens
            where student_id = '10000000-0000-4000-8000-00000000c013' and revoked_at is null),
  0, '퇴원: A의 살아 있는 토큰 0개');
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select public.guardian_view(current_setting('test.tok2'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '퇴원: tok2 조회 실패');
reset role;

-- ─── 감사 ───────────────────────────────────────────────────────────
select is((select count(*)::int from private.audit_log l
            where l.table_name = 'public.guardian_tokens' and l.op = 'INSERT'
              and l.row_id in (select id::text from public.guardian_tokens)
              and l.actor = '00000000-0000-4000-8000-00000000a013'),
  2, '감사: 발급 INSERT 2행 (actor = 원장)');
select ok((select count(*) from private.audit_log l
            where l.table_name = 'public.guardian_tokens' and l.op = 'UPDATE'
              and l.row_id in (select id::text from public.guardian_tokens)) >= 2,
  '감사: UPDATE 2행 이상');
select ok(exists (select 1 from private.audit_log l
                   where l.table_name = 'public.guardian_tokens' and l.op = 'UPDATE'
                     and l.actor = '00000000-0000-4000-8000-00000000a013'
                     and l.row_id = (select id::text from public.guardian_tokens
                                      where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok1'), 'UTF8')))),
  '감사: 재발급 폐기 UPDATE (actor = 원장)');
select ok(exists (select 1 from private.audit_log l
                   where l.table_name = 'public.guardian_tokens' and l.op = 'UPDATE'
                     and l.actor = '00000000-0000-4000-8000-00000000a013'
                     and l.row_id = (select id::text from public.guardian_tokens
                                      where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok2'), 'UTF8')))),
  '감사: 퇴원 폐기 UPDATE (actor = 원장)');

-- ─── 퇴원 검사는 폐기와 별개로 지킨다 ───────────────────────────────
-- (postgres로) 퇴원한 A의 tok2를 되살려도 조회는 실패한다.
update public.guardian_tokens set revoked_at = null
 where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok2'), 'UTF8'));
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select public.guardian_view(current_setting('test.tok2'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '퇴원: 폐기 안 된 토큰이라도 조회 실패');
reset role;
update public.guardian_tokens set revoked_at = now()
 where token_hash = pg_catalog.sha256(convert_to(current_setting('test.tok2'), 'UTF8'));

-- ─── 복귀 뒤 재발급 ─────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000a013","role":"authenticated","aal":"aal2"}';
update public.students set status = 'active' where id = '10000000-0000-4000-8000-00000000c013';
select set_config('test.tok3', public.issue_guardian_token('10000000-0000-4000-8000-00000000c013'), true);
select ok(current_setting('test.tok3') ~ '^[A-Za-z0-9_-]{43}$', '복귀: 재발급 성공');
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(public.guardian_view(current_setting('test.tok3')) ->> 'name', '가짜링크A', '복귀: 새 토큰으로 조회 성공');
select throws_ok($$select public.guardian_view(current_setting('test.tok2'))$$,
  'P0001', '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.', '복귀: 예전 tok2는 계속 실패');
reset role;
select is((select count(*)::int from public.guardian_tokens
            where student_id = '10000000-0000-4000-8000-00000000c013' and revoked_at is null),
  1, '복귀: 살아 있는 토큰은 새 것 하나');

-- ─── 함수 모양 ──────────────────────────────────────────────────────
select is_definer('public', 'guardian_view', ARRAY['text'], 'guardian_view는 security definer');
select is_definer('public', 'issue_guardian_token', ARRAY['uuid'], 'issue_guardian_token은 security definer');
select is_definer('private', 'revoke_guardian_tokens_on_leave', ARRAY[]::text[],
  'revoke_guardian_tokens_on_leave는 security definer (원장에게 guardian_tokens update 권한이 없다)');
select is((select provolatile::text from pg_catalog.pg_proc p
             join pg_catalog.pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'guardian_view'),
  'v', 'guardian_view는 volatile (요청 방법 검사와 별개로, 읽기 전용으로 표시하지 않는다)');
select function_privs_are('public', 'guardian_view', ARRAY['text'], 'anon', ARRAY['EXECUTE'],
  'anon: guardian_view EXECUTE');
select function_privs_are('public', 'guardian_view', ARRAY['text'], 'authenticated', ARRAY['EXECUTE'],
  'authenticated: guardian_view EXECUTE');
select function_privs_are('public', 'guardian_view', ARRAY['text'], 'service_role', ARRAY[]::text[],
  'service_role: guardian_view 권한 없음');
select function_privs_are('public', 'issue_guardian_token', ARRAY['uuid'], 'anon', ARRAY[]::text[],
  'anon: issue_guardian_token 권한 없음');
select function_privs_are('public', 'issue_guardian_token', ARRAY['uuid'], 'authenticated', ARRAY['EXECUTE'],
  'authenticated: issue_guardian_token EXECUTE');
select function_privs_are('public', 'issue_guardian_token', ARRAY['uuid'], 'service_role', ARRAY[]::text[],
  'service_role: issue_guardian_token 권한 없음');

select * from finish();
rollback;
