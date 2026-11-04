-- 시연 데이터 로컬 검사(scripts/seed-demo-check.sh가 저장소 루트에서 부른다). 가짜 데이터만 쓴다.
-- 전부 한 트랜잭션 안에서 하고 마지막에 rollback한다: 로컬 DB는 그대로예요.
-- 성공해야 하는 실행은 \gexec로 파일 전체를 쿼리 하나로 보낸다(대시보드 SQL Editor와 같은 모양: 한 암묵 트랜잭션).
-- 실패해야 하는 실행(계정 없음·두 번째 실행·실제 학생이 든 반 지우기)은 pg_temp.expect_error가 EXECUTE로 파일 전체를 돌리고
-- 오류 문구를 비교한다. 예외 처리는 서브트랜잭션이라 그 실행이 남긴 것도 되돌아가고, 예상된 오류가 화면에 찍히지 않는다.
-- (psql \ir + ON_ERROR_STOP 0으로는 가드 뒤 문장들이 "current transaction is aborted"로 :LAST_ERROR_MESSAGE를 덮어써서
--  가드 문구를 비교할 수 없다.)
\set ON_ERROR_STOP 1
\set seed `cat supabase/seed-demo.sql`
\set clear `cat supabase/seed-demo-clear.sql`

begin;
set local timezone = 'UTC';
set local client_min_messages = warning;
select set_config('demo_check.seed', :'seed', true) is not null as demo_seed_loaded \gset
select set_config('demo_check.clear', :'clear', true) is not null as demo_clear_loaded \gset

-- p_file: 'seed' 또는 'clear'
create function pg_temp.expect_error(p_label text, p_file text, p_expected text)
returns void
language plpgsql
as $$
declare
  v_err text;
begin
  begin
    execute current_setting('demo_check.' || p_file);
  exception when others then
    v_err := sqlerrm;
  end;
  if v_err is distinct from p_expected then
    raise exception 'FAIL: % — 기대한 문구가 아니에요: %', p_label, coalesce(v_err, '(오류 없이 실행됐어요)');
  end if;
end;
$$;

-- ─── 1. 계정 없는 상태는 거절 ───────────────────────────────────────────
do $$ begin
  perform pg_temp.expect_error('계정 없이 실행', 'seed',
    '시연용 학생 계정 demo_haneul·demo_minjun을 원장 화면 학생 추가로 먼저 만들어 주세요.');
end $$;

-- ─── 2. 전제: 원장 화면 학생 추가(create-student) 흉내, 비밀번호 없음 ─────────
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000c7', 'demo_haneul@student.heesu.internal'),
  ('00000000-0000-4000-8000-0000000000d7', 'demo_minjun@student.heesu.internal');
insert into public.students (user_id, login_id, name, grade) values
  ('00000000-0000-4000-8000-0000000000c7', 'demo_haneul', '임시', '중1'),
  ('00000000-0000-4000-8000-0000000000d7', 'demo_minjun', '임시', '중1');

-- 원장이 이미 고친 랜딩 문구(예시 표시 없음): 시드도 지우기도 건드리면 안 된다.
insert into public.site_content (key, value)
values ('contact', '{"phone": "063-111-2222", "address": "원장이 고친 주소"}')
on conflict (key) do update set value = excluded.value;

-- ─── 3. 시연 데이터 넣기 ───────────────────────────────────────────────
select :'seed' \gexec

-- ─── 4. 단언 ─────────────────────────────────────────────────────────
do $$ begin
  if (select count(*) from public.students where login_id like 'demo\_%') <> 8 then
    raise exception 'FAIL: demo_ 학생이 8명이 아니에요';
  end if;
  if exists (select 1 from public.students where login_id like 'demo\_%' and name not like '% (예시)') then
    raise exception 'FAIL: (예시)로 끝나지 않는 시연 학생 이름이 있어요';
  end if;
  if (select name from public.students where login_id = 'demo_haneul') <> '김하늘 (예시)'
     or (select name from public.students where login_id = 'demo_minjun') <> '이민준 (예시)' then
    raise exception 'FAIL: 전제 학생 이름이 바뀌지 않았어요';
  end if;
