# v1 follow-ups (carried from landing final review)

## auth-admin-base
- [x] Input/Checkbox/Select merge caller-provided aria-describedby and respect a caller aria-invalid when there is no error.
- [x] Tests: multiline Input; Checkbox with description + error; aria-describedby merge; Card/Badge/Toast behavior.
- [x] Danger toast with actionLabel is dismissed after onAction (tested).

## class-ops
- [x] Any client-facing `raise exception` (P0001) text must be Korean "-해요" (classifyError shows it verbatim) — AGENTS.md convention (defe7d1, Task 1).
- [x] Strip/reject control characters in names shown in admin views — DB check constraints + `hasControlChars` in zod (defe7d1, Task 1).
- [x] Meta test: security-definer scan without the `proowner = 'postgres'` filter for public/private (defe7d1).
- [x] New policies use `(select private.is_admin())` / `(select private.my_student_id())`; column-level grants for `classes` UPDATE (name, level, schedule, capacity) and `student_private` (school, guardian_name, guardian_phone, memo + student_id for upsert) (defe7d1, `20261107000100_tighten_grants.sql`).
- [x] Revoke service_role EXECUTE on `my_role` and `password_changed` (defe7d1).
- [x] `parseSchedule` no longer returns a silent `[]`: it reports `invalid: true` and the class form refuses to save over it (c14dba5).
- [x] Add `.hs-num { font-variant-numeric: tabular-nums }` to globals.css (present, used by auth forms).
- [x] StatusChip `ariaLabel` JSDoc: prefix, don't repeat the status word (cb9a362).
- [x] Import `SaveNotAppliedError` from core directly (no classes model shim); paused vs left status tone (cb9a362).
- [x] Attendance board and progress exclude `status = 'left'` students via the `class_roster` view (defe7d1).
- [ ] `class_members` counts on the class list still read `class_members` directly, so they include `left` students — switch to `class_roster`.
- [x] Points history: client-side sort by shown date, "최근 50건만 보여요" note at the cap, and the student detail shows recent records + points.

## guardian-records
- [x] Add `points_goal` (jsonb integer 1~10000) editing to the landing admin (student home reward goal; changing it celebrates once more for the new goal). (Task 7 DB check, Task 8 보상 목표 card; Task 11 E2E: goal 5 → /s progress max 5)
- [x] `classes` INSERT is still table-level for `authenticated`: add a column-level grant (name, level, schedule, capacity) like UPDATE got in `20261107000100_tighten_grants.sql`. (Task 4)
- [x] site_content editor must write exactly the jsonb shape in `20261105000000_site_content.sql` (legal keys snake_case in DB, camelCase in TS) — put a shared zod write schema in `features/site-content/model`. (Task 8 `siteContentWrite.ts`)
- [x] useSiteContent hook tests: isLoading state; malformed row through the hook. (Task 8)
- [x] Landing DB-text containers need `min-w-0` / `break-words` (long tokens overflow at 390px) once admins can type long text. (Task 8; Task 11 E2E: 500-char notice body, landing scrollWidth 390)
- [x] Phone editor validation: `telHref` joins every digit (extensions) — validate phone format in the editor. (Task 7 DB check, Task 8 zod)
- [x] Consent version is duplicated in `src/features/consultations/model/consultation.ts` and `supabase/functions/submit-consultation/handler.ts` — add a cross-check test or single source when consents change. (Task 6 cross-check test)
- [x] pg_cron deletion of unregistered consultations after 6 months (privacy page states it). (Task 4 `purge-stale-consultations`; cloud check → demo-deploy-qa)
- [x] Don't export CONSENT_VERSION/TURNSTILE_SITE_KEY from consultations index; landing bundle pulls react-query via consultations index. (index still does not export them, kept in Task 5; react-query is needed on the landing anyway by `useSiteContent`, so nothing to split)
- Optional: pass admin id as audit hint for service_role writes. (left → v2 in foundation-followups)

