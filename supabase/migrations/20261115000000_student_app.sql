-- 학생 앱 2단계: 내신 강의실(영상 학교 꼬리표)·학습 자료실(비공개 버킷)·점수 기준 자동 재시험·학부모 화면에 테스트·클리닉.
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/20_student_app.test.sql, 00_meta.test.sql(함수·storage 정책 허용 목록), 13_guardian.test.sql
-- 학생은 자기 반(퇴원 아님) 자료와, 자기 반 영상 + 자기 학교 꼬리표 영상만 본다. 쓰기는 모두 원장(admins + aal2)만.

-- ─── 1. 내신 강의실: 영상 학교 꼬리표 ──────────────────────────────────
-- 꼬리표가 있는 영상은 반과 상관없이 그 학교 학생(재원·휴원)에게도 보인다. 꼬리표는 한 줄, 40자까지.
alter table public.videos add column school text
  check (school is null or (char_length(btrim(school)) between 1 and 40 and school !~ '[[:cntrl:]]'));
grant insert (school), update (school) on public.videos to authenticated;

-- 내 학교(앞뒤 공백·대소문자 무시). 학교는 원장만 읽는 student_private에 있어 security definer로 내 것만 돌려준다.
-- 퇴원생·학생 아님·학교 빈칸이면 null.
create function private.my_school()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(lower(btrim(p.school)), '')
    from public.student_private p
   where p.student_id = private.my_student_id();
$$;
revoke all on function private.my_school() from public, anon, authenticated, service_role;
grant execute on function private.my_school() to authenticated;

drop policy videos_member_select on public.videos;
create policy videos_member_select on public.videos
  for select to authenticated
  using (published_at <= now()
         and (exists (select 1 from public.class_members m
                       where m.class_id = videos.class_id and m.student_id = (select private.my_student_id()))
              or (school is not null and lower(btrim(school)) = (select private.my_school()))));

drop policy videos_member_select on storage.objects;
create policy videos_member_select on storage.objects
  for select to authenticated
  using (bucket_id = 'videos'
         and exists (select 1 from public.videos v
                      where v.storage_path = storage.objects.name
                        and v.published_at <= now()
                        and (exists (select 1 from public.class_members m
                                      where m.class_id = v.class_id and m.student_id = (select private.my_student_id()))
                             or (v.school is not null and lower(btrim(v.school)) = (select private.my_school())))));

-- 시청 저장도 같은 조건(내 반 또는 내 학교 꼬리표).
create or replace function public.save_video_progress(p_video_id uuid, p_position_seconds int, p_watched_seconds int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := private.my_student_id();
  v_school text := private.my_school();
  v_duration int;
  v_position int;
  v_watched int;
begin
  if v_student_id is null then
    raise exception '학생 계정으로 로그인해 주세요.';
  end if;

  select v.duration_seconds into v_duration
    from public.videos v
   where v.id = p_video_id and v.published_at <= now()
     and (exists (select 1 from public.class_members m where m.class_id = v.class_id and m.student_id = v_student_id)
          or (v.school is not null and lower(btrim(v.school)) = v_school));
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

-- ─── 2. 학습 자료실 ─────────────────────────────────────────────────
-- 비공개 버킷, 파일당 20 MiB. 형식: PDF·이미지(jpg·png)·한글(hwp·hwpx)·워드(doc·docx).
-- 브라우저가 hwp 형식을 모를 때가 많아 앱이 확장자로 MIME을 정해 올린다(버킷이 그 목록만 받는다).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 20971520, array[
  'application/pdf', 'image/jpeg', 'image/png',
  'application/x-hwp', 'application/vnd.hancom.hwpx',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 경로 <class_id>/<uuid>.<확장자>. file_name은 내려받을 때 보일 원래 이름(한 줄).
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100 and title !~ '[[:cntrl:]]'),
  file_name text not null check (char_length(file_name) between 1 and 200 and file_name !~ '[[:cntrl:]/\\]'),
  storage_path text not null unique
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png|hwp|hwpx|doc|docx)$'),
  size_bytes int not null check (size_bytes between 1 and 20971520),
  created_at timestamptz not null default now()
);
alter table public.materials enable row level security;
create index materials_class_id_created_at_idx on public.materials (class_id, created_at desc);