end $$;

do $$ begin
  if (select count(*) from public.classes where id::text like 'de000002-%') <> 2 then
    raise exception 'FAIL: 시연 반이 2개가 아니에요';
  end if;
  if exists (select 1 from public.classes c
              where c.id::text like 'de000002-%'
                and (select count(*) from public.class_members m where m.class_id = c.id) <> 4) then
    raise exception 'FAIL: 소속 4명이 아닌 시연 반이 있어요';
  end if;
  if exists (select 1 from public.class_members
              where class_id::text like 'de000002-%' and created_at > now() - interval '28 days') then
    raise exception 'FAIL: 28일 안에 배정된 시연 반 소속이 있어요';
  end if;
end $$;

do $$ begin
  if (select count(*) from public.sessions where class_id::text like 'de000002-%') <> 24 then
    raise exception 'FAIL: 시연 반 수업이 24개가 아니에요';
  end if;
  if exists (select 1 from public.sessions
              where class_id::text like 'de000002-%' and date >= (now() at time zone 'Asia/Seoul')::date) then
    raise exception 'FAIL: 서울 오늘 이후 시연 수업이 있어요';
  end if;
end $$;

do $$ begin
  if (select count(*) from public.attendance a join public.sessions s on s.id = a.session_id
       where s.class_id::text like 'de000002-%') <> 96 then
    raise exception 'FAIL: 시연 반 출결이 96행이 아니에요';
  end if;
  if (select count(*) from public.homework_checks h join public.sessions s on s.id = h.session_id
       where s.class_id::text like 'de000002-%') <> 96 then
    raise exception 'FAIL: 시연 반 숙제가 96행이 아니에요';
  end if;
end $$;

do $$ begin
  if (select coalesce(sum(p.amount), 0) from public.points p
        join public.students s on s.id = p.student_id where s.login_id = 'demo_haneul') <> 27 then
    raise exception 'FAIL: demo_haneul 포인트 합이 27이 아니에요';
  end if;
end $$;

do $$ begin
  if (select count(*) from public.consultations
       where phone in ('010-0000-0081', '010-0000-0082') and parent_name like '(예시)%') <> 2 then
    raise exception 'FAIL: 시연 상담이 2건이 아니에요';
  end if;
  if (select count(*) from public.payments p join public.students s on s.id = p.student_id
       where s.login_id like 'demo\_%') <> 14 then
    raise exception 'FAIL: 시연 결제가 14행이 아니에요';
  end if;
  if (select count(*) from public.payments p join public.students s on s.id = p.student_id
       where s.login_id like 'demo\_%' and p.month = to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM')) <> 6 then
    raise exception 'FAIL: 이번 달(서울) 시연 결제가 6행이 아니에요';
  end if;
end $$;

do $$ begin
  if (select count(*) from public.questions where id::text like 'de000003-%') <> 2 then
    raise exception 'FAIL: 시연 질문이 2개가 아니에요';
  end if;
  if (select count(*) from public.questions where id::text like 'de000003-%' and answered_at is not null) <> 1 then
    raise exception 'FAIL: 답변된 시연 질문이 1개가 아니에요';
  end if;
  if (select count(*) from public.answers where question_id::text like 'de000003-%') <> 1 then
    raise exception 'FAIL: 시연 답변이 1개가 아니에요';
  end if;
end $$;

do $$ begin
  if (select count(*) from public.site_content) <> 6 then
    raise exception 'FAIL: site_content가 6키가 아니에요';
  end if;
  if (select value from public.site_content where key = 'contact')
     <> '{"phone": "063-111-2222", "address": "원장이 고친 주소"}'::jsonb then
    raise exception 'FAIL: 원장이 고친 contact를 시드가 덮어썼어요';
  end if;
  if (select value ->> 'registration_no' from public.site_content where key = 'legal') not like '(예시)%'
     or (select value ->> 'title' from public.site_content where key = 'notice') not like '(예시)%' then
    raise exception 'FAIL: 랜딩 예시 값에 (예시) 표시가 없어요';
  end if;
  if (select value from public.site_content where key = 'points_goal') <> '30'::jsonb then
    raise exception 'FAIL: points_goal이 30이 아니에요';
  end if;
end $$;

-- RLS: demo_haneul로 로그인한 것처럼
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c7","role":"authenticated","aal":"aal1"}';
do $$ begin
  if (select count(*) from public.sessions) <> 12 then
    raise exception 'FAIL: demo_haneul에게 보이는 수업이 12개가 아니에요';
  end if;
  if (select count(*) from public.students) <> 1 then
    raise exception 'FAIL: demo_haneul에게 보이는 학생 행이 1개가 아니에요';
  end if;
  begin
    if (select count(*) from public.student_private) <> 0 then
      raise exception 'FAIL: demo_haneul에게 student_private가 보여요';
    end if;
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '', true) is not null as demo_claims_cleared \gset

