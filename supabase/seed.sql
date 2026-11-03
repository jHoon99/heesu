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
