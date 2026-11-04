-- 클라우드 시연용 가짜 데이터. 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다(설계 13장 S14).
-- 이름·글은 모두 (예시)를 붙인 가짜이고, 전화는 010-0000-00xx예요. 실제 사람·연락처는 넣지 않아요.
-- 시연이 끝나고 Pro로 바꿀 때 supabase/seed-demo-clear.sql로 지워요.
--
-- 넣는 법:
--   1) 원장 화면 학생 추가로 demo_haneul·demo_minjun 두 학생을 먼저 만들어요(이름·학년은 이 파일이 바꿔요).
--   2) 대시보드 SQL Editor에 이 파일 전체를 붙여 넣고 한 번에 실행해요(한 트랜잭션: 중간에 실패하면 아무것도 남지 않아요).
--   날짜는 모두 실행한 날의 서울 날짜 기준이에요. 시연 전날 밤에 넣으면 빈 날이 없어요.
--   다시 넣으려면 seed-demo-clear.sql을 먼저 실행해요(이미 들어 있으면 이 파일이 거절해요).
-- 넣지 않는 것: 로그인 계정·비밀번호, 원장 계정, 영상·시청 기록, 학부모 링크 토큰(원장 화면에서 만들어요).
-- 로컬 검사: npm run db:demo-check (로컬 DB에서 넣기·거절·지우기·다시 넣기를 해 보고 rollback해요).
--
-- 스키마를 바꾸지 않아요(트리거를 끄지 않는다). 학생 질문은 그 학생으로 로그인한 것처럼 넣어서
-- 실제 앱과 같은 트리거·권한을 거쳐요(이 트랜잭션 안에서만, 끝에서 원래 역할로 돌아와요).

-- ─── 1. 가드 ─────────────────────────────────────────────────────────
-- 문장을 하나씩 따로 실행하는 도구면(트랜잭션 없이) 아무것도 쓰기 전에 멈춘다.
do $$
begin
  perform set_config('heesu.demo_seed_probe', 'on', true);
end $$;
do $$
begin
  if current_setting('heesu.demo_seed_probe', true) is distinct from 'on' then
    raise exception '시연 데이터는 파일 전체를 한 번에 실행해야 해요. SQL Editor에 파일 전체를 붙여 넣고 실행해 주세요.';
  end if;
  if exists (select 1 from public.classes where id::text like 'de000002-%') then
    raise exception '시연 데이터가 이미 들어 있어요. 다시 넣으려면 supabase/seed-demo-clear.sql을 먼저 실행해 주세요.';
  end if;
  if (select count(*) from public.students
       where login_id in ('demo_haneul', 'demo_minjun') and user_id is not null) <> 2 then
    raise exception '시연용 학생 계정 demo_haneul·demo_minjun을 원장 화면 학생 추가로 먼저 만들어 주세요.';
  end if;
end $$;

-- ─── 2. 학생 ─────────────────────────────────────────────────────────
-- 두 전제 학생(로그인 계정 있음)은 이름·학년·등록일만 바꾼다. 나머지 6명은 로그인 계정 없이 넣는다.
update public.students s
   set name = v.name, grade = v.grade::public.school_grade,
       joined_at = (now() at time zone 'Asia/Seoul')::date - 35
  from (values
    ('demo_haneul', '김하늘 (예시)', '중2'),
    ('demo_minjun', '이민준 (예시)', '고1')
  ) as v(login_id, name, grade)
 where s.login_id = v.login_id;

