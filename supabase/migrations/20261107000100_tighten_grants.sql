-- 권한 좁히기(설계 13장 S2·S3, v1 후속 항목). 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/00_meta.test.sql(service_role 함수 허용 목록), 04_students.test.sql, 05_classes.test.sql
-- 원장 화면이 실제로 쓰는 컬럼만 고칠 수 있게 한다. 행 제한(원장 aal2)은 기존 정책 그대로다.

-- ─── classes: update는 앱이 보내는 컬럼만 ─────────────────────────────
-- (src/features/classes/data/classes.ts updateClass: name, level, schedule, capacity)
revoke update on public.classes from authenticated;
grant update (name, level, schedule, capacity) on public.classes to authenticated;

-- ─── student_private: insert·update는 보호자 정보 컬럼만, updated_at은 트리거만 ─
-- student_id는 update에도 남긴다: 앱의 saveStudentPrivate는 PostgREST upsert라 on conflict do update set에
-- payload 컬럼(student_id 포함)을 모두 넣는다. 행은 정책이 원장으로 제한한다.
revoke insert, update on public.student_private from authenticated;
grant insert (student_id, school, guardian_name, guardian_phone, memo) on public.student_private to authenticated;
grant update (student_id, school, guardian_name, guardian_phone, memo) on public.student_private to authenticated;

-- ─── 화면용 함수는 service_role이 부를 일이 없다 ─────────────────────
revoke execute on function public.my_role() from service_role;
revoke execute on function public.password_changed() from service_role;
