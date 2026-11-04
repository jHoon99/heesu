# 영상·질문(videos-questions) 구현 계획 — v1 계획 5/7

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬에서 끝까지 동작하는 영상·질문 기능: 비공개 Storage 버킷 `videos`와 반 소속 기반 storage 정책, 원장 영상 화면(반별 목록, TUS 이어 올리기·진행률, 공개일, 시청 현황), 학생 영상 탭(`VideoCard` 목록, 재생 직전 signed URL, 10초마다 시청 위치 저장, 이어 보기, 홈 "새 영상"), 질문·답변(학생 질문 → 원장 답변, Realtime으로 양쪽 즉시 갱신, 사이드바 미답변 배지·오늘 화면 숫자), (선택) 원장 웹푸시.

**Architecture:** 권한은 전부 DB가 막는다. `videos`는 학생에게 "내 반 + 공개일 지남"만 보이고, `storage.objects`의 학생 읽기 정책은 경로를 파싱하지 않고 `videos.storage_path`로 조인해 같은 조건을 건다(S9). 학생 쓰기는 RPC `save_video_progress`(본인·내 반 공개 영상만, 길이로 자르고 `watched_seconds`는 줄지 않음)와 `questions` 컬럼 단위 insert(`body, video_id, session_id`; `student_id`는 트리거가 채움, 연결 대상이 내 반인지 트리거가 검사)뿐이다(S3). Realtime은 `postgres_changes`만, publication은 `questions`·`answers`만, 채널은 private이며 `realtime.messages` SELECT 정책이 주제(`questions:admin` / `questions:student:<id>`)별로 참여를 허용한다(S8). 프론트는 `features/videos`·`features/questions` 두 기능 폴더(아키텍처 §4 목록)에 원장·학생 화면을 함께 두고, 원장 전용 UI(`components/admin/**`, `screen/Admin*.tsx`)는 ESLint `ADMIN_UI_FILES`에 넣는다. Realtime 구독 호출은 `questions/data/realtime.ts`, 구독 훅은 `questions/state`에만 둔다(아키텍처 §5).

**Tech Stack:** Next.js 16.4.4 (static export) · React 19.3 · Tailwind v4 · TanStack Query 5 · react-hook-form 7 + zod 4 · supabase-js 2.118 (Storage, Realtime) · **tus-js-client 4 (새 의존성)** · motion 14 · lucide-react · Supabase CLI 2.121 · pgTAP · Vitest · Playwright(scratch, Google Chrome 채널)

**Spec:** `docs/superpowers/specs/2026-11-04-heesu-v1-features-design.md` (§4 영상·질문·오늘 미답변 수·사이드바, §5 영상·질문·홈 새 영상, §7 `videos`·`video_views`·`questions`·`answers`·`push_subscriptions`, §8 Free 50MB, §10 항목 5) · 구조·보안 `docs/superpowers/specs/2026-11-03-heesu-architecture-design.md` (§4 폴더, §5 Realtime 무효화, §6 영상, §7 웹푸시, §9 `tus-js-client`, §13 S1·S2·S3·S4·S8·S9·S10) · 디자인 `docs/design-system/components/{VideoCard,Card,Badge,Tabs,Modal,StudentHomeScreen}/{README.md,preview.html}`, `docs/design-system/components/index.d.ts`, `docs/design-system/motion.md`(영상 진행 = 진행 바만) · 형식·기존 코드 `docs/superpowers/plans/2026-11-06-student-app.md` · 후속 항목 `docs/superpowers/plans/v1-followups.md`("videos-questions"), `docs/superpowers/plans/foundation-followups.md`("Storage: meta test that storage.objects policies match an allowlist")

## Global Constraints

- 정적 내보내기: Route Handler·Server Action·middleware·`next/image` 최적화 금지. 새 주소 `src/app/admin/videos/{new,detail}/page.tsx`, `src/app/s/videos/watch/page.tsx`(id는 쿼리 `?id=`). `useSearchParams`를 쓰는 화면은 page에서 `<Suspense>`로 감싼다(`src/app/admin/students/detail/page.tsx`와 같게).
- 의존 규칙: `app → features → core, design-system`; `features/A`는 `features/B/index.ts`로만; `design-system`은 `react, motion, canvas-confetti, lucide-react, class-variance-authority, clsx, tailwind-merge`만(링크는 `linkComponent` prop). `@supabase/supabase-js`·`supabase` 클라이언트·**`tus-js-client`**는 `src/core/supabase/**`, `src/features/*/data/**`에서만. 새 npm 의존성은 `tus-js-client@^4` 하나(Task 5).
- 원장 화면: 등장 모션 없음, `bg-bg-admin`, 컨트롤 40px(`size="md"`), 제목 `font-serif text-h2`(기존 원장 화면과 같게), 카드 `Card tone="raised"`. 학생 화면: 390px, `bg-bg-page`, 터치 48px(`size="lg"`), 명조 금지(예외: `VideoCard` 썸네일의 Unit 표기), primary 버튼은 화면에 하나(목록 안은 `secondary`), 이모지 금지, 토큰만(`src/test/no-raw-colors.test.ts`).
- 고정 값:
  - 버킷 `videos`: `public = false`, `allowed_mime_types = {video/mp4}`, `file_size_limit = 1073741824`(1 GiB, Pro 목표). 로컬 `config.toml [storage] file_size_limit = "1GiB"`. 클라우드 Free는 전역 50MB가 우선한다(계획 7 메모).
  - 경로: `<class_id>/<uuid>.mp4`(`newStoragePath`). DB check `storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.mp4$'`.
  - TUS: 엔드포인트 `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`(같은 출처라 CSP `connect-src` 변경 없음), `chunkSize = 6 * 1024 * 1024`(Supabase 고정값), `retryDelays = [0, 3000, 5000, 10000, 20000]`, `uploadDataDuringCreation: true`, `removeFingerprintOnSuccess: true`, 헤더 `x-upsert: false`, 메타데이터 `bucketName, objectName, contentType: "video/mp4", cacheControl: "3600"`. `authorization`·`apikey`는 `onBeforeRequest`에서 요청마다 최신 세션으로 넣는다(긴 업로드 중 토큰 갱신).
  - signed URL 만료 `PLAYBACK_URL_TTL_SECONDS = 10800`(3시간). 재생 화면을 열 때 발급, 캐시하지 않음(`gcTime: 0`), 재생 오류 시 한 번 다시 발급.
  - 시청 저장 주기 `PROGRESS_SAVE_INTERVAL_MS = 10_000`, 그리고 `pause`·`ended`·`visibilitychange → hidden`·화면 떠날 때.
  - 다 봄 = `watched >= duration * 0.95`. 이어 보기 = 위치가 5초 이상이고 `duration - 5`초 미만일 때만.
  - 제목 1~100자(trim), 질문·답변 본문 1~2000자(trim). 제목은 제어 문자 전부 금지, 본문은 줄바꿈·탭만 허용 — DB check와 zod(`hasControlChars`, 본문은 `{ multiline: true }`) 둘 다.
  - 새 영상 = 공개 7일 이내이고 내가 아직 안 본 것(`watched_seconds = 0` 또는 행 없음).
  - 날짜·시각 표시는 서울 기준: 날짜 `formatShortDate` + `dayLabelOf` → `11/4(화)`, 시각 `M/d HH:mm`. 공개일 입력 `YYYY-MM-DD` → `${date}T00:00:00+09:00`.
  - Realtime 주제: 원장 `questions:admin`, 학생 `questions:student:<students.id>`, `{ config: { private: true } }`.
- DB: 새 정책은 `to authenticated` + `(select private.is_admin())` / `(select private.my_student_id())`. 새 함수는 `revoke all … from public, anon, authenticated, service_role` 후 필요한 것만 grant, `set search_path = ''`, `00_meta.test.sql` 허용 목록 갱신. 테이블마다 `revoke all … from anon, authenticated, service_role` 후 명시 grant. 클라이언트에 보이는 `raise exception`은 "-해요" 한국어 + 고치는 방법. pgTAP 파일은 세는 테이블을 먼저 `delete from`하고 시드에 없는 uuid(접미사 `…010`·`…011`·`…012`)를 쓴다. `REPLICA IDENTITY FULL` 금지.
- 저장 규칙: update·delete는 `.select(...)`를 붙여 0행이면 `SaveNotAppliedError`. 수정 화면은 `refetchOnMount: "always"` + `isFetchedAfterMount` 뒤 렌더. 전체 오류 화면은 `isError && data === undefined`일 때만. 질문·답변 본문은 일반 텍스트(`whitespace-pre-line break-words`, 부모 `min-w-0`).
- 로컬: API `http://127.0.0.1:56321`, DB `postgresql://postgres:postgres@127.0.0.1:56322/postgres`, 셸마다 `export PATH="$HOME/.orbstack/bin:$PATH"`. 마이그레이션 `supabase db reset`, 타입 `npm run db:types`로만. `config.toml` 변경은 `supabase stop && supabase start` 뒤 적용. 개발 서버 `:3000`(막혀 있으면 `npm run dev -- -p 3001`; Task 11 말고는 Edge Function을 부르지 않는다).
- 클라우드에는 아무것도 적용·배포하지 않는다(계획 7).
- 각 Task 끝 전체 검증: `npm run typecheck && npm run lint && npm test && npm run fn:check && npm run db:test && npm run build`. 커밋은 Conventional Commits, push 금지. **같은 작업 트리에 다른 작업자가 있으니 `git add -A` 대신 그 Task의 Files 목록만 `git add`한다.**

## Review Focus

1. **업로드가 중간에 끊기는 경우**(망 끊김, 탭 새로고침, 긴 업로드 중 토큰 만료, 취소, 업로드는 됐는데 `videos` insert 실패) → 같은 파일·같은 반으로 다시 올리면 이어서 올라가고 같은 경로를 쓴다, 취소하면 서버의 부분 업로드도 지운다, 파일 없는 `videos` 행은 DB가 거부하고, insert가 실패하면 올린 파일을 지운다. → Task 1 pgTAP "파일 없는 경로 → P0001", Task 5 `useUploadVideo` 테스트.
2. **재생 중 signed URL이 만료되거나 영상이 비공개·삭제로 바뀐 경우**(3시간 넘게 열어 둔 탭, 원장이 공개일을 미래로 바꿈) → 재생 오류 때 한 번 다시 발급하고 위치를 이어 간다, 그래도 안 되면 "영상을 열 수 없어요" 문구(빈 검은 화면 아님). → Task 7 `VideoPlayerScreen` 테스트, Task 2 pgTAP "공개일 미래로 → 학생 object 0행".
3. **시청 기록이 부풀거나 줄어드는 경우**(끝으로 건너뛰기, 되감기, 2배속, 저장 실패, 같은 위치 반복 저장) → 끝으로 건너뛴 구간은 "본 것"이 아니고, 되감아도 본 위치는 줄지 않고, 저장 실패는 재생을 막지 않는다. → Task 1 pgTAP 단조 증가·길이 자르기, Task 7 `advanceFurthest`·`useWatchProgress` 테스트.
4. **Realtime이 끊기거나 두 번 붙는 경우**(백그라운드 탭, 재연결, StrictMode 이중 effect, 화면 이동) → 다시 붙으면(`SUBSCRIBED`) 목록을 새로 읽어 놓친 이벤트를 메우고, 채널은 마운트당 하나·언마운트 때 제거, 학생은 남의 질문·답변 이벤트를 받지 않는다(테이블 RLS + 주제 정책). → Task 3 pgTAP `can_join_question_topic`, Task 8 `subscribeQuestionChanges`·`useQuestionsRealtime` 테스트, Task 10 E2E.
5. **길고 이상한 글**(공백 없는 2000자 질문, 줄바꿈만, 제어 문자, 100자 제목, 두 번 누른 "보내기") → 390px·1024px에서 가로 넘침 없음, DB와 zod가 같은 규칙으로 거부, 요청은 한 번. → Task 3 pgTAP, Task 8·9 폼 테스트, Task 10 `scrollWidth` 확인.

