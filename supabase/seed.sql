-- 가짜 데이터만 넣어요. 실제 이름·연락처·이메일·운영 데이터 덤프는 절대 넣지 않아요 (공개 저장소, 설계 13장 S14).

-- 랜딩 문구: 로컬 확인용 명백한 가짜 값이에요. 모든 값에 (예시)를 붙여요.
insert into public.site_content (key, value) values
  ('notice', '{"title": "(예시) 공지 제목", "body": "(예시) 공지 내용이에요.", "visible": false}'),
  ('classes', '[
     {"name": "(예시) 중등 기초반", "grades": "(예시) 중1·중2", "schedule": "(예시) 월·수 17:00–19:00", "capacity": 8},
     {"name": "(예시) 고등 독해반", "grades": "(예시) 고1·고2", "schedule": "(예시) 화·목 19:00–21:00", "capacity": null}
   ]'),
  ('tuition', '{"monthly": "(예시) 월 00만 원", "textbook": "(예시) 교재비 별도", "note": "(예시) 수강료 안내 문구예요."}'),
  ('contact', '{"phone": "063-000-0000", "address": "전북 전주시 (예시 주소)"}'),
  ('legal', '{"academy_name": "(예시) 희수영어", "registration_no": "(예시) 제0000-00호", "subjects": "(예시) 영어", "tuition_notice": "(예시) 교습비 게시 문구예요."}');

-- ─── 로컬 로그인 계정 (가짜, 로컬 전용) ───────────────────────────────
-- 아래 비밀번호는 로컬 확인용으로 공개된 값이에요. 클라우드에는 시드를 넣지 않아요(계획 7).
--   원장 admin@example.test / local-admin-pass-1234 (첫 로그인 때 TOTP를 등록해요)
--   학생 haneul / student-pass-1, minjun / student-pass-1 (로그인하면 새 비밀번호를 정해요)
-- 토큰 컬럼이 NULL이면 GoTrue 로그인이 깨져서 ''로 넣어요.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt(u.pw, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-5ee0000000a1'::uuid, 'admin@example.test', 'local-admin-pass-1234'),
  ('00000000-0000-4000-8000-5ee0000000c1'::uuid, 'haneul@student.heesu.internal', 'student-pass-1'),
  ('00000000-0000-4000-8000-5ee0000000d1'::uuid, 'minjun@student.heesu.internal', 'student-pass-1')
) as u(id, email, pw);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.id in ('00000000-0000-4000-8000-5ee0000000a1', '00000000-0000-4000-8000-5ee0000000c1',
               '00000000-0000-4000-8000-5ee0000000d1');

insert into private.admins (user_id) values ('00000000-0000-4000-8000-5ee0000000a1');

-- ─── 학생·반 (가짜) ──────────────────────────────────────────────────
insert into public.students (id, user_id, login_id, name, grade, must_change_password) values
  ('10000000-0000-4000-8000-5ee0000000c1', '00000000-0000-4000-8000-5ee0000000c1', 'haneul', '김하늘', '중2', true),
  ('10000000-0000-4000-8000-5ee0000000d1', '00000000-0000-4000-8000-5ee0000000d1', 'minjun', '이민준', '고1', true),
  -- 로그인 계정이 없는 학생(출결 표를 채우는 용도)
  ('10000000-0000-4000-8000-5ee0000000e1', null, 'seoyeon', '박서연', '중2', true),
  ('10000000-0000-4000-8000-5ee0000000f1', null, 'doyun', '정도윤', '고1', true);

insert into public.student_private (student_id, school, guardian_name, guardian_phone, memo) values
  ('10000000-0000-4000-8000-5ee0000000c1', '(예시) 가짜중학교', '(예시) 보호자', '010-0000-0000', '(예시) 메모예요.');

-- day는 ISO 요일(1=월 … 7=일).
insert into public.classes (id, name, level, schedule, capacity) values
  ('20000000-0000-4000-8000-5ee0000000a1', '중등 기초반', 'middle',
   '[{"day":1,"start":"17:00","end":"19:00"},{"day":3,"start":"17:00","end":"19:00"}]', 8),
  ('20000000-0000-4000-8000-5ee0000000b1', '고등 독해반', 'high',
   '[{"day":2,"start":"19:00","end":"21:00"},{"day":4,"start":"19:00","end":"21:00"}]', null);

insert into public.class_members (class_id, student_id) values
  ('20000000-0000-4000-8000-5ee0000000a1', '10000000-0000-4000-8000-5ee0000000c1'),
  ('20000000-0000-4000-8000-5ee0000000a1', '10000000-0000-4000-8000-5ee0000000e1'),
  ('20000000-0000-4000-8000-5ee0000000b1', '10000000-0000-4000-8000-5ee0000000d1'),
  ('20000000-0000-4000-8000-5ee0000000b1', '10000000-0000-4000-8000-5ee0000000f1');

-- ─── 지난 3주 수업·출결·숙제 (가짜) ──────────────────────────────────
-- 어제까지 시간표 요일마다 수업 하나. 오늘 수업은 넣지 않아요(오늘 화면에서 "수업 시작"을 눌러 볼 수 있게).
-- 숙제 마감 = 그다음 수업일(수업 다음 날부터 7일 안의 첫 시간표 요일).
insert into public.sessions (class_id, date, summary, homework, homework_due)
select c.id, d::date, '(예시) 수업 내용이에요.', '(예시) 단어 20개 외우기',
       (select min(n::date)
          from generate_series(d + interval '1 day', d + interval '7 days', interval '1 day') n
         where extract(isodow from n)::int in (select (e->>'day')::int from jsonb_array_elements(c.schedule) e))
  from public.classes c
 cross join generate_series(current_date - 21, current_date - 1, interval '1 day') d
 where extract(isodow from d)::int in (select (e->>'day')::int from jsonb_array_elements(c.schedule) e);

-- 학생·수업 순번(k = 반 안의 학생 순서, n = 그 학생의 수업 순서)으로 정해지는 패턴:
-- 출석이 대부분, 지각·결석·보강은 학생마다 하나씩. 숙제는 완료·미완료·미입력이 섞여요.
-- 출결·숙제를 넣으면 트리거가 자동 포인트(출석·숙제 완료)를 만들어요.
create temporary table seed_marks as
select s.id as session_id, m.student_id,
       row_number() over (partition by m.student_id order by s.date) as n,
       dense_rank() over (partition by s.class_id order by m.student_id) as k
  from public.sessions s
  join public.class_members m on m.class_id = s.class_id;

insert into public.attendance (session_id, student_id, status)
select session_id, student_id,
       (case (n + k) % 6 when 0 then 'late' when 2 then 'absent' when 4 then 'makeup' else 'present' end)::public.attendance_status
  from seed_marks;

insert into public.homework_checks (session_id, student_id, status)
select session_id, student_id,
       (case (n + 2 * k) % 5 when 0 then 'missing' when 3 then 'none' else 'done' end)::public.homework_status
  from seed_marks;

drop table seed_marks;

-- 수동 가감 하나
insert into public.points (student_id, amount, reason) values
  ('10000000-0000-4000-8000-5ee0000000c1', 2, '(예시) 발표 참여');