## demo-deploy-qa
- QA: iPhone Safari add to home screen (standalone, bottom safe-area, icon) and Android Chrome install; on the deploy preview confirm SW registration and the offline message under the CSP (worker-src, manifest-src).
- QA: student password change does not ask for the current password (assumes a signed-in device) — confirm with the director.
- SW: prune `/_next/static` cache growth (old build entries accumulate in hs-shell-v1). (done in Task SW)
- Headers test: pin exact `worker-src 'self'` / `manifest-src 'self'` values.
- Offline before the first controlled visit: the SW only controls the page after the first reload (`clients.claim` narrows this window but does not remove it); cover that case. Also an offline reload of a cached /s page shows a blank screen for ~3s (role query retries) and then the generic role-error message — add an offline-aware message.
- PWA leak test should grep all of src/app except `s/` for the manifest/SW wiring.
- InstallGuideCard: use `useSyncExternalStore` instead of mount-time state.
- ChangePasswordCard: ref-based in-flight guard against double submit.
- Modal: render via a top-level host or move Modals out of Card (PasswordResetCard, StudentEditScreen); add focus-trap first→last wrap and unmount-while-open scroll-restore tests. (Deferred from class-ops.)
- Sign-out fallback duplicated in core/auth session.tsx and features/auth data — single helper. (Deferred from class-ops.)
- `create-student` Edge Function should reject control characters in names (the DB check is the only guard today and returns a generic error).
- Turnstile siteverify fetch timeout (`AbortSignal.timeout(5000)`) + tests for non-2xx / non-JSON fail-closed.
- Type the Edge Function's supabase client with `Database` so `deno check` catches RPC param drift; hosted smoke test.
- Turnstile hostname check — ship together with real keys before 12/1 (test keys report a dummy hostname).
- A11y pass: role=alert on missing-token and Turnstile failure text; clear Turnstile `failed` after recovery; focus the success card; phone caret jump.
- Visual pass: section tab row scroll back to left when none active; icon differences vs mock (Quote glyph, single-person icon), footer privacy link underline; `text-h2` + `text-[20px]` conflict without cn in SiteHeader and PrivacyScreen.
- StrictMode Turnstile re-render check in a browser (QA item).
- README: local build needs `.env.local`.
- SiteFooter hard-codes 대표 and 사업자등록번호 as null (not editable from 랜딩 관리): fill via a code change or the legal site_content before public launch.
- Hard gate before public launch: /privacy Blank values filled, claims about unbuilt features removed or built, legal review, then re-enable indexing.
- Re-verify on cloud that an old refresh token fails after reset; code comment: access token valid ≤1h.
- `getUser` network failure maps to 401 not 500 on the HS256 fallback path.
- QA notes: signed-out aal2 token valid until exp; create-student orphan auth user can wedge a login id (dashboard cleanup step); local Kong answers OPTIONS with ACAO * (verify CORS on cloud gateway).
- Verify TOTP QR renders under the real CSP on the deployed preview.
- CI: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- QA step: second save of 학교·보호자 against the real DB.
- `seed-demo.sql` must reuse the auth.users shape from seed.sql (empty token columns + identities).

## student-app
- [x] `my_rank()` follows the same rule as `student_point_totals` (active only, ties share a rank) (Task 1).
- [x] The student homework screen shows the `submit_homework` error text (the three P0001 messages) as is (Task 5).

## videos-questions
- [x] Replace the `/s/videos`·`/s/questions` placeholders (ComingSoonTabScreen) and the home '새 영상' card with real screens. Keep sw.js from intercepting cross-origin (Storage signed URL) and Range requests. (verified in Task SW + Task 7: cross-origin signed URL; Task 7·9 screens, Task 10 browser E2E)
- [x] Replace the unanswered-question count `UNANSWERED_QUESTIONS_PLACEHOLDER` (`src/features/today/model/today.ts`) with the real hook. (Task 8)
- 웹푸시(Task 11, 계획 5) 미구현.

## student-app (from class-ops final review)
- [x] `my_rank()` must be a security definer RPC returning only {rank,total}; active students only; ties 1,2,2,4; add to 00_meta allowlist (Task 1).
- [x] Decide `submit_homework` rules for due dates and paused students. Decision: submit_homework: paused students may submit; late submissions allowed (admin judges).

