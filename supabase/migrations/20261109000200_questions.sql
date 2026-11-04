-- 학생 질문(questions)·원장 답변(answers)·Realtime publication·private 채널 주제 정책(설계 13장 S1·S3·S8, v1 스펙 §7).
-- 공개 저장소: 이 파일은 누구나 읽는다는 전제로 쓴다.
-- 검사: supabase/tests/12_questions.test.sql, 00_meta.test.sql(함수 허용 목록·publication·replica identity)
-- 학생은 자기 질문과 그 답변만 읽는다(다른 학생의 질문·답변은 절대 받지 않는다). 질문 쓰기는 학생만, 답변 쓰기는 원장(admins + aal2)만.
-- student_id·answered_at은 서버가 정한다: 학생은 body·video_id·session_id만 보낼 수 있다(S3).
-- 삭제는 아무에게도 열지 않는다. 퇴원생은 my_student_id()가 null이라 자기 옛 질문도 0행(spec §11).
-- Realtime은 postgres_changes만 쓴다(S8): publication에는 이 두 테이블만, replica identity는 기본값(FULL 금지).
-- 채널은 private이고, 참여는 realtime.messages select 정책(can_join_question_topic)이 판단한다. insert 정책이 없어 아무도 broadcast 못 한다.
-- 감사 대상 아님(spec §7 목록에 없다). service_role(Edge Function)은 이 테이블들을 쓰지 않으므로 권한을 주지 않는다.

-- ─── 테이블 ─────────────────────────────────────────────────────────
-- 본문은 여러 줄: 줄바꿈·탭은 허용, 그 밖 제어 문자 금지(앱은 hasControlChars(multiline)로 먼저 막는다).
-- 영상이나 수업 중 하나에만 연결한다(둘 다 없어도 된다). 영상·수업이 지워지면 연결만 끊는다.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  video_id uuid references public.videos on delete set null,
  session_id uuid references public.sessions on delete set null,
  body text not null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(btrim(body)) between 1 and 2000 and body !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'),
  check (num_nonnulls(video_id, session_id) <= 1)
);
alter table public.questions enable row level security;
create index questions_student_id_created_at_idx on public.questions (student_id, created_at desc);
create index questions_unanswered_created_at_idx on public.questions (created_at desc) where answered_at is null;

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (char_length(btrim(body)) between 1 and 2000 and body !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]')
);
alter table public.answers enable row level security;
create index answers_question_id_created_at_idx on public.answers (question_id, created_at);

-- ─── 질문 준비 트리거 ────────────────────────────────────────────────
-- student_id는 로그인한 학생으로 정하고(클라이언트 값은 컬럼 권한으로 이미 막혀 있다), answered_at은 비운다.
-- 연결은 내 반의 공개된 영상, 내 반 수업만. 없는 id와 남의 반 id는 같은 문구로 거부한다(있는지 알려 주지 않는다).
-- security invoker인 이유: 학생 권한(RLS)으로 보이는 범위 안에서만 찾는다. 아래 조건도 직접 적어 RLS가 바뀌어도 넓어지지 않게 한다.
-- 트리거 전용이라 실행 권한은 아무에게도 주지 않는다(트리거는 실행 권한 없이도 불린다).
create function private.prepare_question()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.student_id := private.my_student_id();
  if new.student_id is null then
    raise exception '학생 계정으로 로그인해 주세요.';
  end if;

  if (new.video_id is not null and not exists (
        select 1 from public.videos v
          join public.class_members m on m.class_id = v.class_id
         where v.id = new.video_id and m.student_id = new.student_id and v.published_at <= now()))
     or (new.session_id is not null and not exists (
        select 1 from public.sessions s
          join public.class_members m on m.class_id = s.class_id
         where s.id = new.session_id and m.student_id = new.student_id)) then
    raise exception '내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.';
  end if;

  new.answered_at := null;
  return new;
end;
$$;
revoke all on function private.prepare_question() from public, anon, authenticated, service_role;

create trigger questions_prepare
  before insert on public.questions
  for each row execute function private.prepare_question();

-- ─── 답변 표시 트리거 ────────────────────────────────────────────────
-- 첫 답변 시각을 질문에 남긴다(미답변 수·정렬을 컬럼 하나로). 두 번째 답변부터는 그대로 둔다.
-- security definer인 이유: 원장에게 questions update 권한을 주지 않는다. 트리거 전용이라 실행 권한은 아무에게도 없다.
create function private.mark_question_answered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.questions
     set answered_at = coalesce(answered_at, new.created_at)
   where id = new.question_id;
  return null;
end;
$$;
revoke all on function private.mark_question_answered() from public, anon, authenticated, service_role;

create trigger answers_mark_answered
  after insert on public.answers
  for each row execute function private.mark_question_answered();

-- ─── 권한 ───────────────────────────────────────────────────────────
-- 플랫폼 기본값에 기대지 않는다: 모두 회수한 뒤 필요한 것만 준다.
revoke all on public.questions from anon, authenticated, service_role;
revoke all on public.answers from anon, authenticated, service_role;

-- authenticated: 행은 아래 정책이 거른다. 질문 update·delete, 답변 delete·질문 옮기기 없음.
grant select on public.questions to authenticated;
grant insert (body, video_id, session_id) on public.questions to authenticated;
grant select on public.answers to authenticated;
grant insert (question_id, body) on public.answers to authenticated;
grant update (body) on public.answers to authenticated;

-- ─── 정책 (private.*를 부르므로 모두 to authenticated) ───────────────
create policy questions_admin_select on public.questions
  for select to authenticated
  using ((select private.is_admin()));
create policy questions_self_select on public.questions
  for select to authenticated
  using (student_id = (select private.my_student_id()));
create policy questions_self_insert on public.questions
  for insert to authenticated
  with check (student_id = (select private.my_student_id()));

create policy answers_admin_select on public.answers
  for select to authenticated
  using ((select private.is_admin()));
create policy answers_admin_insert on public.answers
  for insert to authenticated
  with check ((select private.is_admin()));
create policy answers_admin_update on public.answers
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy answers_self_select on public.answers
  for select to authenticated
  using (exists (select 1 from public.questions q
                  where q.id = answers.question_id and q.student_id = (select private.my_student_id())));

-- ─── Realtime ───────────────────────────────────────────────────────
-- postgres_changes는 구독자마다 위 select 정책으로 행을 거른다. replica identity는 기본값(기본 키)만.
alter publication supabase_realtime add table public.questions, public.answers;

-- private 채널 참여 판단: 원장(aal2)은 questions:admin, 학생은 questions:student:<자기 students.id>만. 그 밖은 모두 false.
-- security invoker: 부르는 두 헬퍼가 이미 security definer다.
create function private.can_join_question_topic(p_topic text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (p_topic = 'questions:admin' and private.is_admin())
    or (private.my_student_id() is not null and p_topic = 'questions:student:' || private.my_student_id()::text),
    false);
$$;
revoke all on function private.can_join_question_topic(text) from public, anon, authenticated, service_role;
grant execute on function private.can_join_question_topic(text) to authenticated;

create policy question_topics_select on realtime.messages
  for select to authenticated
  using ((select private.can_join_question_topic((select realtime.topic()))));