-- 학부모 링크: 토큰 해시를 postgres로 넣고 anon으로 조회
insert into public.guardian_tokens (student_id, token_hash, expires_at)
select id, sha256(convert_to(repeat('A', 43), 'UTF8')), now() + interval '1 day'
  from public.students where login_id = 'demo_haneul';
select set_config('request.method', 'POST', true) is not null as demo_post_set \gset
set local role anon;
do $$
declare
  v jsonb := public.guardian_view(repeat('A', 43));
begin
  if v ->> 'name' <> '김하늘 (예시)' then
    raise exception 'FAIL: 학부모 화면 이름이 김하늘 (예시)가 아니에요';
  end if;
  if jsonb_array_length(v -> 'records') < 11 then
    raise exception 'FAIL: 학부모 화면 기록이 11개보다 적어요';
  end if;
  if (v ->> 'total_points')::int <> 27 then
    raise exception 'FAIL: 학부모 화면 포인트가 27이 아니에요';
  end if;
end $$;
reset role;

-- ─── 5. 두 번째 실행은 거절 ─────────────────────────────────────────────
do $$ begin
  perform pg_temp.expect_error('두 번째 실행', 'seed',
    '시연 데이터가 이미 들어 있어요. 다시 넣으려면 supabase/seed-demo-clear.sql을 먼저 실행해 주세요.');
  if (select count(*) from public.students where login_id like 'demo\_%') <> 8 then
    raise exception 'FAIL: 두 번째 실행 뒤 demo_ 학생이 8명이 아니에요';
  end if;
end $$;

-- 시연 반만 지워진 상태에서도 중복 키 오류가 아니라 같은 문구로 거절한다.
savepoint classes_gone;
delete from public.classes where id::text like 'de000002-%';
do $$ begin
  perform pg_temp.expect_error('시연 반만 지운 뒤 다시 실행', 'seed',
    '시연 데이터가 이미 들어 있어요. 다시 넣으려면 supabase/seed-demo-clear.sql을 먼저 실행해 주세요.');
end $$;
rollback to savepoint classes_gone;

-- ─── 6. 지우기 → 다시 넣기 ──────────────────────────────────────────────
-- 시연 반에 실제 학생(seed.sql의 haneul)이 배정돼 있으면 지우기를 거절하고 아무것도 지우지 않는다.
savepoint real_member;
insert into public.class_members (class_id, student_id)
values ('de000002-0000-4000-8000-000000000001', '10000000-0000-4000-8000-5ee0000000c1');
do $$ begin
  perform pg_temp.expect_error('실제 학생이 든 시연 반 지우기', 'clear',
    '시연 반에 실제 학생이 배정돼 있어요. 그 학생을 다른 반으로 먼저 옮긴 뒤 다시 실행해 주세요.');
  if (select count(*) from public.students where login_id like 'demo\_%') <> 8
     or (select count(*) from public.classes where id::text like 'de000002-%') <> 2 then
    raise exception 'FAIL: 거절된 지우기가 시연 데이터를 지웠어요';
  end if;