---

### Task 1: DB — 버킷 `videos`, `videos`·`video_views`, `save_video_progress`

**Files:**
- Create: `supabase/migrations/20261109000000_videos.sql`
- Create: `supabase/tests/10_videos.test.sql`
- Modify: `supabase/tests/00_meta.test.sql`, `src/core/supabase/database.types.ts` (`npm run db:types`)

**Interfaces:**
- Consumes: `private.is_admin()`, `private.my_student_id()`(퇴원생 null), `private.set_updated_at()`, `public.classes`, `public.class_members`, `storage.buckets`, `storage.objects`.
- Produces (DB):
  - 버킷: `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('videos', 'videos', false, 1073741824, array['video/mp4'])` — config.toml이 아니라 마이그레이션(클라우드 `db push`에도 같은 버킷이 생기게).
  - `public.videos (id uuid pk default gen_random_uuid(), class_id uuid not null references public.classes on delete cascade, title text not null, storage_path text not null unique, duration_seconds int not null, published_at timestamptz not null default now(), created_at timestamptz not null default now())` + check: `char_length(btrim(title)) between 1 and 100 and title !~ '[[:cntrl:]]'`, `duration_seconds between 1 and 21600`, 경로 정규식(Global Constraints). 인덱스 `(class_id, published_at desc)`.
  - `public.video_views (video_id uuid references public.videos on delete cascade, student_id uuid references public.students on delete cascade, watched_seconds int not null default 0, position_seconds int not null default 0, updated_at timestamptz not null default now(), primary key (video_id, student_id))`, check 둘 다 `>= 0`. 인덱스 `(student_id)`. (`position_seconds`는 이어 보기용 마지막 위치, `watched_seconds`는 끊김 없이 본 가장 먼 위치 — 시청 현황·진행률.)
  - 트리거 `videos_require_object` BEFORE INSERT → `private.require_video_object()`(invoker): `storage.objects`에 `bucket_id = 'videos' and name = new.storage_path`가 없으면 `raise exception '영상 파일이 아직 올라가지 않았어요. 파일을 다시 올려 주세요.'`.
  - 권한: `grant select, delete on public.videos to authenticated; grant insert (class_id, title, storage_path, duration_seconds, published_at) …; grant update (title, published_at) …`(반·경로·길이는 바꿀 수 없다). `grant select on public.video_views to authenticated`(쓰기는 RPC만).
  - 정책: `videos_admin_{select,insert,update,delete}`(`(select private.is_admin())`), `videos_member_select`: `published_at <= now() and exists (select 1 from public.class_members m where m.class_id = videos.class_id and m.student_id = (select private.my_student_id()))`. `video_views_admin_select`, `video_views_self_select`(`student_id = (select private.my_student_id())`).
  - `public.save_video_progress(p_video_id uuid, p_position_seconds int, p_watched_seconds int) returns int` — plpgsql `security definer set search_path = ''`. 학생 아님 → `'학생 계정으로 로그인해 주세요.'`; 영상이 없거나·내 반이 아니거나·공개 전 → 같은 문구 `'내 반에 공개된 영상만 볼 수 있어요. 목록에서 다시 골라 주세요.'`; 두 값을 `[0, duration_seconds]`로 자르고 upsert: `position_seconds = 새 값`, `watched_seconds = greatest(기존, 새 값)`, `updated_at = now()`; 저장된 `watched_seconds` 반환. `revoke all … from public, anon, authenticated, service_role; grant execute … to authenticated`.
  - 머리 주석: 공개 저장소 전제, 검사 파일, "security definer인 이유: 학생은 video_views에 직접 쓰지 못한다. 이 함수가 본인·내 반 공개 영상·길이 제한·줄지 않는 시청 위치를 한곳에서 지킨다.", 감사 대상 아님.
- Produces (TS 타입): `videos`, `video_views` Row/Insert/Update, `Functions.save_video_progress`(생성 결과 그대로).

- [ ] **Step 0: 전제 확인** — `supabase db reset` 후 psql로 `\d storage.objects`, `\d storage.buckets`, `\d realtime.messages`가 있고 `select tgname from pg_trigger where tgrelid = 'storage.objects'::regclass and not tgisinternal`를 기록한다(Task 2가 삭제 보호 트리거 유무를 쓴다). 셋 중 하나라도 마이그레이션 시점에 없으면 여기서 멈추고 보고한다.
- [ ] **Step 1: 실패하는 테스트 작성 — `10_videos.test.sql`** (postgres로 준비: `delete from public.videos; delete from public.sessions; delete from public.class_members; delete from public.classes; delete from public.students;`. auth.users 원장 `…a010`(admins), 학생 A `…c010`(반 X), P `…f010`(휴원, 반 X), B `…d010`(반 Y), L `…e010`(퇴원, 반 X), 아무나 `…b010`. 반 X `20000000-…-a010`, Y `…b010`. `storage.objects`에 경로 3개를 postgres로 넣고 영상 VX1(X, 공개 어제, 600초), VX2(X, 공개 내일), VY1(Y, 공개 어제).)
  - 권한 표: anon·service_role는 `videos`·`video_views` 권한 없음; authenticated `videos` 테이블 권한 `ARRAY['DELETE','SELECT']`, `video_views` `ARRAY['SELECT']`; `column_privs_are` — `storage_path`·`class_id`·`duration_seconds` `{INSERT,SELECT}`, `title`·`published_at` `{INSERT,SELECT,UPDATE}`; `video_views.watched_seconds` `{SELECT}`.
  - 읽기: A → `results_eq('select id from public.videos order by id', VX1만)`; P → VX1; B → VY1; L·아무나·원장 aal1 → 0행; 원장 aal2 → 3행.
  - 학생 쓰기: A insert videos → `throws_ok(…, '42501')`; A `update … set title` → 0행(postgres로 다시 세어 그대로); A delete → 0행.
  - 원장 aal2: 없는 경로로 insert → `throws_ok(…, 'P0001', '영상 파일이 아직 올라가지 않았어요. 파일을 다시 올려 주세요.')`; 제목 `''`·`'   '`·101자·`E'제목\x07'` → `23514`; 100자 → 성공; `duration_seconds = 0` → `23514`; 경로 `'../x.mp4'` → `23514`; `update … set storage_path` → `42501`; `update … set class_id` → `42501`.
  - RPC: A `save_video_progress(VX1, 100, 100)` = 100; `(VX1, 50, 50)` = 100이고 postgres로 `position_seconds` = 50; `(VX1, 9999, 9999)` = 600, 위치 600; `(VX1, -5, -5)` → watched 600 그대로, 위치 0. A on VX2·VY1·`gen_random_uuid()` → `P0001` `'내 반에 공개된 영상만 볼 수 있어요. 목록에서 다시 골라 주세요.'`; L·원장 aal2 → `'학생 계정으로 로그인해 주세요.'`; anon → `42501`.
  - `video_views`: A select → 1행(본인); B → 0행; 원장 aal2 → 1행; A 직접 insert → `42501`. postgres로 VX1 delete → `video_views` 0행(cascade).
  - 함수 모양: `is_definer('public','save_video_progress', ARRAY['uuid','integer','integer'])`, `function_privs_are` anon·service_role `'{}'`, authenticated `{EXECUTE}`.
- [ ] **Step 2: 실패하는 테스트 작성 — `00_meta.test.sql`** authenticated public 허용 목록 `'{my_rank,my_role,password_changed,save_video_progress,submit_homework}'::text[]`.
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 10·00 FAIL.
- [ ] **Step 4: 구현** — Interfaces 그대로.
- [ ] **Step 5:** `supabase db reset && npm run db:test` → PASS. `npm run db:types` 후 `grep -c "save_video_progress" src/core/supabase/database.types.ts` ≥ 1.
- [ ] **Step 6:** 전체 검증 → PASS.
- [ ] **Step 7: Commit**
  ```bash
  git add supabase/migrations/20261109000000_videos.sql supabase/tests/10_videos.test.sql supabase/tests/00_meta.test.sql src/core/supabase/database.types.ts
  git commit -m "feat(db): videos and video_views with member-only reads, object-exists guard and monotonic save_video_progress rpc"
  ```

---

### Task 2: Storage 정책 — 원장 쓰기, 학생은 내 반 공개 영상 파일만 읽기, 정책 허용 목록

**Files:**
- Create: `supabase/migrations/20261109000100_video_storage_policies.sql`
- Create: `supabase/tests/11_video_storage.test.sql`
- Modify: `supabase/tests/00_meta.test.sql`, `supabase/config.toml` (`[storage] file_size_limit = "1GiB"`)

**Interfaces:**
- Consumes: 버킷·`public.videos`(Task 1).
- Produces (DB, 모두 `on storage.objects … to authenticated`):
  - `videos_admin_select` / `videos_admin_insert`(with check) / `videos_admin_update`(using + with check) / `videos_admin_delete`: `bucket_id = 'videos' and (select private.is_admin())`.
  - `videos_member_select`(for select): `bucket_id = 'videos' and exists (select 1 from public.videos v join public.class_members m on m.class_id = v.class_id where v.storage_path = storage.objects.name and v.published_at <= now() and m.student_id = (select private.my_student_id()))`. 경로 문자열은 파싱하지 않는다(S9). 학생 insert·update·delete 정책은 없다.
  - `storage.buckets`에는 정책을 두지 않는다(클라이언트가 버킷 목록을 볼 일 없음).
  - 머리 주석: S9 요약, "signed URL 발급(createSignedUrl)은 이 SELECT 정책을 호출자 권한으로 검사한다", 검사 파일.

- [ ] **Step 1: 실패하는 테스트 작성 — `11_video_storage.test.sql`** (Task 1과 같은 모양의 준비, 접미사 `…011`; 객체 VX1·VX2·VY1 경로 + 행 없는 `orphan` 경로 하나.)
  - 버킷: `results_eq($$select public, allowed_mime_types, file_size_limit from storage.buckets where id = 'videos'$$, $$values (false, array['video/mp4'], 1073741824::bigint)$$)`.
  - `policies_are('storage', 'objects', ARRAY['videos_admin_delete','videos_admin_insert','videos_admin_select','videos_admin_update','videos_member_select'])`; 각각 `policy_roles_are(… ARRAY['authenticated'])`, `policy_cmd_is`(SELECT/INSERT/UPDATE/DELETE).
  - 읽기(`select name from storage.objects where bucket_id = 'videos'`): A → VX1 경로만; B → VY1만; L·아무나·원장 aal1 → 0행; 원장 aal2 → 4행.
  - 공개일: postgres로 VX2 `published_at = now() - interval '1 minute'` → A 2행; postgres로 VX1 행 delete → A에게 VX1 객체가 즉시 안 보임(Review Focus 2).
  - 쓰기: A `insert into storage.objects (bucket_id, name) values ('videos', '<uuid>/<uuid>.mp4')` → `throws_ok(…, '42501')`; 원장 aal2 같은 insert → `lives_ok`; A `update storage.objects set name = …` → 0행(postgres로 세어 그대로); A delete → 0행. Step 0에서 삭제 보호 트리거가 있었다면 그 함수 본문(`\sf`)이 읽는 우회 설정을 이 블록 안에서만 켜서, 트리거가 아니라 RLS를 검사하게 한다.
