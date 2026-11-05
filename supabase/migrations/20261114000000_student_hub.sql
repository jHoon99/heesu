-- 학생 허브: 학생별 수업 메모 → 클리닉 자동 추가, 테스트 기록, 재원생 상담 기록(설계 13장 S1·S3·S12).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/19_student_hub.test.sql, 00_meta.test.sql(감사 트리거 목록)
-- 쓰기는 모두 원장(admins + aal2)만. 학생은 자기 테스트·클리닉 행만 읽는다(퇴원생은 my_student_id()가 null이라 0행).
-- 학생 메모(lesson_notes)와 상담 기록(counsel_notes)은 원장만 본다.
-- 새 public 함수 없음. service_role(Edge Function)은 이 테이블들을 쓰지 않으므로 권한을 주지 않는다.

-- ─── 타입 ───────────────────────────────────────────────────────────
create type public.clinic_kind as enum ('word_retest', 'concept_review');
create type public.clinic_status as enum ('open', 'done');
create type public.test_kind as enum ('word', 'grammar');
create type public.counsel_method as enum ('in_person', 'phone', 'kakao');
create type public.counsel_party as enum ('guardian', 'student');

-- ─── 학생별 수업 메모 ─────────────────────────────────────────────────
-- 한 수업 × 한 학생에 하나. 체크 두 개가 클리닉 명단을 만든다(아래 트리거).
create table public.lesson_notes (
  session_id uuid references public.sessions on delete cascade,
  student_id uuid references public.students on delete cascade,
  note text check (note is null or (char_length(note) <= 1000 and note !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]')),
  needs_word_retest boolean not null default false,
  needs_concept_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
alter table public.lesson_notes enable row level security;
create index lesson_notes_student_id_idx on public.lesson_notes (student_id);

create trigger lesson_notes_set_updated_at
  before update on public.lesson_notes
  for each row execute function private.set_updated_at();
-- 그 수업의 반 학생만(출결·숙제와 같은 검사).
create trigger lesson_notes_check_member
  before insert or update of session_id, student_id on public.lesson_notes
  for each row execute function private.check_session_member();

-- ─── 클리닉 ─────────────────────────────────────────────────────────
-- session_id가 있으면 수업 메모 체크에서 생긴 행, 없으면 원장이 직접 넣은 행.
-- unique(session_id, student_id, kind): 같은 체크를 여러 번 저장해도 한 행. (session_id가 null인 직접 추가는 겹쳐도 된다.)
create table public.clinic_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  session_id uuid references public.sessions on delete cascade,
  kind public.clinic_kind not null,
  status public.clinic_status not null default 'open',
  memo text check (memo is null or (char_length(memo) <= 200 and memo !~ '[[:cntrl:]]')),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id, kind),
  check ((status = 'done') = (done_at is not null))
);
alter table public.clinic_items enable row level security;
create index clinic_items_student_id_idx on public.clinic_items (student_id);
create index clinic_items_status_idx on public.clinic_items (status, created_at desc);

create trigger clinic_items_set_updated_at
  before update on public.clinic_items
  for each row execute function private.set_updated_at();

-- 끝낸 시각은 서버가 정한다: done이 되면 처음 끝낸 시각, open으로 돌리면 비운다.
create function private.clinic_set_done_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    new.done_at := case when tg_op = 'UPDATE' and old.status = 'done' then old.done_at else now() end;
  else
    new.done_at := null;
  end if;
  return new;
end;
$$;
revoke all on function private.clinic_set_done_at() from public, anon, authenticated, service_role;

create trigger clinic_items_done_at
  before insert or update of status on public.clinic_items
  for each row execute function private.clinic_set_done_at();

-- 수업 메모 → 클리닉. 체크가 켜지면 행을 넣고, 꺼지거나 메모가 지워지면 아직 안 끝낸 행만 지운다(끝낸 건 기록).
-- security invoker: 원장 권한(RLS·grant) 그대로 돈다. 원장만 lesson_notes를 쓸 수 있으므로 원장만 이 경로를 탄다.
create function private.sync_clinic_from_note()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r record;
  want boolean;
  k public.clinic_kind;
begin
  -- 수업·학생이 바뀌면 옛 짝의 안 끝낸 행을 먼저 지운다.
  if tg_op = 'UPDATE' and (old.session_id, old.student_id) is distinct from (new.session_id, new.student_id) then
    delete from public.clinic_items c
     where c.session_id = old.session_id and c.student_id = old.student_id and c.status = 'open';
  end if;
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  foreach k in array array['word_retest', 'concept_review']::public.clinic_kind[] loop
    want := tg_op <> 'DELETE' and case k
      when 'word_retest' then new.needs_word_retest
      else new.needs_concept_review
    end;
    if want then
      insert into public.clinic_items (student_id, session_id, kind)
      values (r.student_id, r.session_id, k)
      on conflict (session_id, student_id, kind) do nothing;
    else
      delete from public.clinic_items c
       where c.session_id = r.session_id and c.student_id = r.student_id
         and c.kind = k and c.status = 'open';
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function private.sync_clinic_from_note() from public, anon, authenticated, service_role;

create trigger lesson_notes_sync_clinic
  after insert or update or delete on public.lesson_notes
  for each row execute function private.sync_clinic_from_note();

