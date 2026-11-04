-- 시연 데이터(supabase/seed-demo.sql) 지우기. 대시보드 SQL Editor에 이 파일 전체를 붙여 넣고 한 번에 실행해요.
-- 언제: Pro로 바꾸기 전, 그리고 시연 데이터를 다시 넣기 전(QA로 바뀐 상태를 시연 전날 밤 처음으로 돌릴 때).
--
-- 지우는 것: 시연 반 2개(de000002-…)와 거기 딸린 수업·출결·숙제·자동 포인트·영상 행·시청 기록,
--   시드가 넣은 학생 6명(de000001-…)과 그 학생들의 모든 기록,
--   두 전제 학생(demo_haneul·demo_minjun)의 포인트·수납·질문(답변 포함)·동의·민감 정보·학부모 링크,
--   시연 상담 2건(010-0000-0081·0082), 시드가 넣은 값 그대로인 랜딩 문구.
-- 남는 것:
--   두 전제 학생 행과 그 로그인 계정(바로 seed-demo.sql을 다시 넣을 수 있게). 이름·학년은 시드 값 그대로예요.
--     공개 전(런북 §9)에는 이 파일 다음에 SQL Editor에서 두 학생 행을 지우고
--     (delete from public.students where login_id in ('demo_haneul','demo_minjun') returning login_id; — 2행),
--     Authentication의 demo_haneul@student.heesu.internal·demo_minjun@student.heesu.internal 사용자도 지워요.
--   Storage videos 버킷의 시연 영상 파일(대시보드 Storage에서 지워요. 영상 행은 위에서 지워진다).
--   원장이 고친 랜딩 문구(시드 값과 다르면 건드리지 않는다)와 points_goal.
--   private.audit_log(추가만 하는 기록이라 지우지 않아요).
-- 시연 반에 실제 학생이 배정돼 있거나, 시연 수업·영상에 실제 학생의 기록이 있거나, 시연 반 이름 끝이 (예시)가 아니면 아무것도 지우지 않고 멈춰요(문구대로 고친 뒤 다시 실행해요).
-- 스키마를 바꾸지 않아요. 다시 실행해도 지울 것이 없으면 아무 일도 없어요.

-- 가드: 원장이 시연 반에 실제 학생을 배정했으면 아무것도 지우지 않는다(반을 지우면 그 학생의 출결·숙제도 함께 지워진다).
do $$
begin
  if exists (
    select 1
      from public.class_members m
      join public.students s on s.id = m.student_id
     where m.class_id::text like 'de000002-%'
       and s.id::text not like 'de000001-%'
       and s.login_id not in ('demo_haneul', 'demo_minjun')
  ) then
    raise exception '시연 반에 실제 학생이 배정돼 있어요. 그 학생을 다른 반으로 먼저 옮긴 뒤 다시 실행해 주세요.';
  end if;
end $$;

-- 가드 2: 반 소속에서는 빠졌어도 시연 수업·영상에 기록이 남은 실제 학생이 있으면 멈춘다(반을 지우면 그 기록도 함께 지워진다).
do $$
begin
  if exists (
    select 1
      from (
        select a.student_id from public.attendance a join public.sessions x on x.id = a.session_id where x.class_id::text like 'de000002-%'
        union all
        select h.student_id from public.homework_checks h join public.sessions x on x.id = h.session_id where x.class_id::text like 'de000002-%'
        union all
        select p.student_id from public.points p join public.sessions x on x.id = p.session_id where x.class_id::text like 'de000002-%'
        union all
        select v.student_id from public.video_views v join public.videos m on m.id = v.video_id where m.class_id::text like 'de000002-%'
      ) r
      join public.students s on s.id = r.student_id
     where s.id::text not like 'de000001-%'
       and s.login_id not in ('demo_haneul', 'demo_minjun')
  ) then
    raise exception '시연 수업이나 영상에 실제 학생의 기록이 남아 있어요. 그 기록을 다른 반으로 옮기거나 지운 뒤 다시 실행해 주세요.';
  end if;
end $$;

-- 가드 3: 시연 반 이름 끝이 (예시)가 아니면 원장이 실제 반으로 바꾼 것일 수 있어 멈춘다.
do $$
begin
  if exists (
    select 1 from public.classes where id::text like 'de000002-%' and name not like '%(예시)'
  ) then
    raise exception '시연 반 이름이 바뀌어 실제 반으로 보여요. 이름 끝을 (예시)로 되돌리거나 그 반을 다른 반으로 옮긴 뒤 다시 실행해 주세요.';
  end if;
end $$;

-- 반을 지우면 소속·수업(→ 출결·숙제·자동 포인트)·영상(→ 시청 기록)이 함께 지워지고, 질문의 수업·영상 연결은 끊긴다.
delete from public.classes where id::text like 'de000002-%';

-- 시드가 넣은 6명: 민감 정보·동의·포인트·수납·질문·학부모 링크가 함께 지워진다.
delete from public.students where id::text like 'de000001-%';

-- 두 전제 학생은 남기고 시연 중에 쌓인 기록만 지운다(시드가 넣은 것과 QA에서 만든 것 모두).
delete from public.points
 where student_id in (select id from public.students where login_id in ('demo_haneul', 'demo_minjun'));
delete from public.payments
 where student_id in (select id from public.students where login_id in ('demo_haneul', 'demo_minjun'));
delete from public.questions
 where student_id in (select id from public.students where login_id in ('demo_haneul', 'demo_minjun'));
delete from public.consents
 where student_id in (select id from public.students where login_id in ('demo_haneul', 'demo_minjun'));
delete from public.student_private
 where student_id in (select id from public.students where login_id in ('demo_haneul', 'demo_minjun'));
delete from public.guardian_tokens
 where student_id in (select id from public.students where login_id in ('demo_haneul', 'demo_minjun'));

delete from public.consultations
 where phone in ('010-0000-0081', '010-0000-0082') and parent_name like '(예시)%';

-- 랜딩 문구는 seed-demo.sql 10번과 같은 값일 때만 지운다(원장이 고친 값은 남는다). points_goal은 설정값이라 남긴다.
delete from public.site_content c
 using (values
   ('notice', '{"title": "(예시) 12월 상담 안내", "body": "(예시) 원장이 실제 공지로 바꿔요.", "visible": true}'),
   ('classes', '[
      {"name": "중등 기초반 (예시)", "grades": "(예시) 중1·중2", "schedule": "(예시) 월·수·금 17:00–19:00", "capacity": 8},
      {"name": "고등 독해반 (예시)", "grades": "(예시) 고1·고2", "schedule": "(예시) 화·목 19:00–21:00, 일 14:00–16:00", "capacity": 8}
    ]'),
   ('tuition', '{"monthly": "(예시) 중등 월 25만 원, 고등 월 30만 원", "textbook": "(예시) 교재비 별도", "note": "(예시) 원장이 실제 수강료로 바꿔요."}'),
   ('contact', '{"phone": "063-000-0000", "address": "(예시) 전북 전주시 OO구 OO로 00"}'),
   ('legal', '{"academy_name": "(예시) 학원 이름", "registration_no": "(예시) 제0000-00호", "subjects": "(예시) 영어", "tuition_notice": "(예시) 원장이 실제 교습비 게시 문구로 바꿔요."}')
 ) as v(key, value)
 where c.key = v.key and c.value = v.value::jsonb;