end $$;
rollback to savepoint real_member;

-- 반 소속에서는 빠졌지만(소속을 지워도 기록은 남는다) 시연 수업·영상에 기록이 남은 실제 학생이 있어도 거절한다:
-- 반을 지우면 그 기록도 함께 지워진다. 실제 학생 = seed.sql의 haneul(…5ee0000000c1). 기록 종류마다 한 번씩 확인한다.
do $$
declare
  v_msg constant text := '시연 수업이나 영상에 실제 학생의 기록이 남아 있어요. 그 기록을 다른 반으로 옮기거나 지운 뒤 다시 실행해 주세요.';
  v_session constant uuid := (select id from public.sessions where class_id::text like 'de000002-%' order by date limit 1);
  v_video constant uuid := '5ee00000-0000-4000-8000-0000000000f1';
  v_real constant uuid := '10000000-0000-4000-8000-5ee0000000c1';
begin
  insert into public.videos (id, class_id, title, storage_path, duration_seconds)
  values (v_video, 'de000002-0000-4000-8000-000000000001', '(예시) 점검 영상',
          'de000002-0000-4000-8000-000000000001/5ee00000-0000-4000-8000-0000000000f1.mp4', 10);

  -- 소속이 있어야 출결·숙제를 넣을 수 있으니 넣고, 기록을 넣은 뒤 소속만 뺀다.
  insert into public.class_members (class_id, student_id)
  values ('de000002-0000-4000-8000-000000000001', v_real);
  insert into public.attendance (session_id, student_id) values (v_session, v_real);
  insert into public.homework_checks (session_id, student_id) values (v_session, v_real);
  insert into public.points (student_id, session_id, amount, reason) values (v_real, v_session, 1, '(예시) 점검');
  insert into public.video_views (video_id, student_id) values (v_video, v_real);
  delete from public.class_members where student_id = v_real and class_id::text like 'de000002-%';

  -- 한 번에 한 종류만 남기고 거절을 확인한다.
  delete from public.homework_checks where student_id = v_real;
  delete from public.points where student_id = v_real;
  delete from public.video_views where student_id = v_real;
  perform pg_temp.expect_error('실제 학생 출결이 든 시연 수업 지우기', 'clear', v_msg);

  insert into public.class_members (class_id, student_id)
  values ('de000002-0000-4000-8000-000000000001', v_real);
  insert into public.homework_checks (session_id, student_id) values (v_session, v_real);
  delete from public.class_members where student_id = v_real and class_id::text like 'de000002-%';
  delete from public.attendance where student_id = v_real;
  perform pg_temp.expect_error('실제 학생 숙제가 든 시연 수업 지우기', 'clear', v_msg);
  delete from public.homework_checks where student_id = v_real;

  insert into public.points (student_id, session_id, amount, reason) values (v_real, v_session, 1, '(예시) 점검');
  perform pg_temp.expect_error('실제 학생 포인트가 든 시연 수업 지우기', 'clear', v_msg);
  delete from public.points where student_id = v_real;

  insert into public.video_views (video_id, student_id) values (v_video, v_real);
  perform pg_temp.expect_error('실제 학생 시청 기록이 든 시연 영상 지우기', 'clear', v_msg);
  delete from public.video_views where student_id = v_real;
  delete from public.videos where id = v_video;

  if (select count(*) from public.students where login_id like 'demo\_%') <> 8
     or (select count(*) from public.classes where id::text like 'de000002-%') <> 2 then
    raise exception 'FAIL: 거절된 지우기가 시연 데이터를 지웠어요';
  end if;
end $$;