insert into public.students (id, user_id, login_id, name, grade, joined_at, must_change_password)
select v.id::uuid, null, v.login_id, v.name, v.grade::public.school_grade,
       (now() at time zone 'Asia/Seoul')::date - 35, true
  from (values
    ('de000001-0000-4000-8000-000000000003', 'demo_seoyeon', '박서연 (예시)', '중2'),
    ('de000001-0000-4000-8000-000000000004', 'demo_jiwoo', '최지우 (예시)', '중1'),
    ('de000001-0000-4000-8000-000000000005', 'demo_siwoo', '윤시우 (예시)', '중2'),
    ('de000001-0000-4000-8000-000000000006', 'demo_doyun', '정도윤 (예시)', '고1'),
    ('de000001-0000-4000-8000-000000000007', 'demo_yuna', '강유나 (예시)', '고2'),
    ('de000001-0000-4000-8000-000000000008', 'demo_harin', '한하린 (예시)', '고1')
  ) as v(id, login_id, name, grade);

-- ─── 3. 학생 민감 정보·법정대리인 동의 (가짜) ────────────────────────────
insert into public.student_private (student_id, school, guardian_name, guardian_phone, memo)
select s.id,
       case when s.grade::text like '중%' then '(예시) 가짜중학교' else '(예시) 가짜고등학교' end,
       '(예시) 보호자', v.phone, v.memo
  from (values
    ('demo_haneul', '010-0000-0011', '(예시) 단어 암기가 빨라요.'),
    ('demo_minjun', '010-0000-0012', null),
    ('demo_seoyeon', '010-0000-0013', null),
    ('demo_jiwoo', '010-0000-0014', null),
    ('demo_siwoo', '010-0000-0015', null),
    ('demo_doyun', '010-0000-0016', null),
    ('demo_yuna', '010-0000-0017', null),
    ('demo_harin', '010-0000-0018', null)
  ) as v(login_id, phone, memo)
  join public.students s on s.login_id = v.login_id;

-- 민준·하린은 동의 기록 없음(원장 화면의 "동의 없음" 표시 시연용).
insert into public.consents (student_id, guardian_name, method, version, consented_at)
select s.id, '(예시) 보호자', v.method::public.consent_method, '(예시) 2026-11',
       (((now() at time zone 'Asia/Seoul')::date - 35) + time '18:00') at time zone 'Asia/Seoul'
  from (values
    ('demo_haneul', 'written'),
    ('demo_seoyeon', 'kakao'),
    ('demo_jiwoo', 'written'),
    ('demo_siwoo', 'kakao'),
    ('demo_doyun', 'written'),
    ('demo_yuna', 'kakao')
  ) as v(login_id, method)
  join public.students s on s.login_id = v.login_id;

-- ─── 4. 반·반 배정 ───────────────────────────────────────────────────
-- day는 ISO 요일(1=월 … 7=일). 고등반의 일요일 칸은 시연일(일요일) "오늘" 화면에 반이 뜨게 하려는 것(원장이 지우면 돼요).
insert into public.classes (id, name, level, schedule, capacity) values
  ('de000002-0000-4000-8000-000000000001', '중등 기초반 (예시)', 'middle',
   '[{"day":1,"start":"17:00","end":"19:00"},{"day":3,"start":"17:00","end":"19:00"},{"day":5,"start":"17:00","end":"19:00"}]', 8),
  ('de000002-0000-4000-8000-000000000002', '고등 독해반 (예시)', 'high',
   '[{"day":2,"start":"19:00","end":"21:00"},{"day":4,"start":"19:00","end":"21:00"},{"day":7,"start":"14:00","end":"16:00"}]', 8);

-- 배정 시각을 35일 전으로: 학부모 화면은 배정한 날 이후 수업만 보여 줘요.
insert into public.class_members (class_id, student_id, created_at)
select v.class_id::uuid, s.id, now() - interval '35 days'
  from (values
    ('de000002-0000-4000-8000-000000000001', 'demo_haneul'),
    ('de000002-0000-4000-8000-000000000001', 'demo_seoyeon'),
    ('de000002-0000-4000-8000-000000000001', 'demo_jiwoo'),
    ('de000002-0000-4000-8000-000000000001', 'demo_siwoo'),
    ('de000002-0000-4000-8000-000000000002', 'demo_minjun'),
    ('de000002-0000-4000-8000-000000000002', 'demo_doyun'),
    ('de000002-0000-4000-8000-000000000002', 'demo_yuna'),
    ('de000002-0000-4000-8000-000000000002', 'demo_harin')
  ) as v(class_id, login_id)
  join public.students s on s.login_id = v.login_id;