- [ ] **Step 2: 실패하는 테스트 작성 — `00_meta.test.sql`**(plan 수 +2)
  - `is((select coalesce(array_agg(policyname::text order by policyname), '{}') from pg_policies where schemaname = 'storage'), '{videos_admin_delete,videos_admin_insert,videos_admin_select,videos_admin_update,videos_member_select}'::text[], 'storage: 정책 = 허용 목록')`.
  - `is((select coalesce(array_agg(id order by id), '{}') from storage.buckets where public), '{}'::text[], 'storage: 공개 버킷이 없다')`.
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 11·00 FAIL.
- [ ] **Step 4: 구현** — 마이그레이션 + `config.toml` 한 줄. `supabase stop && supabase start` 후 `curl -s http://127.0.0.1:56321/storage/v1/bucket/videos -H "apikey: <secret key>" -H "Authorization: Bearer <secret key>"`로 `file_size_limit`·`allowed_mime_types` 확인.
- [ ] **Step 5:** `supabase db reset && npm run db:test` → PASS. 전체 검증 → PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add supabase/migrations/20261109000100_video_storage_policies.sql supabase/tests/11_video_storage.test.sql supabase/tests/00_meta.test.sql supabase/config.toml
  git commit -m "feat(storage): private videos bucket policies joined on videos.storage_path and a storage policy allowlist meta test"
  ```

---

### Task 3: DB — `questions`·`answers`, Realtime publication, private 채널 주제 정책

**Files:**
- Create: `supabase/migrations/20261109000200_questions.sql`
- Create: `supabase/tests/12_questions.test.sql`
- Modify: `supabase/tests/00_meta.test.sql`, `supabase/seed.sql`, `src/core/supabase/database.types.ts`

**Interfaces:**
- Consumes: `public.videos`(Task 1), `public.sessions`, `public.class_members`, `public.students`, `realtime.messages`, `realtime.topic()`.
- Produces (DB):
  - `public.questions (id uuid pk default gen_random_uuid(), student_id uuid not null references public.students on delete cascade, video_id uuid references public.videos on delete set null, session_id uuid references public.sessions on delete set null, body text not null, answered_at timestamptz, created_at timestamptz not null default now())` + check `char_length(btrim(body)) between 1 and 2000 and body !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'`, `num_nonnulls(video_id, session_id) <= 1`(연결은 하나만). 인덱스 `(student_id, created_at desc)`, `(created_at desc) where answered_at is null`.
  - `public.answers (id uuid pk default gen_random_uuid(), question_id uuid not null references public.questions on delete cascade, body text not null, created_at timestamptz not null default now())` + 같은 본문 check. 인덱스 `(question_id, created_at)`.
  - 트리거 `questions_prepare` BEFORE INSERT → `private.prepare_question()`(invoker): `new.student_id := private.my_student_id()`; null이면 `'학생 계정으로 로그인해 주세요.'`; `video_id`가 있으면 그 영상이 내 반·공개됨, `session_id`가 있으면 그 수업이 내 반이어야 함, 아니면 `'내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.'`; `new.answered_at := null`.
  - 트리거 `answers_mark_answered` AFTER INSERT → `private.mark_question_answered()`(`security definer set search_path = ''`): `update public.questions set answered_at = coalesce(answered_at, new.created_at) where id = new.question_id`. (원장에게 questions update 권한을 주지 않고 미답변 수·정렬을 컬럼 하나로.)
  - 권한: `grant select on public.questions to authenticated; grant insert (body, video_id, session_id) on public.questions to authenticated`(학생은 `student_id`·`answered_at`을 쓸 수 없다, S3). `grant select on public.answers …; grant insert (question_id, body) …; grant update (body) …`. 삭제 권한 없음.
  - 정책: `questions_admin_select`; `questions_self_select`(`student_id = (select private.my_student_id())`); `questions_self_insert`(with check 같은 식). `answers_admin_{select,insert,update}`; `answers_self_select`: `exists (select 1 from public.questions q where q.id = answers.question_id and q.student_id = (select private.my_student_id()))`.
  - Realtime: `alter publication supabase_realtime add table public.questions, public.answers;` (replica identity는 기본값 그대로).
  - `private.can_join_question_topic(p_topic text) returns boolean` — `language sql stable set search_path = ''`: `(p_topic = 'questions:admin' and private.is_admin()) or (private.my_student_id() is not null and p_topic = 'questions:student:' || private.my_student_id()::text)`, null이면 false. `grant execute … to authenticated`만.
  - `create policy question_topics_select on realtime.messages for select to authenticated using ((select private.can_join_question_topic((select realtime.topic()))))`. insert 정책 없음(아무도 broadcast 못 함).
- Produces (시드): `questions` 2행 — 김하늘(`…5ee0000000c1`) `(예시) 현재완료랑 과거형 차이를 잘 모르겠어요.`(답변 1개 `(예시) 다음 수업 때 예문으로 같이 볼게요.`), 다른 학생 `(예시) 숙제 3번 해석이 맞는지 궁금해요.`(미답변, 그 학생 반 최근 수업에 연결). 학생 insert 트리거를 피하려 postgres로 넣으면서 `student_id`를 직접 준다(트리거는 `my_student_id()`가 null이면 막으므로, 시드 구간만 `alter table public.questions disable trigger questions_prepare` … `enable`).
- Produces (TS 타입): `questions`, `answers` Row/Insert.

- [ ] **Step 1: 실패하는 테스트 작성 — `12_questions.test.sql`** (접미사 `…012`; 학생 A(반 X), B(반 Y), L(퇴원), 원장, 아무나; 영상 VX1(공개)·VX2(공개 전)·VY1, 수업 SX(X)·SY(Y). 영상 준비 때 `storage.objects` 행도 넣는다.)
  - 권한 표: anon·service_role 두 테이블 권한 없음; authenticated `questions` 테이블 `ARRAY['SELECT']`, `column_privs_are` `body`·`video_id`·`session_id` `{INSERT,SELECT}`, `student_id`·`answered_at`·`created_at` `{SELECT}`; `answers.body` `{INSERT,SELECT,UPDATE}`, `answers.question_id` `{INSERT,SELECT}`.
  - A insert `(body)` → 성공, postgres로 `student_id = A`; `insert (student_id, body)` → `42501`; `(body, video_id VX1)`·`(body, session_id SX)` → 성공; VX2·VY1·SY → `P0001` `'내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.'`; VX1 + SX 둘 다 → `23514`; 본문 `''`·`'  '`·2001자·`E'질문\x07'` → `23514`; 2000자·`E'첫 줄\n둘째 줄'` → 성공. L·원장 aal2 insert → `P0001` `'학생 계정으로 로그인해 주세요.'`.
  - 읽기: A → 자기 질문만; B → A 질문 0행; 원장 aal2 전부; aal1·아무나 0행; anon `select` → `42501`. A `update questions set body` → `42501`; delete → `42501`.
  - 답변: 원장 aal2 insert 답변(A 질문) → 성공, 그 질문 `answered_at is not null`; 두 번째 답변 → `answered_at` 그대로; A select answers → 1행, B → 0행; A insert answer → `42501`; 원장 `update answers set body` → 1행, A → 0행; 답변 본문 2001자 → `23514`.
  - 주제 함수: A로 `can_join_question_topic('questions:student:<A>')` true, `'questions:student:<B>'` false, `'questions:admin'` false, `null` false; 원장 aal2로 `'questions:admin'` true, `'questions:student:<A>'` false; 원장 aal1·아무나·L → 전부 false.
  - `policies_are('realtime', 'messages', ARRAY['question_topics_select'])`, `policy_cmd_is(…, 'SELECT')`, `policy_roles_are(… ARRAY['authenticated'])`.
- [ ] **Step 2: 실패하는 테스트 작성 — `00_meta.test.sql`**(plan 수 +2)
  - private authenticated 허용 목록 `'{can_join_question_topic,is_admin,my_student_id}'::text[]`.
  - `is((select coalesce(array_agg(schemaname || '.' || tablename order by 1), '{}') from pg_publication_tables where pubname = 'supabase_realtime'), '{public.answers,public.questions}'::text[], 'realtime: publication = questions, answers')`.
  - `is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relreplident = 'f'), 0, 'REPLICA IDENTITY FULL 테이블이 없다')`.
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 12·00 FAIL.
- [ ] **Step 4: 구현** — 마이그레이션 + 시드.
- [ ] **Step 5:** `supabase db reset && npm run db:test` → PASS. psql `select count(*) from public.questions` = 2, `where answered_at is null` = 1. `npm run db:types`.
- [ ] **Step 6:** 전체 검증 → PASS.
- [ ] **Step 7: Commit**
  ```bash
  git add supabase/migrations/20261109000200_questions.sql supabase/tests/12_questions.test.sql supabase/tests/00_meta.test.sql supabase/seed.sql src/core/supabase/database.types.ts
  git commit -m "feat(db): questions and answers with column-level student insert, link checks, realtime publication and private topic policy"
  ```

---

### Task 4: 디자인 시스템 — `VideoCard`

**Files:**
- Create: `src/design-system/components/VideoCard/VideoCard.tsx`, `VideoCard.test.tsx`
- Modify: `src/design-system/index.ts`, `docs/design-system/components/index.d.ts`(`VideoCardProps` 줄을 코드와 같게)

**Interfaces:**
- Consumes: `cn`, `Badge`, `ProgressFill`(`../../motion/motion`), `lucide-react`(`Play`, `Check`).
- Produces:
  - `interface VideoCardProps { title: ReactNode; subtitle?: ReactNode; unit?: string; duration?: string; progress?: number; isNew?: boolean; layout?: "column" | "row"; href?: string; linkComponent?: ElementType /* 기본 "a" */; onClick?: () => void; className?: string }`; `VideoCard(props)`; `clampProgress(p: number | undefined): number | undefined` — undefined 그대로, 그 밖 0~100 정수로 자름(`Math.round`).
  - 뿌리 요소: `href` → `linkComponent`(href 전달), 아니면 `onClick` → `<button type="button">`, 아니면 `<div>`. `rounded-xl border border-border bg-bg-surface` + `focus-visible` 링, 터치 영역 전체가 하나의 링크/버튼.
  - 썸네일(README "썸네일이 없을 때도 브랜드 톤 자리표시"): `relative overflow-hidden rounded-lg bg-primary-soft aspect-video`(column: 폭 100%, row: `w-28 shrink-0`), 장식 원 두 개(`bg-primary/10`, aria-hidden), `unit`이 있으면 `font-serif text-h3 text-text-brand`(README 명조 예외), 가운데 `Play` 아이콘 원(`size-10 rounded-full bg-bg-surface text-text-brand`, aria-hidden), `duration`이면 오른쪽 아래 `rounded bg-brown-900/80 px-1.5 text-caption text-text-on-brand hs-num`.
  - 본문: `isNew` → `Badge tone="new"` `새 영상`; 제목 `text-body font-semibold text-text line-clamp-2 break-words`; subtitle `text-body-sm text-text-muted`; 진행: `progress === 100` → `Check` + `다 봤어요`(`text-body-sm text-success-700`); `1~99` → 트랙 `h-1.5 rounded-full bg-bg-subtle` 안 `ProgressFill value={p} className="h-1.5 rounded-full bg-primary"`, 트랙에 `role="progressbar"` `aria-valuemin={0}` `aria-valuemax={100}` `aria-valuenow={p}` `aria-label="시청 진행"` + `text-caption text-text-muted` `{p}% 봤어요`; `0`·undefined → 진행 표시 없음.
  - index.ts: `VideoCard`, `clampProgress`, `type VideoCardProps`.