-- 원장이 시연 반 이름을 실제 반으로 바꿨으면(끝이 (예시)가 아님) 지우기를 거절한다.
savepoint renamed_class;
update public.classes set name = '원장이 바꾼 반 이름'
 where id = 'de000002-0000-4000-8000-000000000001';
do $$ begin
  perform pg_temp.expect_error('이름이 바뀐 시연 반 지우기', 'clear',
    '시연 반 이름이 바뀌어 실제 반으로 보여요. 이름 끝을 (예시)로 되돌리거나 그 반을 다른 반으로 옮긴 뒤 다시 실행해 주세요.');
end $$;
rollback to savepoint renamed_class;

-- 지우기는 두 전제 학생 행(과 Auth 사용자)을 남긴다: 계정을 다시 만들지 않고 바로 다시 넣을 수 있다.
select :'clear' \gexec

do $$ begin
  if exists (select 1 from public.students where id::text like 'de00000%')
     or exists (select 1 from public.classes where id::text like 'de00000%')
     or exists (select 1 from public.questions where id::text like 'de00000%') then
    raise exception 'FAIL: 지운 뒤 de00000 행이 남아 있어요';
  end if;
  if (select array_agg(login_id order by login_id) from public.students where login_id like 'demo\_%')
     is distinct from array['demo_haneul', 'demo_minjun'] then
    raise exception 'FAIL: 지운 뒤 남은 demo_ 학생이 전제 두 명이 아니에요';
  end if;
  if exists (
    with kept as (select id from public.students where login_id in ('demo_haneul', 'demo_minjun'))
    select 1 from public.points where student_id in (select id from kept)
    union all select 1 from public.payments where student_id in (select id from kept)
    union all select 1 from public.questions where student_id in (select id from kept)
    union all select 1 from public.consents where student_id in (select id from kept)
    union all select 1 from public.student_private where student_id in (select id from kept)
    union all select 1 from public.guardian_tokens where student_id in (select id from kept)
    union all select 1 from public.class_members where student_id in (select id from kept)
    union all select 1 from public.attendance where student_id in (select id from kept)
    union all select 1 from public.homework_checks where student_id in (select id from kept)
  ) then
    raise exception 'FAIL: 지운 뒤 전제 학생의 시연 기록이 남아 있어요';
  end if;
  if exists (select 1 from public.consultations where phone in ('010-0000-0081', '010-0000-0082')) then
    raise exception 'FAIL: 지운 뒤 시연 상담이 남아 있어요';
  end if;
  if exists (select 1 from public.site_content where key not in ('points_goal', 'contact')) then
    raise exception 'FAIL: 지운 뒤 시연 site_content 예시 값이 남아 있어요';
  end if;
  if (select value from public.site_content where key = 'contact')
     is distinct from '{"phone": "063-111-2222", "address": "원장이 고친 주소"}'::jsonb then
    raise exception 'FAIL: 지우기가 원장이 고친 contact를 지웠어요';
  end if;
  if not exists (select 1 from public.students where login_id = 'haneul')
     or (select count(*) from public.class_members where class_id = '20000000-0000-4000-8000-5ee0000000a1') <> 2 then
    raise exception 'FAIL: seed.sql의 haneul 학생·반이 바뀌었어요';
  end if;
end $$;

select :'seed' \gexec

do $$ begin
  if (select count(*) from public.students where login_id like 'demo\_%') <> 8 then
    raise exception 'FAIL: 다시 넣은 뒤 demo_ 학생이 8명이 아니에요';
  end if;
  if (select count(*) from public.sessions where class_id::text like 'de000002-%') <> 24 then
    raise exception 'FAIL: 다시 넣은 뒤 시연 반 수업이 24개가 아니에요';
  end if;
  if (select coalesce(sum(p.amount), 0) from public.points p
        join public.students s on s.id = p.student_id where s.login_id = 'demo_haneul') <> 27 then
    raise exception 'FAIL: 다시 넣은 뒤 demo_haneul 포인트 합이 27이 아니에요';
  end if;
end $$;

rollback;
