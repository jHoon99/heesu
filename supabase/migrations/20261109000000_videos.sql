-- 수업 영상(videos)·시청 기록(video_views)·버킷 videos·시청 저장 RPC(설계 13장 S1·S3·S9, v1 스펙 §7).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/10_videos.test.sql, 00_meta.test.sql(함수 허용 목록)
-- 수업 영상에는 미성년 학생이 나온다(S9): 버킷은 비공개, 학생은 자기 반(퇴원 아님)에 공개된 영상만 읽는다.
-- 영상 행 쓰기는 원장(admins + aal2)만. 반·경로·길이는 만든 뒤 바꿀 수 없다(제목·공개일만).
-- 시청 기록 쓰기는 save_video_progress 하나뿐이다(스펙 §7의 학생 insert·update grant보다 엄격하다, S3).
-- 감사 대상 아님(spec §7 목록에 없다). service_role(Edge Function)은 이 테이블들을 쓰지 않으므로 권한을 주지 않는다.
-- storage.objects 정책(업로드·재생 URL 발급)은 다음 마이그레이션에서 만든다.

-- ─── 버킷 ───────────────────────────────────────────────────────────
-- config.toml이 아니라 마이그레이션에서 만든다: 클라우드 db push에도 같은 버킷이 생기게.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 1073741824, array['video/mp4']);

-- ─── 테이블 ─────────────────────────────────────────────────────────
-- 제목은 한 줄: 줄바꿈을 포함한 제어 문자 전부 금지(앱은 hasControlChars로 먼저 막는다).
-- 경로는 <class_id>/<uuid>.mp4(newStoragePath). '..'·다른 확장자·하위 폴더를 막는다.
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  title text not null,
  storage_path text not null unique,
  duration_seconds int not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (char_length(btrim(title)) between 1 and 100 and title !~ '[[:cntrl:]]'),
  check (duration_seconds between 1 and 21600),
  check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.mp4$')
);
alter table public.videos enable row level security;
create index videos_class_id_published_at_idx on public.videos (class_id, published_at desc);

-- position_seconds: 이어 보기용 마지막 위치. watched_seconds: 끊김 없이 본 가장 먼 위치(시청 현황·진행률, 줄지 않는다).
create table public.video_views (
  video_id uuid references public.videos on delete cascade,
  student_id uuid references public.students on delete cascade,
  watched_seconds int not null default 0 check (watched_seconds >= 0),
  position_seconds int not null default 0 check (position_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (video_id, student_id)
);
alter table public.video_views enable row level security;
create index video_views_student_id_idx on public.video_views (student_id);

create trigger video_views_set_updated_at
  before update on public.video_views
  for each row execute function private.set_updated_at();

-- ─── 파일 존재 검사 ──────────────────────────────────────────────────
-- 파일을 먼저 올리고 행을 만든다: 버킷에 파일이 없는 행은 거부한다(P0001, 화면에 문구를 그대로 보여 준다).
-- security definer인 이유: 원장의 storage.objects 읽기 정책이 없어도(또는 바뀌어도) 파일 유무를 봐야 한다.
-- 트리거 전용이라 실행 권한은 아무에게도 주지 않는다(트리거는 실행 권한 없이도 불린다).
create function private.require_video_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger videos_require_object
  before insert on public.videos
  for each row execute function private.require_video_object();

-- ─── 권한 ───────────────────────────────────────────────────────────
-- 플랫폼 기본값에 기대지 않는다: 모두 회수한 뒤 필요한 것만 준다.
revoke all on public.videos from anon, authenticated, service_role;
revoke all on public.video_views from anon, authenticated, service_role;

-- authenticated: 행은 아래 정책이 거른다. 반·경로·길이는 바꿀 수 없다.
grant select, delete on public.videos to authenticated;
grant insert (class_id, title, storage_path, duration_seconds, published_at) on public.videos to authenticated;
grant update (title, published_at) on public.videos to authenticated;
-- 쓰기는 save_video_progress만.
grant select on public.video_views to authenticated;

-- ─── 정책 (private.*를 부르므로 모두 to authenticated) ───────────────
create policy videos_admin_select on public.videos
  for select to authenticated
  using ((select private.is_admin()));
create policy videos_admin_insert on public.videos
  for insert to authenticated
  with check ((select private.is_admin()));
create policy videos_admin_update on public.videos
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy videos_admin_delete on public.videos
  for delete to authenticated
  using ((select private.is_admin()));
-- 퇴원생은 my_student_id()가 null이라 0행(spec §11). 공개일 전 영상은 안 보인다.
create policy videos_member_select on public.videos
  for select to authenticated
  using (published_at <= now()
         and exists (select 1 from public.class_members m
                      where m.class_id = videos.class_id and m.student_id = (select private.my_student_id())));

create policy video_views_admin_select on public.video_views
  for select to authenticated
  using ((select private.is_admin()));
create policy video_views_self_select on public.video_views
  for select to authenticated
  using (student_id = (select private.my_student_id()));

-- ─── 시청 저장 RPC ───────────────────────────────────────────────────
-- security definer인 이유: 학생은 video_views에 직접 쓰지 못한다. 이 함수가 본인·내 반 공개 영상·길이 제한·
-- 줄지 않는 시청 위치를 한곳에서 지킨다.
-- 없는 영상·다른 반 영상·공개 전 영상은 같은 문구로 거부한다(영상 id가 있는지 알려 주지 않는다).
-- 두 값은 [0, 영상 길이]로 자른다. 돌려주는 값은 저장된 watched_seconds.
create function public.save_video_progress(p_video_id uuid, p_position_seconds int, p_watched_seconds int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := private.my_student_id();
  v_duration int;
  v_position int;
  v_watched int;
begin
  if v_student_id is null then
    raise exception '학생 계정으로 로그인해 주세요.';
  end if;

  select v.duration_seconds into v_duration
    from public.videos v
    join public.class_members m on m.class_id = v.class_id
   where v.id = p_video_id and m.student_id = v_student_id and v.published_at <= now();
  if not found then
    raise exception '내 반에 공개된 영상만 볼 수 있어요. 목록에서 다시 골라 주세요.';
  end if;

  v_position := least(greatest(coalesce(p_position_seconds, 0), 0), v_duration);
  v_watched := least(greatest(coalesce(p_watched_seconds, 0), 0), v_duration);

  insert into public.video_views (video_id, student_id, position_seconds, watched_seconds)
  values (p_video_id, v_student_id, v_position, v_watched)
  on conflict (video_id, student_id) do update
    set position_seconds = excluded.position_seconds,
        watched_seconds = greatest(public.video_views.watched_seconds, excluded.watched_seconds),
        updated_at = now()
  returning watched_seconds into v_watched;
  return v_watched;
end;
$$;
revoke all on function public.save_video_progress(uuid, int, int) from public, anon, authenticated, service_role;
grant execute on function public.save_video_progress(uuid, int, int) to authenticated;