-- ─── 5. 지난 4주 수업 ────────────────────────────────────────────────
-- 서울 오늘-28 ~ 오늘-1의 시간표 요일마다 하나(요일마다 정확히 4번 → 반마다 12개).
-- 오늘 수업은 넣지 않아요(오늘 화면에서 "수업 시작"을 눌러 볼 수 있게).
-- 숙제 마감 = 그다음 수업일(수업 다음 날부터 7일 안의 첫 시간표 요일). 내용·숙제는 반 안의 수업 순서로 돌려 써요.
insert into public.sessions (class_id, date, summary, homework, homework_due)
select c.id, d.day,
       (array['(예시) 현재완료 문장 만들기', '(예시) 관계대명사 who·which 연습', '(예시) 독해 지문 요약하기',
              '(예시) 수동태 바꿔 쓰기', '(예시) to부정사와 동명사 구별하기', '(예시) 단어 시험과 오답 정리'])
         [((row_number() over (partition by c.id order by d.day) - 1) % 6 + 1)::int],
       (array['(예시) 교과서 3과 단어 20개 외우기', '(예시) 문법 문제집 12~13쪽 풀기',
              '(예시) 지문 한 개 읽고 세 줄 요약 쓰기', '(예시) 수동태 문장 10개 바꿔 쓰기',
              '(예시) 워크북 5과 풀기', '(예시) 틀린 단어 3번씩 쓰기'])
         [((row_number() over (partition by c.id order by d.day) - 1) % 6 + 1)::int],
       (select min(d.day + i)
          from generate_series(1, 7) as i
         where extract(isodow from d.day + i)::int in
               (select (e ->> 'day')::int from jsonb_array_elements(c.schedule) as e))
  from public.classes c
 cross join (select (now() at time zone 'Asia/Seoul')::date - i as day from generate_series(1, 28) as i) as d
 where c.id::text like 'de000002-%'
   and extract(isodow from d.day)::int in (select (e ->> 'day')::int from jsonb_array_elements(c.schedule) as e);

-- ─── 6. 출결·숙제 ────────────────────────────────────────────────────
-- 학생·수업 순번(k = 반 안의 학생 순서(아이디순), n = 그 학생의 수업 순서)으로 정해지는 패턴(seed.sql과 같다).
-- 반마다 가장 최근 수업은 전원 출석·숙제 미판정(none). demo_haneul은 그 숙제를 2시간 전에 냈고,
-- 바로 앞 수업 숙제는 미완료(목록 위에 남는 숙제 시연용).
-- 출결·숙제를 넣으면 트리거가 자동 포인트(출석·숙제 완료 +1)를 만들어요.
insert into public.attendance (session_id, student_id, status)
select session_id, student_id,
       (case
          when back = 1 then 'present'
          else case (n + k) % 6 when 0 then 'late' when 2 then 'absent' when 4 then 'makeup' else 'present' end
        end)::public.attendance_status
  from (select se.id as session_id, m.student_id,
               row_number() over (partition by m.student_id order by se.date) as n,
               row_number() over (partition by m.student_id order by se.date desc) as back,
               dense_rank() over (partition by se.class_id order by st.login_id) as k
          from public.sessions se
          join public.class_members m on m.class_id = se.class_id
          join public.students st on st.id = m.student_id
         where se.class_id::text like 'de000002-%') as marks;