- [ ] **Step 1: 실패하는 테스트 작성 — `VideoCard.test.tsx`**: `clampProgress(undefined)` undefined, `(-3)` 0, `(45.6)` 46, `(130)` 100; `href="/s/videos/watch?id=v1"` → `getByRole("link", { name: /현재완료/ })`의 `href` 그대로, `linkComponent`로 준 테스트 컴포넌트가 href를 받음; `onClick`만 → `button` 클릭 시 1회; 둘 다 없음 → link·button 없음; `progress={45}` → progressbar `aria-valuenow="45"` + `45% 봤어요`; `progress={100}` → `다 봤어요`, progressbar 없음; `progress={0}` → 둘 다 없음; `isNew` → `새 영상`; `duration="12:40"` 글자; `unit="Unit 4"` 글자; `layout="row"` 렌더 오류 없음.
- [ ] **Step 2:** `npm test -- src/design-system/components/VideoCard` → FAIL.
- [ ] **Step 3: 구현** + index.ts + index.d.ts.
- [ ] **Step 4:** 같은 명령 → PASS. 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/design-system/components/VideoCard src/design-system/index.ts docs/design-system/components/index.d.ts
  git commit -m "feat(design-system): VideoCard with brand placeholder thumb, link or button root and watch progress"
  ```

---

### Task 5: 원장 영상 올리기 — TUS 이어 올리기, 길이 읽기, 진행률, 실패 정리

**Files:**
- Create: `src/features/videos/index.ts`, `model/videos.ts`, `model/videos.test.ts`, `model/upload.ts`, `model/upload.test.ts`, `data/upload.ts`, `data/upload.test.ts`, `data/duration.ts`, `data/duration.test.ts`, `data/videos.ts`, `data/videos.test.ts`, `state/keys.ts`, `state/useUploadVideo.ts`, `state/useUploadVideo.test.tsx`, `components/admin/VideoUploadForm.tsx`, `screen/AdminVideoUploadScreen.tsx`, `screen/AdminVideoUploadScreen.test.tsx`
- Create: `src/app/admin/videos/new/page.tsx`
- Modify: `package.json`, `package-lock.json`(`npm i tus-js-client@^4`), `eslint.config.mjs`(tus 제한 + `ADMIN_UI_FILES`에 `src/features/videos/components/admin/**`, `src/features/videos/screen/Admin*`, `src/features/questions/components/admin/**`, `src/features/questions/screen/Admin*`), `src/test/boundaries.test.ts`(tus import 위반 1건)

**Interfaces:**
- Consumes: `supabase`, `env`(`@/core/env`), `hasControlChars`·`CONTROL_CHAR_MESSAGE`, `classifyError`, `useClasses`(`@/features/classes`), `toLocalDateKey`(`@/features/sessions`), `Input`·`Select`·`Button`·`Card`·`useToast`.
- Produces:
  - `model/videos.ts`: `VIDEO_TITLE_MAX = 100`; `formatDuration(seconds: number): string`(`0:05`, `12:40`, `1:02:03`); `publishedAtFromDate(date: string): string` = `` `${date}T00:00:00+09:00` ``; `videoFormSchema` = zod `{ title: trim 1~100 + 제어 문자 거부(CONTROL_CHAR_MESSAGE), classId: 비어 있지 않음("반을 골라 주세요."), publishedDate: /^\d{4}-\d{2}-\d{2}$/ }`, 오류 문구 `제목을 입력해 주세요.`·`제목은 100자까지 쓸 수 있어요.`; `type VideoFormValues = z.infer<…>`; `isMp4File(file: File): boolean` = `type === "video/mp4"` 또는 이름이 `.mp4`로 끝남(대소문자 무시).
  - `model/upload.ts`: `uploadErrorMessage(e: unknown): string` — `e.originalResponse?.getStatus()`로: 413 → `파일이 너무 커요. 영상을 나누거나 화질을 낮춰 다시 올려 주세요.`; 415 또는 본문에 `mime` → `mp4 파일만 올릴 수 있어요. 파일 형식을 확인해 주세요.`; 401·403 → `로그인이 만료됐거나 권한이 없어요. 다시 로그인한 뒤 올려 주세요.`; 응답 없음(망) → `인터넷 연결이 끊겼어요. 연결되면 '다시 올리기'를 눌러 이어서 올려 주세요.`; 그 밖 → `업로드하지 못했어요. 잠시 후 다시 올려 주세요.`
  - `data/upload.ts`: `VIDEO_BUCKET = "videos"`; `resumableEndpoint(supabaseUrl: string): string`(끝 `/` 제거 + `/storage/v1/upload/resumable`); `newStoragePath(classId: string): string` = `` `${classId}/${crypto.randomUUID()}.mp4` ``; `startVideoUpload(file: File, classId: string, onProgress: (sent: number, total: number) => void): { done: Promise<string /* storagePath */>; abort: () => Promise<void> }` — `new tus.Upload(file, {…Global Constraints 값})`; 시작 전 `findPreviousUploads()`에서 `metadata.objectName`이 `${classId}/`로 시작하는 첫 항목이 있으면 `resumeFromPreviousUpload` + 그 경로, 없으면 `newStoragePath`; `onBeforeRequest`는 `supabase.auth.getSession()`의 access token으로 `authorization: Bearer …`와 `apikey: env.supabasePublishableKey`를 넣는다; `abort` = `upload.abort(true)`(서버 부분 업로드 삭제). `removeVideoObject(path: string): Promise<void>` = `storage.from(VIDEO_BUCKET).remove([path])`, error면 throw.
  - `data/duration.ts`: `readVideoDuration(file: File, timeoutMs = 15_000): Promise<number>` — `<video preload="metadata">` + `URL.createObjectURL`(CSP `media-src blob:` 허용됨), `loadedmetadata`에서 `duration`이 유한·> 0이면 `Math.max(1, Math.round(duration))`; `error`·시간 초과·비유한 → `Error("영상 길이를 읽지 못했어요. mp4 파일이 맞는지 확인해 주세요.")`; 어떤 경우든 `revokeObjectURL`.
  - `data/videos.ts`(이 Task 분): `createVideo(input: { classId: string; title: string; storagePath: string; durationSeconds: number; publishedAt: string }): Promise<{ id: string }>` — insert + `.select("id").single()`.
  - `state/keys.ts`: `videoKeys = { all: ["videos"] as const, adminList: (classId: string) => ["videos", "admin", classId] as const, detail: (id: string) => ["videos", "detail", id] as const, views: (id: string) => ["videos", "views", id] as const, mine: (studentId: string) => ["videos", "mine", studentId] as const, playback: (id: string) => ["videos", "playback", id] as const }`.
  - `state/useUploadVideo.ts`: `type UploadState = { phase: "idle" | "uploading" | "saving" | "done" | "error"; sent: number; total: number; error: string | null; videoId: string | null }`; `useUploadVideo(): { state: UploadState; start(input: { file: File; classId: string; title: string; publishedDate: string; durationSeconds: number }): Promise<void>; cancel(): Promise<void> }` — uploading → `startVideoUpload`; 끝나면 saving → `createVideo`; insert 실패 → `removeVideoObject(path)`(실패해도 삼킴) 후 error = `` `${classifyError(e).message} 올린 파일은 지웠어요. 다시 올려 주세요.` ``; 업로드 실패 → error = `uploadErrorMessage(e)`; 성공 → done + `invalidateQueries({ queryKey: videoKeys.all })`; 진행 중 `start` 두 번 → 무시; `cancel` → `abort()` 후 idle. uploading·saving 동안 `beforeunload` 경고.
  - `components/admin/VideoUploadForm.tsx` + `screen/AdminVideoUploadScreen.tsx`: h1 `영상 올리기`, `Card tone="raised"` 안 react-hook-form(`zodResolver(videoFormSchema)`): `Input` `제목`(maxLength 100), `Select` `반`(useClasses, `?class=`가 있으면 기본값), `Input type="date"` `공개일`(기본 오늘, hint `이 날부터 학생에게 보여요.`), `Input type="file" accept="video/mp4,.mp4"` `영상 파일`(hint `mp4 파일만 올릴 수 있어요.`). 파일을 고르면 `isMp4File` 아니면 오류 `mp4 파일만 올릴 수 있어요. 파일 형식을 확인해 주세요.`, 맞으면 `readVideoDuration` → `길이 {formatDuration}`, 실패 문구는 그 칸 error. primary `올리기`(길이를 못 읽었으면 disabled). 올리는 중: 입력 disabled, `role="progressbar"` `aria-label="업로드 진행"` `aria-valuenow={pct}` + `{pct}% · {MB}/{MB}MB`, secondary `취소`. 오류: `role="alert"` 문구 + primary `다시 올리기`(같은 입력으로 `start` — 이어 올리기). 성공 → 토스트 `영상을 올렸어요.` + `router.push("/admin/videos?class=<id>")`.
  - `videos/index.ts`(이 Task 분): `AdminVideoUploadScreen`, `videoKeys`.

- [ ] **Step 1: 실패하는 테스트 작성 — model**: `formatDuration(5)` `0:05`, `(760)` `12:40`, `(3723)` `1:02:03`; `publishedAtFromDate("2026-11-09")` `2026-11-09T00:00:00+09:00`; `videoFormSchema` — 제목 `"  "` → `제목을 입력해 주세요.`, 101자 → `제목은 100자까지 쓸 수 있어요.`, `"제목\u0007"` → `CONTROL_CHAR_MESSAGE`, 앞뒤 공백은 trim된 값; `isMp4File` `a.MP4`(type "") true, `a.mov`(video/quicktime) false; `uploadErrorMessage` — `{ originalResponse: { getStatus: () => 413, getBody: () => "" } }` → 크기 문구, 415 → mp4 문구, 403 → 로그인 문구, `{ originalResponse: null }` → 망 문구, `new Error("x")` → 그 밖 문구.
- [ ] **Step 2: 실패하는 테스트 작성 — data·state·screen**
  - `upload.test.ts`(`tus-js-client` mock: `Upload` 생성자 인자 기록, `findPreviousUploads`·`resumeFromPreviousUpload`·`start`·`abort` spy): `resumableEndpoint("http://127.0.0.1:56321/")` → `http://127.0.0.1:56321/storage/v1/upload/resumable`; 옵션의 `chunkSize` 6291456, `metadata.bucketName` `videos`, `metadata.contentType` `video/mp4`, `metadata.objectName`이 `^c1/[0-9a-f-]{36}\.mp4$`; 이전 업로드 `[{ metadata: { objectName: "c1/old.mp4" } }]` → `resumeFromPreviousUpload` 1회 + `done`이 `c1/old.mp4`로 resolve(`onSuccess` 호출 시); 다른 반 이전 업로드만 있으면 새 경로; `onBeforeRequest`가 `getSession` mock의 두 번째 토큰을 두 번째 요청에 넣는다(토큰 갱신); `abort()` → `abort(true)`.
  - `duration.test.ts`(`document.createElement("video")`를 가짜 EventTarget으로 바꿈, `URL.createObjectURL`·`revokeObjectURL` mock): `duration = 12.6` + `loadedmetadata` → 13, revoke 1회; `duration = Infinity` → 문구로 reject; `error` 이벤트 → reject + revoke; 이벤트 없음 + fake timer 15초 → reject.
  - `useUploadVideo.test.tsx`(data mock): 성공 → `createVideo`가 `{ storagePath: "c1/x.mp4", publishedAt: "2026-11-09T00:00:00+09:00", durationSeconds: 13 }`로 1회, phase `done`; `createVideo` reject `{ code: "23514" }` → `removeVideoObject("c1/x.mp4")` 1회, error가 `올린 파일은 지웠어요.`를 포함(Review Focus 1); `done` reject(413) → 크기 문구, `createVideo` 0회; uploading 중 `start` 다시 → `startVideoUpload` 1회; `cancel` → `abort` 1회, phase `idle`; 진행 콜백 `(3, 10)` → `sent 3, total 10`.
  - `AdminVideoUploadScreen.test.tsx`(`useClasses`·`readVideoDuration`·`useUploadVideo` mock): `.mov` 파일 → `mp4 파일만 올릴 수 있어요.`, `올리기` disabled; mp4 + 길이 760 → `길이 12:40`; 제목 비우고 올리기 → `제목을 입력해 주세요.`; 올리는 중 progressbar `aria-valuenow`와 `취소`; 오류 상태 → alert 문구 + `다시 올리기`; primary 버튼은 한 번에 하나.