-- 클리닉 명단 view: 퇴원생은 여기서 뺀다(화면마다 거르지 않는다). security_invoker라 RLS가 그대로 걸린다.
create view public.clinic_board
with (security_invoker = true)
as
select c.id, c.student_id, c.session_id, c.kind, c.status, c.memo, c.done_at, c.created_at,
       s.name as student_name, s.grade, ss.date as session_date
  from public.clinic_items c
  join public.students s on s.id = c.student_id
  left join public.sessions ss on ss.id = c.session_id
 where s.status <> 'left';

-- ─── 테스트 기록 ─────────────────────────────────────────────────────
create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  taken_on date not null,
  kind public.test_kind not null,
  title text not null check (char_length(btrim(title)) between 1 and 40 and title !~ '[[:cntrl:]]'),
  score int not null check (score between 0 and 1000),
  max_score int not null check (max_score between 1 and 1000),
  memo text check (memo is null or (char_length(memo) <= 200 and memo !~ '[[:cntrl:]]')),
  created_at timestamptz not null default now(),
  check (score <= max_score)
);
alter table public.test_results enable row level security;
create index test_results_student_id_idx on public.test_results (student_id, taken_on desc);

-- ─── 재원생 상담 기록 ─────────────────────────────────────────────────
-- 홈페이지 상담 신청(consultations, 입학 전 문의)과 다르다: 재원생 기록이라 보존한다.
create table public.counsel_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  counseled_on date not null,
  method public.counsel_method not null,
  party public.counsel_party not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000 and body !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'),
  created_at timestamptz not null default now()
);
alter table public.counsel_notes enable row level security;
create index counsel_notes_student_id_idx on public.counsel_notes (student_id, counseled_on desc);

create trigger counsel_notes_audit
  after insert or update or delete on public.counsel_notes
  for each row execute function private.audit();

-- ─── 권한 ───────────────────────────────────────────────────────────
revoke all on public.lesson_notes from anon, authenticated, service_role;
revoke all on public.clinic_items from anon, authenticated, service_role;
revoke all on public.clinic_board from anon, authenticated, service_role;
revoke all on public.test_results from anon, authenticated, service_role;
revoke all on public.counsel_notes from anon, authenticated, service_role;

-- lesson_notes: upsert라 insert·update 컬럼을 같게(on conflict do update set에 payload 컬럼이 다 들어간다).
grant select, delete on public.lesson_notes to authenticated;
grant insert (session_id, student_id, note, needs_word_retest, needs_concept_review),
      update (session_id, student_id, note, needs_word_retest, needs_concept_review)
   on public.lesson_notes to authenticated;
-- clinic_items: 직접 추가(session_id 없이)와 상태·메모 수정, 삭제. done_at은 트리거만 쓴다.
grant select, delete on public.clinic_items to authenticated;
-- insert의 session_id는 트리거(security invoker)가 원장 권한으로 넣을 때 필요하다.
grant insert (student_id, session_id, kind, memo) on public.clinic_items to authenticated;
grant update (status, memo) on public.clinic_items to authenticated;
grant select on public.clinic_board to authenticated;
grant select, delete on public.test_results to authenticated;
grant insert (student_id, taken_on, kind, title, score, max_score, memo) on public.test_results to authenticated;
grant select, delete on public.counsel_notes to authenticated;
grant insert (student_id, counseled_on, method, party, body) on public.counsel_notes to authenticated;

-- ─── 정책 (private.*를 부르므로 모두 to authenticated) ───────────────
create policy lesson_notes_admin_select on public.lesson_notes
  for select to authenticated using ((select private.is_admin()));
create policy lesson_notes_admin_insert on public.lesson_notes
  for insert to authenticated with check ((select private.is_admin()));
create policy lesson_notes_admin_update on public.lesson_notes
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy lesson_notes_admin_delete on public.lesson_notes
  for delete to authenticated using ((select private.is_admin()));

create policy clinic_items_admin_select on public.clinic_items
  for select to authenticated using ((select private.is_admin()));
create policy clinic_items_admin_insert on public.clinic_items
  for insert to authenticated with check ((select private.is_admin()));
create policy clinic_items_admin_update on public.clinic_items
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy clinic_items_admin_delete on public.clinic_items
  for delete to authenticated using ((select private.is_admin()));
create policy clinic_items_self_select on public.clinic_items
  for select to authenticated using (student_id = (select private.my_student_id()));

create policy test_results_admin_select on public.test_results
  for select to authenticated using ((select private.is_admin()));
create policy test_results_admin_insert on public.test_results
  for insert to authenticated with check ((select private.is_admin()));
create policy test_results_admin_delete on public.test_results
  for delete to authenticated using ((select private.is_admin()));
create policy test_results_self_select on public.test_results
  for select to authenticated using (student_id = (select private.my_student_id()));

create policy counsel_notes_admin_select on public.counsel_notes
  for select to authenticated using ((select private.is_admin()));
create policy counsel_notes_admin_insert on public.counsel_notes
  for insert to authenticated with check ((select private.is_admin()));
create policy counsel_notes_admin_delete on public.counsel_notes
  for delete to authenticated using ((select private.is_admin()));