insert into public.homework_checks (session_id, student_id, status, submitted_at)
select session_id, student_id,
       (case
          when back = 1 then 'none'
          when back = 2 and login_id = 'demo_haneul' then 'missing'
          else case (n + 2 * k) % 5 when 0 then 'missing' when 3 then 'none' else 'done' end
        end)::public.homework_status,
       case when back = 1 and login_id = 'demo_haneul' then now() - interval '2 hours' end
  from (select se.id as session_id, m.student_id, st.login_id,
               row_number() over (partition by m.student_id order by se.date) as n,
               row_number() over (partition by m.student_id order by se.date desc) as back,
               dense_rank() over (partition by se.class_id order by st.login_id) as k
          from public.sessions se
          join public.class_members m on m.class_id = se.class_id
          join public.students st on st.id = m.student_id
         where se.class_id::text like 'de000002-%') as marks;

-- ─── 7. 수동 포인트 ──────────────────────────────────────────────────
-- demo_haneul 누적 = 27(목표 30): 시연에서 원장이 +3을 주면 학생 화면에서 축하가 한 번 떠요.
do $$
declare
  v_student_id uuid;
  v_amount int;
begin
  select id into v_student_id from public.students where login_id = 'demo_haneul';
  select 27 - coalesce(sum(amount), 0) into v_amount from public.points where student_id = v_student_id;
  if v_amount = 0 or v_amount not between -100 and 100 then
    raise exception '김하늘 (예시)의 포인트 보정 값(%)을 넣을 수 없어요. seed-demo-clear.sql을 실행한 뒤 다시 넣어 주세요.', v_amount;
  end if;
  insert into public.points (student_id, amount, reason)
  values (v_student_id, v_amount, '(예시) 단어 시험 보너스');
end $$;

insert into public.points (student_id, amount, reason)
select s.id, v.amount, v.reason
  from (values
    ('demo_seoyeon', 2, '(예시) 발표 참여'),
    ('demo_doyun', -1, '(예시) 숙제 늦게 냄')
  ) as v(login_id, amount, reason)
  join public.students s on s.login_id = v.login_id;

-- ─── 8. 질문·답변 ────────────────────────────────────────────────────
-- 질문은 그 학생으로 로그인한 것처럼 넣는다(트리거 questions_prepare가 student_id를 정하고 반 수업인지 검사한다).
-- 학생은 id 컬럼을 쓸 수 없어서, 원래 역할로 돌아온 뒤 고정 id(de000003-…)로 바꾼다(아직 답변이 없어 참조가 없다).
do $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select user_id from public.students where login_id = 'demo_haneul'),
                      'role', 'authenticated')::text, true);
end $$;
set local role authenticated;
insert into public.questions (body, session_id)
select '(예시) 현재완료랑 과거형 차이를 잘 모르겠어요.', se.id
  from public.sessions se
 where se.class_id = 'de000002-0000-4000-8000-000000000001'
 order by se.date desc
 limit 1;
reset role;

do $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select user_id from public.students where login_id = 'demo_minjun'),
                      'role', 'authenticated')::text, true);
end $$;
set local role authenticated;
insert into public.questions (body, session_id)
select '(예시) 3번 문장 해석이 맞는지 궁금해요.', se.id
  from public.sessions se
 where se.class_id = 'de000002-0000-4000-8000-000000000002'
 order by se.date desc
 limit 1;
reset role;

-- 아래 쓰기(감사 로그 actor)가 학생으로 남지 않게 로그인 흉내를 지운다.
do $$
begin
  perform set_config('request.jwt.claims', '', true);
end $$;

update public.questions q
   set id = v.id::uuid
  from (values
    ('de000003-0000-4000-8000-000000000001', 'demo_haneul', '(예시) 현재완료랑 과거형 차이를 잘 모르겠어요.'),
    ('de000003-0000-4000-8000-000000000002', 'demo_minjun', '(예시) 3번 문장 해석이 맞는지 궁금해요.')
  ) as v(id, login_id, body)
  join public.students s on s.login_id = v.login_id
 where q.student_id = s.id and q.body = v.body;