- [ ] **Step 3:** `npm test -- src/features/videos src/test/boundaries.test.ts` → FAIL.
- [ ] **Step 4: 구현** — `npm i tus-js-client@^4`, ESLint(`no-restricted-imports` paths에 `{ name: "tus-js-client", message: "tus-js-client는 src/features/*/data 에서만 import 해요." }` — 기존 data 예외가 그대로 풀어 준다), 위 파일들, `src/app/admin/videos/new/page.tsx`(`<Suspense><AdminVideoUploadScreen /></Suspense>`). `tus-js-client`의 브라우저 빌드·타입(`DetailedError`, `onBeforeRequest`의 `HttpRequest.setHeader`)은 `node_modules/tus-js-client/lib/index.d.ts`에서 확인한다.
- [ ] **Step 5:** 같은 명령 → PASS. 전체 검증 → PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add package.json package-lock.json eslint.config.mjs src/test/boundaries.test.ts src/features/videos src/app/admin/videos/new
  git commit -m "feat(videos): admin resumable tus upload with client-side duration, progress, resume and cleanup on failure"
  ```

---

### Task 6: 원장 영상 목록·상세 — 반별 목록, 시청 현황, 제목·공개일 수정, 삭제

**Files:**
- Create: `src/features/videos/model/views.ts`, `model/views.test.ts`, `state/useAdminVideos.ts`, `components/admin/AdminVideoTable.tsx`, `components/admin/VideoViewsTable.tsx`, `screen/AdminVideoListScreen.tsx`, `screen/AdminVideoListScreen.test.tsx`, `screen/AdminVideoDetailScreen.tsx`, `screen/AdminVideoDetailScreen.test.tsx`
- Create: `src/app/admin/videos/detail/page.tsx`
- Modify: `src/features/videos/data/videos.ts`, `data/videos.test.ts`, `src/features/videos/index.ts`, `src/app/admin/videos/page.tsx`

**Interfaces:**
- Consumes: Task 5(`videoKeys`, `formatDuration`, `publishedAtFromDate`, `removeVideoObject`, `videoFormSchema`의 title·publishedDate), `useClasses`, `formatShortDate`·`dayLabelOf`·`toLocalDateKey`, `SaveNotAppliedError`, `Tabs`·`Modal`·`Card`·`Badge`·`Button`·`Input`·`useToast`. view `class_roster`(퇴원생 제외).
- Produces:
  - `type AdminVideo = { id: string; classId: string; title: string; storagePath: string; durationSeconds: number; publishedAt: string; views: { studentId: string; watchedSeconds: number; updatedAt: string }[] }`.
  - data: `listAdminVideos(classId: string): Promise<AdminVideo[]>`(`videos.select("id, class_id, title, storage_path, duration_seconds, published_at, video_views(student_id, watched_seconds, updated_at)").eq("class_id", classId).order("published_at", { ascending: false })`); `getAdminVideo(id: string): Promise<AdminVideo | null>`; `listRoster(classId: string): Promise<{ studentId: string; name: string }[]>`(`class_roster`, 이름순); `updateVideo(id: string, patch: { title: string; publishedAt: string }): Promise<void>`(`.select("id")`, 0행 → `SaveNotAppliedError`); `deleteVideo(video: { id: string; storagePath: string }): Promise<{ fileRemoved: boolean }>` — **행을 먼저** 지우고(`.select("id")`, 0행 → `SaveNotAppliedError`; 이 순간 학생 접근이 끊긴다) 그다음 `removeVideoObject`, 실패면 `fileRemoved: false`.
  - model `views.ts`: `watchedPercent(watched: number, duration: number): number`(0~100 내림, 다 봄 기준이면 100); `isComplete(watched: number, duration: number): boolean` = `watched >= duration * 0.95`; `type ViewRow = { studentId: string; name: string; watchedSeconds: number; percent: number; updatedAt: string | null }`; `buildViewRows(roster, views, duration): ViewRow[]` — 명단 학생만(퇴원생 기록은 뺀다), 기록 없으면 0·null, 이름순; `completeCount(rows): number`; `isScheduled(publishedAt: string, now: Date): boolean`.
  - state: `useAdminVideos(classId: string | null)`, `useAdminVideo(id: string)`(`refetchOnMount: "always"`), `useRoster(classId: string | null)`, `useUpdateVideo()`, `useDeleteVideo()` — 성공 시 `videoKeys.all` invalidate.
  - `AdminVideoListScreen`: h1 `영상` + primary 링크 `영상 올리기`(→ `/admin/videos/new?class=<선택 반>`); `Tabs` 반 목록(값 = `?class=` 또는 첫 반, 바꾸면 `router.replace`); 표(`Card tone="raised"`): 제목(→ `/admin/videos/detail?id=`), 길이, 공개일 `11/4(화)` + 미래면 `Badge tone="warning"` `공개 예정`, `다 본 학생 {n}/{m}명`. 0건 `이 반에 올린 영상이 없어요. '영상 올리기'로 첫 영상을 올려 주세요.`; 반 0개 `먼저 반을 만들어 주세요.` + `/admin/classes` 링크.
  - `AdminVideoDetailScreen`(`?id=`): h1 제목, `{반 이름} · {길이} · 공개 {날짜}`; 수정 카드(제목·공개일, primary `저장`, 성공 토스트 `저장했어요.`); 시청 현황 카드 `다 본 학생 {n}/{m}명` + 표(학생, `{본 위치} / {길이}`, `{pct}%`, 마지막 시청 `M/d HH:mm`, 기록 없으면 `아직 안 봤어요`); `Button variant="danger"` `영상 지우기` → `Modal title="이 영상을 지울까요?"` 본문 `학생 시청 기록도 함께 지워지고 되돌릴 수 없어요.` [취소][지우기] → 성공 토스트 `영상을 지웠어요.`(fileRemoved false면 warning 토스트 `영상은 지웠어요. 파일 정리는 실패했지만 학생에게는 보이지 않아요.`) + 목록으로. 없는 id → `영상을 찾을 수 없어요. 목록에서 다시 골라 주세요.`
  - `/admin/videos/page.tsx` → `<Suspense><AdminVideoListScreen /></Suspense>`(ComingSoon 교체).
  - index: `AdminVideoListScreen`, `AdminVideoDetailScreen` 추가.

- [ ] **Step 1: 실패하는 테스트 작성 — model**: `watchedPercent(300, 600)` 50, `(599, 600)` 100, `(0, 600)` 0, `(10, 0)` 100; `isComplete(570, 600)` true, `(569, 600)` false; `buildViewRows`(명단 가·나·다, 기록 나 300·라(명단 밖) 600) → 3행 이름순, 가 0/null, 나 50%, 라 없음; `completeCount` 1건 기준 확인; `isScheduled("2026-11-10T00:00:00+09:00", 2026-11-09)` true.
- [ ] **Step 2: 실패하는 테스트 작성 — data·screen**
  - `videos.test.ts`: `deleteVideo` → `from("videos").delete().eq("id", "v1").select("id")` **다음에** `storage.remove(["c1/x.mp4"])`(호출 순서 기록); 0행 → `SaveNotAppliedError`, remove 0회; remove error → `{ fileRemoved: false }`; `updateVideo` 0행 → `SaveNotAppliedError`.
  - `AdminVideoListScreen.test.tsx`: 반 탭 두 개, 두 번째 클릭 → `router.replace("/admin/videos?class=c2")`; 미래 공개 영상 행에 `공개 예정`; `다 본 학생 1/3명`; 0건 문구; `영상 올리기` href에 `class=`.
  - `AdminVideoDetailScreen.test.tsx`: `아직 안 봤어요` 행; 제목 101자 저장 → 문구, mutate 0회; 지우기 → Modal 제목 `이 영상을 지울까요?`, 확인 → `deleteVideo` 1회 + push `/admin/videos?class=c1`; 없는 id 문구.
- [ ] **Step 3:** `npm test -- src/features/videos` → FAIL → 구현 → PASS.
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/features/videos src/app/admin/videos
  git commit -m "feat(videos): admin video list by class with scheduled badge, watch status per student, edit and row-first delete"
  ```

---

### Task 7: 학생 영상 — 목록, 재생(signed URL·시청 저장·이어 보기), 홈 "새 영상"

**Files:**
- Create: `src/features/videos/model/watch.ts`, `model/watch.test.ts`, `state/useMyVideos.ts`, `state/useWatchProgress.ts`, `state/useWatchProgress.test.tsx`, `components/NewVideoCard.tsx`, `screen/StudentVideoListScreen.tsx`, `screen/StudentVideoListScreen.test.tsx`, `screen/VideoPlayerScreen.tsx`, `screen/VideoPlayerScreen.test.tsx`
- Create: `src/app/s/videos/watch/page.tsx`
- Modify: `src/features/videos/data/videos.ts`, `data/videos.test.ts`, `src/features/videos/index.ts`, `src/app/s/videos/page.tsx`, `src/features/student-home/screen/StudentHomeScreen.tsx`, `StudentHomeScreen.test.tsx`

**Interfaces:**
- Consumes: `VideoCard`(Task 4), `videoKeys`·`formatDuration`·`watchedPercent`·`isComplete`(Task 5·6), RPC `save_video_progress`(Task 1), `useMyStudent`(`@/features/auth`), `formatShortDate`·`dayLabelOf`, `classifyError`, `Card`·`Button`·`useToast`.
- Produces:
  - `type MyVideo = { id: string; classId: string; className: string; title: string; storagePath: string; durationSeconds: number; publishedAt: string; watchedSeconds: number; positionSeconds: number }`.
  - data: `listMyVideos(): Promise<MyVideo[]>`(`videos.select("id, class_id, title, storage_path, duration_seconds, published_at, classes(name), video_views(watched_seconds, position_seconds)").order("published_at", { ascending: false }).limit(100)` — RLS가 내 반·공개된 것과 내 기록만 준다; 기록 없으면 0); `getMyVideo(id: string): Promise<MyVideo | null>`; `PLAYBACK_URL_TTL_SECONDS = 10800`; `createPlaybackUrl(storagePath: string): Promise<string>`(`storage.from("videos").createSignedUrl(path, 10800)`, error면 throw); `saveVideoProgress(videoId: string, positionSeconds: number, watchedSeconds: number): Promise<number>`(정수로 내림해 rpc, data가 number가 아니면 `SaveNotAppliedError`).
  - model `watch.ts`: `NEW_VIDEO_DAYS = 7`; `isNewVideo(v: Pick<MyVideo, "publishedAt" | "watchedSeconds">, now: Date): boolean`; `resumePosition(position: number, duration: number): number`(5 ≤ p < duration − 5면 p, 아니면 0); `advanceFurthest(furthest: number, last: number, current: number): number` — `0 < current − last ≤ 3`이고 `last ≤ furthest + 3`일 때만 `max(furthest, current)`, 아니면 furthest(건너뛴 구간은 본 것이 아니다, Review Focus 3); `videoSubtitle(v: MyVideo): string` = `` `${className} · ${11/4(화)}` ``.
  - `useMyVideos(studentId: string | null)`(키 `videoKeys.mine`), `useMyVideo(id: string, studentId: string | null)`, `usePlaybackUrl(video: MyVideo | null): { url: string | null; isError: boolean; refresh(): void }` — 키 `videoKeys.playback(id)`, `staleTime: Infinity`, `gcTime: 0`, `retry: 1`; `refresh`는 60초에 한 번까지.
  - `useWatchProgress(el: HTMLVideoElement | null, video: MyVideo | null): void` — 상태는 ref(`furthest` = 처음 `watchedSeconds`, `last`, 마지막 저장값). `timeupdate` → `advanceFurthest`; `loadedmetadata` → `currentTime = resumePosition(...)`(한 번만); 재생 중 10초 interval·`pause`·`ended`·`visibilitychange`(hidden)·언마운트 → 저장(위치·furthest가 마지막 저장값과 같으면 건너뜀); 저장 실패는 삼키고 다음 주기에 다시; 연속 3번 실패하면 한 번만 토스트 `시청 위치를 저장하지 못하고 있어요. 인터넷 연결을 확인해 주세요.`; 저장 성공 시 `videoKeys.mine` invalidate는 언마운트 때만(재생 중 목록 재조회 안 함).
  - `StudentVideoListScreen`: h1 `영상`; 목록 `VideoCard layout="row"` `href="/s/videos/watch?id=<id>"` `linkComponent={Link}` `subtitle={videoSubtitle}` `duration={formatDuration}` `progress={watchedPercent}` `isNew`; 0건 `아직 올라온 영상이 없어요. 원장님이 올리면 여기에 보여요.`; 로딩·오류 규칙은 homework 화면과 같게.
  - `VideoPlayerScreen`(`?id=`): 위 `next/link` `← 영상 목록`(`ChevronLeft` 아이콘); `<video controls playsInline preload="metadata" src={url} className="aspect-video w-full rounded-xl bg-brown-900">`, `onError` → 처음이면 `refresh()`(URL 다시 받고 위치는 `useWatchProgress`가 이어 감), 두 번째면 문구 `영상을 열 수 없어요. 목록으로 돌아가 다시 골라 주세요.`(Review Focus 2); h1 `text-h2` 제목, 부제, `{본 위치} / {길이} 봤어요`; secondary `size="lg" block` 링크 `질문하기` → `/s/questions?video=<id>`(이 화면의 유일한 버튼). 영상 없음(내 반 아님·공개 전·삭제) → `영상을 찾을 수 없어요. 목록에서 다시 골라 주세요.`
  - `NewVideoCard({ studentId }: { studentId: string })` — `Card title="새 영상"` `actions` = `next/link` `/s/videos` `전체 보기`; 내용 = 가장 최근 공개 영상 1개 `VideoCard`(column), 없으면 `아직 새 영상이 없어요.`
  - `/s/videos/page.tsx` → `StudentVideoListScreen`; `/s/videos/watch/page.tsx` → `<Suspense><VideoPlayerScreen /></Suspense>`; `StudentHomeScreen`의 자리표시 `Card title="새 영상"` → `<NewVideoCard studentId={studentId} />`(studentId가 있을 때).
  - index: `StudentVideoListScreen`, `VideoPlayerScreen`, `NewVideoCard`, `useMyVideos`, `type MyVideo`(Task 9가 질문 연결 목록에 쓴다).

