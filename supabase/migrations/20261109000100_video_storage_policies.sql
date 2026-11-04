-- storage.objects 정책: 버킷 videos(설계 13장 S9, v1 스펙 §7).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/11_video_storage.test.sql, 00_meta.test.sql(storage 정책 허용 목록·공개 버킷 없음)
-- 수업 영상에는 미성년 학생이 나온다(S9). 버킷은 비공개이고, 파일 쓰기·읽기는 아래 정책이 정한다.
-- 원장(admins + aal2)은 videos 버킷 파일을 올리고(TUS 업로드) 고치고 지우고 읽는다.
-- 학생은 자기 반(퇴원 아님)에 공개된 videos 행이 가리키는 파일만 읽는다. 반 소속은 경로 문자열을 파싱하지 않고
-- videos.storage_path와 조인해서 판단한다(행이 없는 파일·공개 전 영상·지운 영상의 파일은 바로 안 보인다).
-- 학생·anon의 insert·update·delete 정책은 없다. storage.buckets에는 정책을 두지 않는다(클라이언트가 버킷 목록을 볼 일 없음).
-- signed URL 발급(createSignedUrl)은 이 SELECT 정책을 호출자 권한으로 검사한다: 볼 수 없는 파일의 URL은 받을 수 없다.

-- ─── 정책 (private.*를 부르므로 모두 to authenticated) ───────────────
create policy videos_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'videos' and (select private.is_admin()));
create policy videos_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and (select private.is_admin()));
create policy videos_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'videos' and (select private.is_admin()))
  with check (bucket_id = 'videos' and (select private.is_admin()));
create policy videos_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and (select private.is_admin()));
-- 퇴원생은 my_student_id()가 null이라 0행(spec §11). public.videos는 호출자의 RLS로 읽힌다(같은 조건을 한 번 더 건다).
create policy videos_member_select on storage.objects
  for select to authenticated
  using (bucket_id = 'videos'
         and exists (select 1 from public.videos v
                       join public.class_members m on m.class_id = v.class_id
                      where v.storage_path = storage.objects.name
                        and v.published_at <= now()
                        and m.student_id = (select private.my_student_id())));

-- ─── 파일 존재 검사: 원장만 ──────────────────────────────────────────
-- 원장이 아니면 검사하지 않고 넘긴다: videos insert 정책(RLS, 42501)이 거부한다.
-- 그렇지 않으면 학생이 없는 경로/있는 경로로 insert해 P0001과 42501을 비교해 파일 유무를 알아낼 수 있다.
-- (BEFORE 트리거는 RLS with check보다 먼저 돈다.)
create or replace function private.require_video_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    return new;
  end if;
  if not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'videos' and o.name = new.storage_path
  ) then
    raise exception '영상 파일이 아직 올라가지 않았어요. 파일을 다시 올려 주세요.';
  end if;
  return new;
end;
$$;
revoke all on function private.require_video_object() from public, anon, authenticated, service_role;