-- 파일을 먼저 올리고 행을 만든다. 원장이 아니면 검사하지 않는다(RLS가 거부: 파일 유무를 새지 않게, 영상과 같음).
create function private.require_material_object()
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
    select 1 from storage.objects o where o.bucket_id = 'materials' and o.name = new.storage_path
  ) then
    raise exception '자료 파일이 아직 올라가지 않았어요. 파일을 다시 올려 주세요.';
  end if;
  return new;
end;
$$;
revoke all on function private.require_material_object() from public, anon, authenticated, service_role;

create trigger materials_require_object
  before insert on public.materials
  for each row execute function private.require_material_object();

revoke all on public.materials from anon, authenticated, service_role;
grant select, delete on public.materials to authenticated;
grant insert (class_id, title, file_name, storage_path, size_bytes) on public.materials to authenticated;

create policy materials_admin_select on public.materials
  for select to authenticated using ((select private.is_admin()));
create policy materials_admin_insert on public.materials
  for insert to authenticated with check ((select private.is_admin()));
create policy materials_admin_delete on public.materials
  for delete to authenticated using ((select private.is_admin()));
-- 퇴원생은 my_student_id()가 null이라 0행.
create policy materials_member_select on public.materials
  for select to authenticated
  using (exists (select 1 from public.class_members m
                  where m.class_id = materials.class_id and m.student_id = (select private.my_student_id())));

create policy materials_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'materials' and (select private.is_admin()));
create policy materials_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materials' and (select private.is_admin()));
create policy materials_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'materials' and (select private.is_admin()));
-- 학생: materials 행(자기 반)이 가리키는 파일만. 경로 문자열을 파싱하지 않는다.
create policy materials_member_select on storage.objects
  for select to authenticated
  using (bucket_id = 'materials'
         and exists (select 1 from public.materials t
                       join public.class_members m on m.class_id = t.class_id
                      where t.storage_path = storage.objects.name
                        and m.student_id = (select private.my_student_id())));

-- ─── 3. 점수 기준 자동 재시험 ─────────────────────────────────────────
-- pass_score: 이 점수 미만이면 클리닉에 자동으로 넣는다(단어 테스트 → 단어 재시험, 문법 테스트 → 개념 보완).
-- 비우면 자동 추가 없음. 화면은 만점의 80%를 기본값으로 채운다.
alter table public.test_results add column pass_score int
  check (pass_score is null or pass_score between 0 and max_score);
grant insert (pass_score) on public.test_results to authenticated;

alter table public.clinic_items add column test_result_id uuid references public.test_results on delete set null;
create unique index clinic_items_test_result_idx on public.clinic_items (test_result_id) where test_result_id is not null;
grant insert (test_result_id) on public.clinic_items to authenticated;