- [ ] **Step 1: 실패하는 테스트 작성 — model** (`watch.test.ts`): `advanceFurthest(0, 0, 0.25)` 0.25; `(100, 100, 100.5)` 100.5; `(100, 100, 590)`(건너뜀) 100; `(100, 590, 590.5)`(건너뛴 뒤 재생) 100; `(100, 50, 50.5)`(되감아 재생) 100; `(100, 101, 103)` 103; `(100, 10, 5)`(뒤로) 100. `resumePosition(3, 600)` 0, `(120, 600)` 120, `(596, 600)` 0. `isNewVideo` 공개 6일 전·0초 true, 8일 전 false, 1일 전·30초 봄 false.
- [ ] **Step 2: 실패하는 테스트 작성 — data·state·screen**
  - `videos.test.ts`: `createPlaybackUrl("c1/x.mp4")` → `createSignedUrl("c1/x.mp4", 10800)`; `saveVideoProgress("v1", 12.7, 30.2)` → `rpc("save_video_progress", { p_video_id: "v1", p_position_seconds: 12, p_watched_seconds: 30 })`; `listMyVideos` 기록 없는 행 → `watchedSeconds 0`.
  - `useWatchProgress.test.tsx`(가짜 video EventTarget, fake timers, `saveVideoProgress` mock): `loadedmetadata`에서 `currentTime`이 120(위치 120, 길이 600); `play` 후 timeupdate로 130까지 → 10초 뒤 `(…, 130, 130)` 1회; 움직임 없이 10초 더 → 추가 호출 없음; `currentTime = 590` 건너뛰고 timeupdate → 다음 저장의 watched는 130 그대로(Review Focus 3); `pause` → 즉시 저장; `visibilitychange` hidden → 저장; 언마운트 → 저장 1회; 저장 3번 reject → 토스트 1회, 4번째 reject → 토스트 그대로 1회, 재생 오류 없음.
  - `VideoPlayerScreen.test.tsx`(`useMyVideo`·`usePlaybackUrl` mock): `video` 요소 `src`가 받은 URL, `playsinline`·`controls` 속성; `error` 이벤트 1번 → `refresh` 1회, 문구 없음; 2번 → `영상을 열 수 없어요.` 문구; `질문하기` 링크 href `/s/questions?video=v1`; 영상 없음 문구.
  - `StudentVideoListScreen.test.tsx`: 링크 href `/s/videos/watch?id=v1`; 다 본 영상 `다 봤어요`, 반쯤 본 영상 `50% 봤어요`; 0건 문구.
  - `StudentHomeScreen.test.tsx`: `@/features/videos`의 `NewVideoCard` mock이 그려진다(`새 영상` 자리표시 글자 `영상 수업은 곧 열려요.` 없음).
- [ ] **Step 3:** `npm test -- src/features/videos src/features/student-home` → FAIL → 구현 → PASS.
- [ ] **Step 4:** `grep -rn "영상 수업은 곧 열려요" src` 결과 없음. 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/features/videos src/app/s/videos src/features/student-home/screen
  git commit -m "feat(videos): student video list, player with just-in-time signed url, skip-proof progress saving and resume, home new video card"
  ```

---

### Task 8: 질문 데이터·Realtime 연결 + 원장 질문 화면, 사이드바 미답변 배지, 오늘 화면 숫자

**Files:**
- Create: `src/features/questions/index.ts`, `model/questions.ts`, `model/questions.test.ts`, `data/questions.ts`, `data/questions.test.ts`, `data/realtime.ts`, `data/realtime.test.ts`, `state/keys.ts`, `state/useQuestions.ts`, `state/useQuestionsRealtime.ts`, `state/useQuestionsRealtime.test.tsx`, `components/QuestionBody.tsx`, `components/admin/AdminQuestionCard.tsx`, `components/admin/AnswerForm.tsx`, `screen/AdminQuestionsScreen.tsx`, `screen/AdminQuestionsScreen.test.tsx`
- Modify: `src/app/admin/questions/page.tsx`, `src/features/admin-shell/components/AdminShell.tsx`, `AdminShell.test.tsx`, `src/features/today/model/today.ts`, `src/features/today/screen/TodayScreen.tsx`, `TodayScreen.test.tsx`

**Interfaces:**
- Consumes: 테이블 `questions`·`answers`, 주제 정책(Task 3), `supabase`(`channel`, `removeChannel`, `realtime.setAuth`), `hasControlChars`, `classifyError`, `formatShortDate`·`dayLabelOf`, `Tabs`·`Card`·`Input`·`Button`·`useToast`.
- Produces:
  - model: `QUESTION_BODY_MAX = 2000`; `bodySchema` = zod trim 1~2000 + `hasControlChars(v, { multiline: true })` 거부(문구 `내용을 입력해 주세요.`·`2000자까지 쓸 수 있어요.`·`CONTROL_CHAR_MESSAGE`); `type QuestionLink = { kind: "video"; videoId: string; title: string } | { kind: "session"; sessionId: string; date: string; className: string }`; `type Answer = { id: string; body: string; createdAt: string }`; `type Question = { id: string; body: string; createdAt: string; answeredAt: string | null; link: QuestionLink | null; answers: Answer[] }`; `type AdminQuestion = Question & { studentName: string }`; `linkLabel(link: QuestionLink): string`(`영상 · {title}` / `수업 · 11/4(화) {반}`); `formatQuestionTime(iso: string): string`(서울 `M/d HH:mm`); `sortAdminQuestions(qs: AdminQuestion[]): AdminQuestion[]` — 미답변 먼저, 그 안은 최근 먼저(새 질문이 맨 위에 뜬다), 답변된 것은 최근 먼저.
  - data: `listAdminQuestions(): Promise<AdminQuestion[]>`(`questions.select("id, body, created_at, answered_at, students(name), videos(title), sessions(date, classes(name)), answers(id, body, created_at)").order("created_at", { ascending: false }).order("created_at", { referencedTable: "answers", ascending: true }).limit(200)`, 영상이 지워져 `videos`가 null이면 link null); `countUnansweredQuestions(): Promise<number>`(`select("id", { count: "exact", head: true }).is("answered_at", null)`); `answerQuestion(questionId: string, body: string): Promise<void>`(insert + `.select("id")`, 0행 → `SaveNotAppliedError`).
  - `data/realtime.ts`: `type QuestionScope = { kind: "admin" } | { kind: "student"; studentId: string }`; `questionTopic(scope): string`; `subscribeQuestionChanges(scope: QuestionScope, onChange: () => void): () => void` — `supabase.channel(questionTopic(scope), { config: { private: true } })`에 `postgres_changes` 두 개(`table: "questions"`(학생은 `filter: "student_id=eq.<id>"`), `table: "answers"`, `event: "*"`, `schema: "public"`)를 걸고, `await supabase.realtime.setAuth()` 뒤 `subscribe(status => status === "SUBSCRIBED" && onChange())`(다시 붙을 때 놓친 것을 메운다, Review Focus 4). 반환 함수는 `removeChannel`; setAuth가 끝나기 전에 불려도 채널을 만들지 않거나 만든 즉시 지운다.
  - `state/keys.ts`: `questionKeys = { all: ["questions"] as const, admin: ["questions", "admin"] as const, unanswered: ["questions", "unanswered"] as const, mine: (studentId: string) => ["questions", "mine", studentId] as const, linkOptions: (studentId: string) => ["questions", "link-options", studentId] as const }`.
  - `useQuestionsRealtime(scope: QuestionScope | null): void` — scope가 있을 때 effect로 구독, `onChange` = `invalidateQueries({ queryKey: questionKeys.all })`, 언마운트 때 해제. effect 의존성은 scope 객체가 아니라 `questionTopic(scope)` 문자열(매 렌더 새 객체여도 다시 구독하지 않게). `useAdminQuestionFeed(): void` = `useQuestionsRealtime(ADMIN_SCOPE)`(모듈 상수 `{ kind: "admin" }`; AdminShell은 원장에게만 그려진다).
  - `useAdminQuestions()`, `useUnansweredQuestionCount()`(`staleTime: 60_000`), `useAnswerQuestion()` — 성공 시 `questionKeys.all` invalidate, pending 중 재제출 무시.
  - `QuestionBody({ text }: { text: string })` — `<p className="min-w-0 text-body break-words whitespace-pre-line text-text">`(일반 텍스트만).
  - `AdminQuestionsScreen`: h1 `질문`; `Tabs variant="segment"` `미답변`(count) / `전체`(기본 미답변); 카드마다(`Card tone="raised"`) 윗줄 `{학생 이름} · {시각}` + link가 있으면 `Badge tone="neutral"` `linkLabel`; `QuestionBody`; 답변 목록(`원장 답변 · {시각}` + 본문); `AnswerForm`(`Input multiline` `답변`, hint `{n}/2000`, secondary `답변 보내기`, 성공 토스트 `답변을 보냈어요.` + 비우기, 실패 `classifyError` 토스트). 미답변 0건 → `새 질문이 없어요. 학생이 질문하면 여기에 바로 떠요.`
  - `AdminShell`: `useAdminQuestionFeed()` 한 번 + `questions` 메뉴에 `count: useUnansweredQuestionCount().data`(1 이상일 때만, 상담과 같은 방식).
  - `today`: `UNANSWERED_QUESTIONS_PLACEHOLDER` 삭제, `TodayScreen`의 `미답변 질문` Stat = `useUnansweredQuestionCount()`(로딩·오류 `-`, 그 밖 `{n}개`) + `href="/admin/questions"`.
  - `/admin/questions/page.tsx` → `AdminQuestionsScreen`.
  - index: `AdminQuestionsScreen`, `useUnansweredQuestionCount`, `useAdminQuestionFeed`, `useQuestionsRealtime`, `questionKeys`, `QuestionBody`, `bodySchema`, 타입들.

- [ ] **Step 1: 실패하는 테스트 작성 — model**: `bodySchema` `"   "` → `내용을 입력해 주세요.`, 2001자 → `2000자까지 쓸 수 있어요.`, `"a\u0007"` → 제어 문자 문구, `"첫 줄\n둘째 줄"` 통과; `sortAdminQuestions`([답변됨 11/5, 미답변 11/3, 미답변 11/4, 답변됨 11/2]) → 11/4, 11/3, 11/5, 11/2; `linkLabel` 두 종류; `formatQuestionTime("2026-11-04T08:05:00Z")` `11/4 17:05`.
- [ ] **Step 2: 실패하는 테스트 작성 — data·state·screen**
  - `questions.test.ts`: 목록 행 `videos: null, sessions: null` → `link null`; `sessions: { date, classes: { name } }` → session link; `countUnansweredQuestions` → `.is("answered_at", null)`, `count` 3 → 3; `answerQuestion` 0행 → `SaveNotAppliedError`.
  - `realtime.test.ts`(supabase mock: `channel` → `{ on, subscribe }` 체인 기록, `realtime.setAuth` resolve, `removeChannel` spy): admin → 주제 `questions:admin`, `config.private` true, `questions` 구독에 filter 없음; student → `questions:student:s1`, filter `student_id=eq.s1`; `subscribe` 콜백 `"SUBSCRIBED"` → onChange 1회, `"CHANNEL_ERROR"` → 0회; 해제 → `removeChannel` 1회; setAuth 대기 중 해제 → 채널이 남지 않는다(`channel` 0회이거나 `removeChannel` 1회).
  - `useQuestionsRealtime.test.tsx`(`subscribeQuestionChanges` mock): `<StrictMode>` mount → 활성 구독 1개(구독 수 − 해제 수 = 1), unmount → 0; onChange → `invalidateQueries({ queryKey: ["questions"] })`; scope null → 구독 없음.
  - `AdminQuestionsScreen.test.tsx`: 미답변 탭에 미답변만, 학생 이름·`영상 · …` 배지; 공백 없는 2000자 본문이 `break-words` 클래스의 `p`로; 답변 보내기 대기 중 두 번 → mutate 1회; 빈 답변 → 문구; 미답변 0 문구.
  - `AdminShell.test.tsx`: `useUnansweredQuestionCount` 2 → `질문` 메뉴에 `2`; 0 → 숫자 없음; `useAdminQuestionFeed` 1회 호출.
  - `TodayScreen.test.tsx`: `@/features/questions` mock 3 → `미답변 질문 3개`, 링크 `/admin/questions`; 오류 → `-`.
- [ ] **Step 3:** `npm test -- src/features/questions src/features/admin-shell src/features/today` → FAIL → 구현 → PASS.
- [ ] **Step 4:** `grep -rn "UNANSWERED_QUESTIONS_PLACEHOLDER" src` 결과 없음. 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/features/questions src/app/admin/questions src/features/admin-shell src/features/today
  git commit -m "feat(questions): admin questions inbox with private-channel realtime, answer form, unanswered sidebar badge and today count"
  ```