-- 하늘 질문에만 답변(트리거가 answered_at을 채운다). 민준 질문은 미답변.
insert into public.answers (question_id, body) values
  ('de000003-0000-4000-8000-000000000001', '(예시) 다음 수업 때 예문으로 같이 볼게요.');

-- ─── 9. 상담 신청·수납 기록 (가짜) ─────────────────────────────────────
insert into public.consultations (parent_name, phone, grade, message, status, memo, consent_version, consented_at, created_at) values
  ('(예시) 박보호', '010-0000-0081', '중1', null, 'new', null, '2026-11-05',
   now() - interval '1 day', now() - interval '1 day'),
  ('(예시) 최보호', '010-0000-0082', '고1', null, 'contacted', '(예시) 다음 주 방문 상담', '2026-11-05',
   now() - interval '3 days', now() - interval '3 days');

-- 서울 기준 지난달은 8명 모두 납부(그달 5일), 이번 달은 6명(정도윤·강유나 행 없음), 그중 한하린은 미납.
-- 이번 달 납부일은 그달 5일(오늘이 5일 전이면 오늘). 수기 기록이라 실제 결제와 무관해요.
insert into public.payments (student_id, month, amount, paid_at, memo)
select s.id, to_char((now() at time zone 'Asia/Seoul') - interval '1 month', 'YYYY-MM'),
       case when s.grade::text like '중%' then 250000 else 300000 end,
       (date_trunc('month', (now() at time zone 'Asia/Seoul') - interval '1 month') + interval '4 days')::date,
       '(예시) 계좌이체'
  from public.students s
 where s.login_id in ('demo_haneul', 'demo_minjun', 'demo_seoyeon', 'demo_jiwoo',
                      'demo_siwoo', 'demo_doyun', 'demo_yuna', 'demo_harin')
union all
select s.id, to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM'),
       case when s.grade::text like '중%' then 250000 else 300000 end,
       case when s.login_id <> 'demo_harin' then
         least((date_trunc('month', now() at time zone 'Asia/Seoul') + interval '4 days')::date,
               (now() at time zone 'Asia/Seoul')::date)
       end,
       '(예시) 계좌이체'
  from public.students s
 where s.login_id in ('demo_haneul', 'demo_minjun', 'demo_seoyeon', 'demo_jiwoo', 'demo_siwoo', 'demo_harin');

-- ─── 10. 랜딩 문구 ───────────────────────────────────────────────────
-- 원장이 실제 값으로 바꿀 자리예요. 모든 글에 (예시)를 붙여요.
-- seed-demo-clear.sql은 이 값 그대로인 행만 지워요(원장이 고친 값은 남는다) — 바꾸면 그 파일도 같이 바꿔요.
insert into public.site_content (key, value) values
  ('notice', '{"title": "(예시) 12월 상담 안내", "body": "(예시) 원장이 실제 공지로 바꿔요.", "visible": true}'),
  ('classes', '[
     {"name": "중등 기초반 (예시)", "grades": "(예시) 중1·중2", "schedule": "(예시) 월·수·금 17:00–19:00", "capacity": 8},
     {"name": "고등 독해반 (예시)", "grades": "(예시) 고1·고2", "schedule": "(예시) 화·목 19:00–21:00, 일 14:00–16:00", "capacity": 8}
   ]'),
  ('tuition', '{"monthly": "(예시) 중등 월 25만 원, 고등 월 30만 원", "textbook": "(예시) 교재비 별도", "note": "(예시) 원장이 실제 수강료로 바꿔요."}'),
  ('contact', '{"phone": "063-000-0000", "address": "(예시) 전북 전주시 OO구 OO로 00"}'),
  ('legal', '{"academy_name": "(예시) 학원 이름", "registration_no": "(예시) 제0000-00호", "subjects": "(예시) 영어", "tuition_notice": "(예시) 원장이 실제 교습비 게시 문구로 바꿔요."}'),
  ('points_goal', '30')
on conflict (key) do update set value = excluded.value;