## demo-deploy-qa (from class-ops final review)
- `today` keys computed at render (AttendanceScreen, TodayScreen) — a tab open past midnight keeps yesterday until re-render.
- Attendance board "recent 8" includes future-dated sessions — consider `.lte("date", today)`.
- Membership trigger blocks admin edits on past cells for removed students (board hides them).
- `classes` INSERT column-level grant.
- AttendanceTable: `th` scope=col/colgroup; roving tab stops; showHomework=false header + controlled double-click tests.
- Attendance undo on a stale toast overwrites a newer value (per-cell sequence number would fix ABA too).
- 오늘 card shows 수업 시작 briefly while progress loads; screen test for starting a pre-existing session.
- `aria-selected` on `tr`; points history row / negative styling / failure / invalidation tests.

## videos-questions (from student-app final review)
- SW navigation cache keyed by full URL — normalise (ignoreSearch / pathname key) before adding `/s/videos/watch?id=…`; prune `/_next/static` entries on activate. (done in Task SW)
- Admin web push needs a separate registration scoped `/admin` (or scope `/` with path guards); keep `push`/`notificationclick` handlers outside fetch path guards.

## guardian-records (from student-app final review)
- [x] Students who join a class later see all its past homework as submittable — filter by `class_members.created_at`. (Task 6 screen filter; `guardian_view` uses the same rule, Task 1)
- [x] Manual point reasons are visible to students — add hint "학생 화면에도 보여요" in ManualPointForm. (Task 6)
- `PointsCard` fallback duplicates PointsProgress markup — goal-optional PointsProgress. (left → v2: design-system contract change, together with the design source)
- [x] site_content migration header comment: document `points_goal`. (Task 7 new migration header; applied files are not edited)

## demo-deploy-qa (from student-app final review)
- iOS standalone storage is separate from Safari: install guide should say "추가한 뒤 앱에서 다시 로그인해요"; celebration may fire once per context.
- Confirm `/s` is not redirected on Cloudflare Pages (precache of redirected response).

## demo-deploy-qa (from videos-questions)
- 클라우드 Free는 파일당 50MB가 전역 한도다(버킷 1GiB 설정보다 우선) — 시연 영상은 짧은 클립, Pro 전환 때 전역 한도를 1GiB로.
- 대시보드 Realtime "Allow public access" 끈 상태에서 private 채널 참여·질문 실시간 갱신을 배포 미리보기에서 확인.
- db push 뒤 storage.buckets videos(public false, video/mp4) 확인.
- QA: 아이폰 Safari에서 영상 재생(playsinline)·이어 보기·홈 화면 앱에서 재생.
- 업로드 성공 뒤 행 저장 전에 탭이 닫히면 Storage에 고아 영상 파일이 남는다 — 원장용 정리(행 없는 videos 객체 삭제) 추가.
- Pro 전환 때 영상 최대 크기(src/features/videos/model/videos.ts)를 1GiB로 되돌리고 Storage 전역 한도도 올린다.
- 서비스워커는 production 빌드에서만 등록된다 — 배포 미리보기에서 /s 오프라인 셸, ?id= 영상 화면 캐시 1개, Storage 영상 재생(Range 통과) 확인.

## guardian-records (from videos-questions)
- [x] 퇴원 처리 때 Storage 파일 정리(S12)는 영상이 반 단위라 해당 없음 — 학생별 파일이 생기면 다시 본다. (기록만, Task 11)
- [x] S9: 등록 서류에 수업 녹화·공개 동의 항목 추가(정보 동의 화면·문서). (Task 6 ConsentCard 안내; 동의서 실물 확인은 demo-deploy-qa '누나 확인' 항목)
- [x] `video_views.watched_seconds`는 클라이언트가 보고한 값이다 — 시청 활동 기록일 뿐 증빙이 아니다(원장 화면 문구·학부모 안내에서 단정하지 않기). (Task 6 원장 문구; `/g`는 영상 기록을 보여 주지 않는다, Task 1)
- answers UPDATE(body) 권한·정책은 '답변 고치기' 화면용으로 남겨 둠(현재 UI 없음). (그대로 — 고치기 화면이 생길 때 쓴다)