---

### Task 9: 학생 질문 — 내 질문·답변(Realtime), 새 질문(영상·수업 연결), 재생·숙제에서 "질문하기"

**Files:**
- Create: `src/features/questions/components/QuestionForm.tsx`, `components/QuestionForm.test.tsx`, `components/MyQuestionCard.tsx`, `screen/StudentQuestionsScreen.tsx`, `screen/StudentQuestionsScreen.test.tsx`
- Modify: `src/features/questions/data/questions.ts`, `data/questions.test.ts`, `state/useQuestions.ts`, `src/features/questions/index.ts`, `src/app/s/questions/page.tsx`, `src/features/homework/components/HomeworkItemRow.tsx`, `src/features/homework/screen/HomeworkScreen.test.tsx`

**Interfaces:**
- Consumes: Task 8(`bodySchema`, `questionKeys`, `useQuestionsRealtime`, `QuestionBody`, `linkLabel`, `formatQuestionTime`, 타입), `useMyVideos`·`type MyVideo`(`@/features/videos`), `useMyStudent`, `toLocalDateKey`·`formatShortDate`·`dayLabelOf`, `Select`·`Input`·`Button`·`Card`·`useToast`.
- Produces:
  - data: `listMyQuestions(): Promise<Question[]>`(같은 select에서 `students(name)` 뺌, RLS가 내 것만); `listRecentSessions(today: string): Promise<{ id: string; date: string; className: string }[]>`(`sessions.select("id, date, classes(name)").lte("date", today).order("date", { ascending: false }).limit(10)`); `askQuestion(input: { body: string; videoId: string | null; sessionId: string | null }): Promise<void>`(insert `{ body, video_id, session_id }`만 — student_id를 보내지 않는다, `.select("id")`, 0행 → `SaveNotAppliedError`).
  - `useMyQuestions(studentId)`, `useRecentSessions(studentId)`, `useAskQuestion(studentId)` — 성공 시 `questionKeys.all` invalidate, pending 중 재제출 무시.
  - `type LinkOption = { value: string /* "" | "video:<id>" | "session:<id>" */; label: string }`; `buildLinkOptions(videos: MyVideo[], sessions: …): LinkOption[]` — `연결 안 함`, 영상(`영상 · {title}`), 수업(`수업 · 11/4(화) {반}`); `parseLinkValue(value: string): { videoId: string | null; sessionId: string | null }`; `initialLinkValue(params: { video: string | null; session: string | null }, options): string` — 목록에 있는 값만(없으면 `""`).
  - `QuestionForm({ studentId, initialLink }: …)` — `Card size="lg" title="질문하기"`, `Select` `무엇에 대한 질문인가요?`(LinkOption), `Input multiline` `질문 내용`(hint `{n}/2000`, `size="lg"`), primary `질문 보내기`(화면의 유일한 primary). 성공 → 토스트 `질문을 보냈어요. 원장님이 답하면 여기에 보여요.` + 본문 비우기(연결은 유지); 실패 → `classifyError(e).message`(DB P0001 연결 문구 그대로) 토스트.
  - `MyQuestionCard({ question }: …)` — 윗줄 `{시각}` + link 배지, `QuestionBody`, 답변 있으면 각각 `원장님 답변 · {시각}` + `QuestionBody`(`bg-bg-subtle rounded-lg p-3`), 없으면 `아직 답변을 기다리고 있어요.`(`text-body-sm text-text-muted`).
  - `StudentQuestionsScreen` — `useSearchParams`의 `video`·`session`; h1 `질문`; `QuestionForm`; `내 질문` 목록(최근 먼저), 0건 `아직 한 질문이 없어요. 궁금한 게 생기면 위에서 물어봐요.`; `useQuestionsRealtime({ kind: "student", studentId })`(이 화면이 열려 있을 때만).
  - `/s/questions/page.tsx` → `<Suspense><StudentQuestionsScreen /></Suspense>`(ComingSoon 교체).
  - `HomeworkItemRow`: 숙제 글 아래 `next/link` `질문하기` → `/s/questions?session=<sessionId>`(`text-body-sm text-text-brand`, 48px 터치 높이 `min-h-12 inline-flex items-center`) — 버튼이 아니라 링크(목록의 primary 규칙과 겹치지 않게).
  - index: `StudentQuestionsScreen` 추가.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `questions.test.ts`: `askQuestion({ body: "질문", videoId: "v1", sessionId: null })` → insert 인자에 `student_id` 키가 없다, `{ body: "질문", video_id: "v1", session_id: null }`; 0행 → `SaveNotAppliedError`.
  - `QuestionForm.test.tsx`: `buildLinkOptions` 라벨·값; `parseLinkValue("video:v1")` `{ videoId: "v1", sessionId: null }`; `initialLinkValue({ video: "v1" })` → `video:v1`, 목록에 없는 `v9` → `""`; 빈 본문 → `내용을 입력해 주세요.`, mutate 0회; 대기 중 두 번 → 1회; 성공 → 본문 칸 `""`, 연결 Select 값 유지; reject `{ code: "P0001", message: "내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요." }` → 토스트 그 문구.
  - `StudentQuestionsScreen.test.tsx`(`useSearchParams` mock `?video=v1`, hooks mock): Select 기본값 `video:v1`; 답변 있는 질문 `원장님 답변`, 없는 질문 `아직 답변을 기다리고 있어요.`; `useQuestionsRealtime`가 `{ kind: "student", studentId: "s1" }`로 호출; 0건 문구.
  - `HomeworkScreen.test.tsx`: 각 숙제 행에 `질문하기` 링크 href `/s/questions?session=<id>`.