-- security invoker: 원장 권한(RLS·grant)으로만 돈다. 원장만 test_results를 쓸 수 있다.
create function private.clinic_from_test()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pass_score is not null and new.score < new.pass_score then
    insert into public.clinic_items (student_id, kind, memo, test_result_id)
    values (new.student_id,
            case new.kind when 'word' then 'word_retest' else 'concept_review' end::public.clinic_kind,
            left(new.title || ' ' || new.score || '/' || new.max_score || '점 (기준 ' || new.pass_score || '점)', 200),
            new.id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke all on function private.clinic_from_test() from public, anon, authenticated, service_role;

create trigger test_results_clinic
  after insert on public.test_results
  for each row execute function private.clinic_from_test();

-- 테스트를 지우면 아직 안 끝낸 재시험도 지운다(끝낸 것은 기록으로 남고 test_result_id만 비워진다).
create function private.clinic_drop_open_for_test()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.clinic_items c where c.test_result_id = old.id and c.status = 'open';
  return old;
end;
$$;
revoke all on function private.clinic_drop_open_for_test() from public, anon, authenticated, service_role;

create trigger test_results_drop_open_clinic
  before delete on public.test_results
  for each row execute function private.clinic_drop_open_for_test();

-- 명단 view에 테스트 출처(날짜·제목)를 더한다(뒤에 열 추가만).
create or replace view public.clinic_board
with (security_invoker = true)
as
select c.id, c.student_id, c.session_id, c.kind, c.status, c.memo, c.done_at, c.created_at,
       s.name as student_name, s.grade, ss.date as session_date,
       c.test_result_id, t.taken_on as test_date
  from public.clinic_items c
  join public.students s on s.id = c.student_id
  left join public.sessions ss on ss.id = c.session_id
  left join public.test_results t on t.id = c.test_result_id
 where s.status <> 'left';

-- ─── 4. 학부모 화면: 테스트·클리닉 ────────────────────────────────────
-- 기존 응답에 tests(최근 28일, 최신 순)와 clinic(안 끝낸 것 + 최근 28일에 끝낸 것)를 더한다. 메모는 넣지 않는다.
create or replace function public.guardian_view(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_week_start date := pg_catalog.date_trunc('week', v_today::timestamp)::date;
  v_student_id uuid;
  v_name text;
  v_points int;
  v_records jsonb;
  v_week jsonb;
  v_tests jsonb;
  v_clinic jsonb;
begin
  if coalesce(current_setting('request.method', true), '') <> 'POST' then
    raise exception using errcode = 'P0001',
      message = '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.';
  end if;

  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.';
  end if;

  select s.id, s.name into v_student_id, v_name
    from public.guardian_tokens g
    join public.students s on s.id = g.student_id
   where g.token_hash = pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8'))
     and g.revoked_at is null
     and g.expires_at > now()
     and s.status <> 'left';
  if not found then
    raise exception '링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.';
  end if;

  select coalesce(sum(p.amount), 0)::int into v_points
    from public.points p
   where p.student_id = v_student_id;

  with target as (
    select se.id, se.date, c.name as class_name, se.summary, se.homework, se.homework_due
      from public.sessions se
      join public.classes c on c.id = se.class_id
     where se.date between v_today - 27 and v_today
       and (exists (select 1 from public.class_members m
                     where m.class_id = se.class_id and m.student_id = v_student_id
                       and se.date >= (m.created_at at time zone 'Asia/Seoul')::date)
            or exists (select 1 from public.attendance a
                        where a.session_id = se.id and a.student_id = v_student_id)
            or exists (select 1 from public.homework_checks h
                        where h.session_id = se.id and h.student_id = v_student_id))
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
        'date', t.date,
        'class_name', t.class_name,
        'attendance', coalesce(a.status::text, 'none'),
        'homework', coalesce(h.status::text, 'none'))
      order by t.date desc, t.class_name), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object(
        'date', t.date,
        'class_name', t.class_name,
        'summary', t.summary,
        'homework', t.homework,
        'homework_due', t.homework_due)
      order by t.date, t.class_name) filter (where t.date >= v_week_start), '[]'::jsonb)
    into v_records, v_week
    from target t
    left join public.attendance a on a.session_id = t.id and a.student_id = v_student_id
    left join public.homework_checks h on h.session_id = t.id and h.student_id = v_student_id;

  select coalesce(jsonb_agg(jsonb_build_object(
        'date', r.taken_on, 'kind', r.kind, 'title', r.title,
        'score', r.score, 'max_score', r.max_score, 'pass_score', r.pass_score)
      order by r.taken_on desc, r.created_at desc), '[]'::jsonb)
    into v_tests
    from public.test_results r
   where r.student_id = v_student_id and r.taken_on between v_today - 27 and v_today;

  select coalesce(jsonb_agg(jsonb_build_object(
        'kind', c.kind, 'status', c.status,
        'created_on', (c.created_at at time zone 'Asia/Seoul')::date,
        'done_on', (c.done_at at time zone 'Asia/Seoul')::date)
      order by c.status, c.created_at desc), '[]'::jsonb)
    into v_clinic
    from public.clinic_items c
   where c.student_id = v_student_id
     and (c.status = 'open' or (c.done_at at time zone 'Asia/Seoul')::date >= v_today - 27);

  return jsonb_build_object(
    'name', v_name,
    'today', v_today,
    'total_points', v_points,
    'records', v_records,
    'week', v_week,
    'tests', v_tests,
    'clinic', v_clinic);
end;
$$;
revoke all on function public.guardian_view(text) from public, anon, authenticated, service_role;
grant execute on function public.guardian_view(text) to anon, authenticated;