- [ ] **Step 2:** `npm test -- src/features/questions src/features/homework` → FAIL → 구현 → PASS.
- [ ] **Step 3:** `grep -rn "질문하기는 곧 열려요" src` 결과 없음. 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/questions src/app/s/questions src/features/homework/components/HomeworkItemRow.tsx src/features/homework/screen/HomeworkScreen.test.tsx
  git commit -m "feat(questions): student questions with realtime answers, video or session link and ask links from player and homework"
  ```

---

### Task 10: 끝까지 확인(1280·390, 실제 mp4·Realtime), 후속 문서

**Files:**
- Create (저장소 밖): `/private/tmp/claude-502/-Users-jh-orca-projects-heesu/4cb5871e-009e-4d1f-b076-7635ccd7f4c8/scratchpad/visual/fixtures/make-mp4.swift`, `…/visual/videos-e2e.mjs`, `…/visual/questions-e2e.mjs`(기존 `t11.mjs`의 TOTP 등록·`login()` 모양 그대로)
- Modify: `docs/superpowers/plans/v1-followups.md`, `docs/superpowers/plans/foundation-followups.md`
- Modify: 확인 중 드러난 결함이 있으면 그 Task의 파일(테스트 먼저)

**Interfaces:**
- Consumes: Task 1~9 전부. 시드 원장 `admin@example.test`(db reset 뒤 TOTP 새로 등록), 학생 `haneul`(중등 기초반)·`minjun`.
- 영상 픽스처: 저장소에 바이너리를 커밋하지 않는다. `swift make-mp4.swift <out> <seconds> <width> <height> <bitsPerSecond> <noise:0|1>` — AVFoundation `AVAssetWriter`(H.264, 30fps, 프레임마다 색이 바뀌는 단색 또는 노이즈, 비조각 mp4라 `duration`이 유한) → `clip-5s.mp4`(320×180, 5초, ≈50KB), `clip-30s.mp4`(320×180, 30초 — 이어 보기는 5초 이상·끝 5초 전에서만 되므로), `clip-big.mp4`(1280×720, 20초, 노이즈, ≥ 13MB = 6MB 조각 3개 이상). Playwright는 `chromium.launch({ channel: "chrome" })`(번들 Chromium은 H.264를 못 읽는다).

- [ ] **Step 1: 준비** — `supabase stop && supabase start`(Task 2 config) → `supabase db reset` → psql `update public.students set must_change_password = false where login_id in ('haneul','minjun');` → 픽스처 생성, `ls -l`로 크기 확인 → `npm run dev`(`:3000`, 막혀 있으면 `-p 3001`).
- [ ] **Step 2: `videos-e2e.mjs`** — 단계마다 기대 결과를 로그, 콘솔 오류 0개:
  1. 원장(1280×900) 로그인 → `/admin/videos` → `영상 올리기` → 제목 `(예시) 현재완료 정리`, 반 `중등 기초반`, 공개일 오늘, `clip-5s.mp4` → `길이 0:05` → `올리기` → 목록에 그 행, `다 본 학생 0/n명`. psql `select count(*) from storage.objects where bucket_id = 'videos'` = 1.
  2. `clip-big.mp4` 올리면서 `aria-valuenow` 값을 모아 0과 100 사이 값이 2개 이상; 다시 `clip-big.mp4`로 시작해 30% 넘으면 `취소` → psql 객체 수 그대로, `videos` 행 수 그대로.
  3. 이어 올리기: `clip-big.mp4` 시작 → 40%를 넘으면 `page.reload()` → 같은 반·같은 파일로 다시 `올리기` → 첫 진행 값이 0보다 큼(이어서) → 성공, psql 객체 경로가 처음 시작한 경로와 같다. (오프라인은 `retryDelays` 합 38초가 지나야 실패하므로 여기서 기다리지 않는다 — 망 문구는 Task 5 단위 테스트가 맡는다.)
  4. `notes.txt`를 `.mp4`가 아닌 이름으로 고르면 `mp4 파일만 올릴 수 있어요.`
  5. 두 번째 영상 공개일 내일로 올림 → 목록에 `공개 예정`.
  6. 원장이 `clip-30s.mp4`도 같은 반에 올린다. 학생 haneul(390×844) `/s` → `새 영상` 카드에 가장 최근 영상; `영상` 탭 → 2개(공개 예정 안 보임); 30초 영상 재생 화면 → signed URL 발급 POST `/storage/v1/object/sign/videos/` 1회; `video.play()` 후 12초 → psql `video_views` `watched_seconds` ≥ 10; `video.currentTime = 28` 건너뛴 뒤 `pause` → `watched_seconds` < 20(건너뛴 구간 미포함); 다시 12초 지점으로 돌려 `pause` → 새로고침 → `currentTime` ≥ 11(이어 보기).
  7. 만료 흉내: `page.route`로 `token=`이 붙은 미디어 GET(`/storage/v1/object/sign/…?token=`)의 첫 요청만 403 → 발급 POST 2회, 그 뒤 재생됨.
  8. 권한(REST): minjun 토큰으로 haneul 반 영상의 `POST /storage/v1/object/sign/videos/<path>` → 4xx; anon `GET /storage/v1/object/public/videos/<path>` → 4xx; minjun `/rest/v1/videos?select=id` → `[]`.
  9. 원장 상세 → 시청 현황에 김하늘 `100%`, `아직 안 봤어요` 행; 제목 수정 → 목록 반영; 두 번째 영상 지우기 → psql 행·객체 모두 사라짐.
  10. 스크린샷 `admin-videos-1280.png`, `admin-video-detail-1280.png`, `student-videos-390.png`, `student-player-390.png`.
- [ ] **Step 3: `questions-e2e.mjs`** — 원장 컨텍스트(1280)와 학생 컨텍스트(390)를 동시에:
  1. 원장 `/admin/questions` 열어 둠(사이드바 `질문` 배지 1 — 시드 미답변), `/admin` 오늘 `미답변 질문 1개`.
  2. haneul 재생 화면 `질문하기` → Select 기본값 그 영상 → 공백 없는 2000자 본문 → `질문 보내기` → 토스트; `scrollWidth <= 390`.
  3. 원장 화면이 새로고침 없이 5초 안에 그 질문을 맨 위에 보여 주고 배지 2.
  4. 원장이 답변 → haneul `질문` 탭이 새로고침 없이 5초 안에 `원장님 답변`.
  5. minjun 컨텍스트도 `질문` 탭을 열어 두고, 그동안 minjun 화면에 haneul 질문·답변이 0개(WebSocket 프레임에서도 haneul 질문 본문이 안 보임 — `page.on('websocket')`로 프레임 검사).
  6. 숙제 탭 `질문하기` → `?session=` → Select 기본값이 그 수업.
  7. 원장 1024px에서 2000자 질문 카드 `scrollWidth <= 1024`.
  8. 스크린샷 `admin-questions-1280.png`, `student-questions-390.png`.
- [ ] **Step 4: 후속 문서** — `v1-followups.md` "videos-questions"의 `UNANSWERED_QUESTIONS_PLACEHOLDER` 항목과 (있으면) `/s/videos·/s/questions` 자리표시 항목을 `[x]`로. `foundation-followups.md`의 "Storage: meta test…" → `[x]`(Task 2). 새 항목 "demo-deploy-qa": `- 클라우드 Free는 파일당 50MB가 전역 한도다(버킷 1GiB 설정보다 우선) — 시연 영상은 짧은 클립, Pro 전환 때 전역 한도를 1GiB로.`, `- 대시보드 Realtime "Allow public access" 끈 상태에서 private 채널 참여·질문 실시간 갱신을 배포 미리보기에서 확인.`, `- db push 뒤 storage.buckets videos(public false, video/mp4) 확인.`, `- QA: 아이폰 Safari에서 영상 재생(playsinline)·이어 보기·홈 화면 앱에서 재생.`, "guardian-records": `- 퇴원 처리 때 Storage 파일 정리(S12)는 영상이 반 단위라 해당 없음 — 학생별 파일이 생기면 다시 본다.`, 그리고 웹푸시를 건너뛰면 `- 웹푸시(Task 11, 계획 5) 미구현.`
- [ ] **Step 5:** 전체 검증 → PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add docs/superpowers/plans/v1-followups.md docs/superpowers/plans/foundation-followups.md
  git commit -m "docs: videos-questions follow-ups for free-tier size cap, realtime public access and device qa"
  ```

---

### Task 11 (선택 — 시간이 남으면, 건너뛰어도 다른 Task에 영향 없음): 원장 웹푸시 "새 질문이 도착했어요"

> 스펙 §4 설정 "웹푸시 알림 켜기(시간이 남으면)", §11 빼는 순서 1번. 건너뛰면 Task 10 Step 4의 미구현 메모만 남긴다. 이 Task는 앞 Task의 파일을 바꾸지 않는다(`questions` 테이블에는 새 트리거만 더한다).

**Files:**
- Create: `supabase/migrations/20261109000300_admin_push.sql`, `supabase/tests/13_admin_push.test.sql`
- Create: `supabase/functions/notify-admin/{index.ts,handler.ts,handler_test.ts,deno.json}`
- Create: `public/admin-sw.js`, `src/test/admin-sw.test.ts`
- Create: `src/features/admin-push/{index.ts,data/push.ts,data/push.test.ts,components/PushToggleCard.tsx,components/PushToggleCard.test.tsx}`, `src/core/pwa/constants.ts`(VAPID 공개키 상수 추가)
- Modify: `supabase/config.toml`(`[functions.notify-admin] verify_jwt = false`), `supabase/functions/.env.example`, `supabase/tests/00_meta.test.sql`, `src/app/admin/settings/page.tsx`, `eslint.config.mjs`(`ADMIN_UI_FILES`에 `src/features/admin-push/**`)

**Interfaces / 결정:**
- 서비스 워커: 지금 `sw.js` 범위는 `/s`라 원장 화면을 다루지 못한다. 원장용은 **따로** `public/admin-sw.js`(범위 `/admin`, `push`·`notificationclick`만, `fetch` 핸들러 없음 — 원장 화면은 캐시하지 않는다). `push` → `showNotification("희수영어", { body: "새 질문이 도착했어요", data: { url: "/admin/questions" } })`(S4: 이름·내용 없음); 클릭 → 그 주소 창 focus 또는 열기.
- VAPID 공개키는 비밀이 아니고 환경마다 같은 한 쌍을 쓰므로 `src/core/pwa/constants.ts`의 `ADMIN_PUSH_VAPID_PUBLIC_KEY` 상수(새 `NEXT_PUBLIC_*` 변수를 만들지 않는다 — AGENTS.md). 비밀키는 `supabase secrets`/`functions/.env`의 `VAPID_PRIVATE_KEY`만.
- DB: `public.push_subscriptions (id uuid pk, user_id uuid not null default auth.uid() references auth.users on delete cascade, endpoint text not null unique check (endpoint ~ '^https://'), p256dh text not null, auth text not null, created_at timestamptz default now())`; 정책 select·insert·delete 모두 `user_id = (select auth.uid()) and (select private.is_admin())`; 컬럼 grant insert `(endpoint, p256dh, auth)`. 트리거 `questions_notify_admin` AFTER INSERT → `private.notify_admin_new_question()`(security definer): `vault.decrypted_secrets`의 `notify_admin_url`·`notify_admin_secret`이 둘 다 있을 때만 `net.http_post(url, body := jsonb_build_object('question_id', new.id), headers := jsonb_build_object('x-notify-secret', secret, 'content-type', 'application/json'))`, 없거나 실패해도 **질문 insert는 절대 실패하지 않는다**(`exception when others then null`). `create extension if not exists pg_net`.
- Edge Function `notify-admin`(S4 Webhook): `x-notify-secret`를 env `NOTIFY_ADMIN_SECRET`과 상수 시간 비교(틀리면 401), service_role로 `push_subscriptions` 전부 → `jsr:@negrel/webpush`로 전송, 404·410 응답 구독은 삭제. `handler.ts`는 의존성 주입(기존 `create-student/handler.ts` 형식).
- 화면: `/admin/settings`에 `PushToggleCard`(`Card tone="raised" title="새 질문 알림"`): 지원 안 됨 → `이 브라우저는 알림을 지원하지 않아요.`; 꺼짐 → secondary `알림 켜기` → `Notification.requestPermission()` → `navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" })` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → insert; 거부 → `브라우저 설정에서 이 사이트 알림을 허용해 주세요.`; 켜짐 → `알림 끄기`(unsubscribe + delete). 원장 비밀번호 변경은 이 Task 범위 밖이라 설정 화면에는 이 카드와 `비밀번호 변경은 준비 중이에요.` 한 줄만 둔다.

- [ ] **Step 1: 실패하는 테스트 작성** — `13_admin_push.test.sql`: 원장 aal2 본인 구독 insert·select 1행, 다른 원장 행 0행, 학생 insert → `42501`; vault 비밀 없이 학생 질문 insert 성공(트리거가 막지 않음); `00_meta`(push 테이블 RLS는 기존 검사, 함수 목록 변화 없음 확인). `handler_test.ts`: 비밀 틀림 401, 맞음 → 구독 2개에 전송, 410 구독 삭제, 본문에 질문 내용이 없다. `admin-sw.test.ts`(`sw.test.ts`의 vm 방식): `push` → `showNotification("희수영어", { body: "새 질문이 도착했어요", … })`, `fetch` 핸들러 등록 없음. `PushToggleCard.test.tsx`: 권한 거부 문구, 성공 시 insert 인자 `{ endpoint, p256dh, auth }`(user_id 없음).
- [ ] **Step 2:** `npm run db:test`, `npm run fn:check`, `npm test -- src/features/admin-push src/test/admin-sw.test.ts` → FAIL → 구현 → PASS.
- [ ] **Step 3: 로컬 확인** — `supabase functions serve` + vault에 `notify_admin_url` = `http://kong:8000/functions/v1/notify-admin`, `notify_admin_secret` 저장 → Chrome(`:3000`, 원장)에서 알림 켜기 → 학생 질문 → 알림 표시. 안 되면 원인을 적고 Task를 "건너뜀"으로 정리한다(질문 기능에는 영향 없음).
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add supabase/migrations/20261109000300_admin_push.sql supabase/tests/13_admin_push.test.sql supabase/tests/00_meta.test.sql supabase/functions/notify-admin supabase/functions/.env.example supabase/config.toml public/admin-sw.js src/test/admin-sw.test.ts src/features/admin-push src/core/pwa/constants.ts src/app/admin/settings/page.tsx eslint.config.mjs
  git commit -m "feat(push): optional admin web push for new questions via pg_net webhook, notify-admin function and an admin-scoped service worker"
  ```
