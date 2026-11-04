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
- [x] `class_members` counts on the class list now read the `class_roster` view, so `left` students are excluded (`src/features/classes/data/classes.ts`).
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
- [x] QA: iPhone Safari add to home screen and Android Chrome install; SW registration and the offline message under the CSP. → QA §5·§6, 런북 §5
- [x] QA: student password change does not ask for the current password — confirm with the director. → QA §3·§8
- [x] SW: prune `/_next/static` cache growth (`public/sw.js`, hs-shell cache).
- [x] Headers test: pin exact `worker-src 'self'` / `manifest-src 'self'` values. (`src/test/headers.test.ts`, Task 3)
- Offline before the first controlled visit, and an offline reload of a cached /s page shows a blank screen then the generic role-error message — add an offline-aware message. → QA §6 알려진 한계, 시연 뒤(12/1 전)
- [x] PWA leak test greps all of src/app except `s/` for the manifest/SW wiring. (`src/test/pwa.test.ts`, Task 3)
- [x] InstallGuideCard: `useSyncExternalStore` (`src/features/my-info/components/InstallGuideCard.tsx`).
- ChangePasswordCard: ref-based in-flight guard against double submit. → 시연 뒤(12/1 전)
- Modal: render via a top-level host or move Modals out of Card; focus-trap wrap and scroll-restore tests. → 시연 뒤(12/1 전)
- Sign-out fallback duplicated in core/auth session.tsx and features/auth data — single helper. → 시연 뒤(12/1 전)
- [x] `create-student` Edge Function rejects control characters in names (`CONTROL_CHARS` in `supabase/functions/create-student/handler.ts`).
- [x] Turnstile siteverify fetch timeout (5s) + tests for non-2xx / non-JSON fail-closed. (`supabase/functions/submit-consultation/turnstile.ts`, `turnstile_test.ts`, Task 2)
- Type the Edge Function's supabase client with `Database` so `deno check` catches RPC param drift. → 시연 뒤(12/1 전). (hosted smoke: [x] → 런북 §5·§6)
- Turnstile hostname check — ship together with real keys before 12/1. → 런북 §8
- A11y pass: role=alert on missing-token and Turnstile failure text; clear Turnstile `failed` after recovery; focus the success card; phone caret jump. → 시연 뒤(12/1 전)
- Visual pass: section tab row scroll back to left when none active; icon differences vs mock; footer privacy link underline; `text-h2` + `text-[20px]` conflict without cn in SiteHeader and PrivacyScreen. → 시연 뒤(12/1 전)
- [x] StrictMode Turnstile re-render check in a browser. → QA §1
- [x] README: local build needs `.env.local` (`README.md`, Task 4).
- SiteFooter hard-codes 대표 and 사업자등록번호 as null (`src/features/landing/components/SiteFooter.tsx`; not editable from 랜딩 관리): fill via a code change or the legal site_content before public launch. → 시연 뒤(12/1 전)
- Hard gate before public launch: /privacy Blank values filled, claims about unbuilt features removed or built, legal review, then re-enable indexing. → 런북 §8, QA §9
- [x] Re-verify on cloud that an old refresh token fails after reset; access token valid ≤1h. → QA §7·§11
- `getUser` network failure maps to 401 not 500 on the HS256 fallback path. → 시연 뒤(12/1 전)
- [x] QA notes: signed-out aal2 token valid until exp; create-student orphan auth user; cloud CORS on OPTIONS. → QA §11, 런북 §9·§5
- [x] Verify TOTP QR renders under the real CSP on the deployed preview. → 런북 §6
- [x] CI: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` (`.github/workflows`, Task 3).
- [x] QA step: second save of 학교·보호자 against the real DB. → QA §2
- [x] `seed-demo.sql` auth.users shape: not applicable — the seed does not insert into `auth.users` (accounts come from `create-student`).

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
- `today` keys computed at render (AttendanceScreen, TodayScreen) — a tab open past midnight keeps yesterday until re-render. → QA §2 알려진 동작, 시연 뒤(12/1 전)
- Attendance board "recent 8" includes future-dated sessions — consider `.lte("date", today)`. → QA §2, 시연 뒤(12/1 전)
- [x] Membership trigger blocks admin edits on past cells for removed students (board hides them). → QA §2
- [x] `classes` INSERT column-level grant. (`supabase/migrations/20261110000100_consultations_retention.sql`: `grant insert (name, level, schedule, capacity)`)
- AttendanceTable: `th` scope=col/colgroup; roving tab stops; showHomework=false header + controlled double-click tests. → 시연 뒤(12/1 전)
- Attendance undo on a stale toast overwrites a newer value (per-cell sequence number would fix ABA too). → 시연 뒤(12/1 전)
- 오늘 card shows 수업 시작 briefly while progress loads; screen test for starting a pre-existing session. → 시연 뒤(12/1 전)
- `aria-selected` on `tr`; points history row / negative styling / failure / invalidation tests. → 시연 뒤(12/1 전)

## videos-questions (from student-app final review)
- [x] SW navigation cache keyed by full URL — normalised to origin+pathname (`public/sw.js` `url.origin + url.pathname`); `/_next/static` pruned on activate (`public/sw.js`).
- Admin web push needs a separate registration scoped `/admin`. → v1에 없음 (웹푸시 전부)

## guardian-records (from student-app final review)
- [x] Students who join a class later see all its past homework as submittable — filter by `class_members.created_at`. (Task 6 screen filter; `guardian_view` uses the same rule, Task 1)
- [x] Manual point reasons are visible to students — add hint "학생 화면에도 보여요" in ManualPointForm. (Task 6)
- `PointsCard` fallback duplicates PointsProgress markup — goal-optional PointsProgress. (left → v2: design-system contract change, together with the design source)
- [x] site_content migration header comment: document `points_goal`. (Task 7 new migration header; applied files are not edited)

## demo-deploy-qa (from student-app final review)
- [x] iOS standalone storage is separate from Safari: install guide wording; celebration may fire once per context. → Task 3, QA §5
- [x] Confirm `/s` is not redirected on Cloudflare Pages (precache of redirected response). → 런북 §5

## demo-deploy-qa (from videos-questions)
- [x] 클라우드 Free는 파일당 50MB가 전역 한도다 — 시연 영상은 짧은 클립, Pro 전환 때 전역 한도를 1GiB로. → 런북 §3·§6, QA §2
- [x] 대시보드 Realtime "Allow public access" 끈 상태에서 private 채널 참여·질문 실시간 갱신 확인. → QA §0·§7
- [x] db push 뒤 storage.buckets videos(public false, video/mp4) 확인. → 런북 §1
- [x] QA: 아이폰 Safari에서 영상 재생(playsinline)·이어 보기·홈 화면 앱에서 재생. → QA §5
- 업로드 성공 뒤 행 저장 전에 탭이 닫히면 Storage에 고아 영상 파일이 남는다 — 원장용 정리 화면. → QA §11 알려진 한계, v1에 없음
- [x] Pro 전환 때 영상 최대 크기(src/features/videos/model/videos.ts)를 1GiB로 되돌리고 Storage 전역 한도도 올린다. → QA §10
- [x] 서비스워커는 production 빌드에서만 등록된다 — 미리보기 오프라인 셸, ?id= 화면 캐시, Range 통과 확인. → QA §6

## guardian-records (from videos-questions)
- [x] 퇴원 처리 때 Storage 파일 정리(S12)는 영상이 반 단위라 해당 없음 — 학생별 파일이 생기면 다시 본다. (기록만, Task 11)
- [x] S9: 등록 서류에 수업 녹화·공개 동의 항목 추가(정보 동의 화면·문서). (Task 6 ConsentCard 안내; 동의서 실물 확인은 demo-deploy-qa '누나 확인' 항목)
- [x] `video_views.watched_seconds`는 클라이언트가 보고한 값이다 — 시청 활동 기록일 뿐 증빙이 아니다(원장 화면 문구·학부모 안내에서 단정하지 않기). (Task 6 원장 문구; `/g`는 영상 기록을 보여 주지 않는다, Task 1)
- answers UPDATE(body) 권한·정책은 '답변 고치기' 화면용으로 남겨 둠(현재 UI 없음). (그대로 — 고치기 화면이 생길 때 쓴다)

## 시연 뒤 · 12/1 전
- SiteFooter hard-codes 대표/사업자등록번호 as null — needs a code change (or legal site_content) before go-live.
- Contact phone rule rejects 1588/070 forms — loosen the DB check and zod rule if the academy uses one.
- [x] `supabase/seed-demo-clear.sql` lacks the single-transaction probe the seed has. → 해당 없음(컨트롤러 판단: 필요 없음)
- Guardian status card uses the browser clock for expiry labels (`/g`) — use a server-side value.
- Payments table: name column is not sticky when scrolling horizontally.
- site_content pgTAP coverage gaps: nested control char, tuition/legal bad values, 8192 boundary, contact phone null.
- Consultations query invalidation test.
- Offline first visit / offline reload shows a blank screen then a generic role error — offline-aware message.
- ChangePasswordCard double-submit guard; Modal host and focus-trap tests; sign-out fallback single helper.
- Edge Function client typed with `Database`; `getUser` network failure mapped to 401 instead of 500.
- A11y bundle (Turnstile alerts, focus on success card, phone caret) and visual bundle (tab row scroll, icons, footer link underline, `text-h2` conflict).
- Class-ops: `today` past midnight, attendance recent-8 includes future sessions, AttendanceTable a11y, undo ABA, 오늘 card flash, `aria-selected` and points-history tests.

## v1에 없는 것
- 웹푸시 전부: 원장 설정 "웹푸시 알림 켜기", `push_subscriptions` 테이블, `notify-admin` 함수, `/admin` 범위 SW 등록 (spec §4·§7, 계획 5 Task 11 미구현).
- Sentry (S11; `/privacy` 처리위탁의 "나중" 항목, CSP `connect-src`에도 없음).
- 알림톡·솔라피·`send-alimtalk` (spec §1 비목표).
- 실제 도메인, 리포트 자동 발송·성적 그래프·수납 연동, 다중 학원 (spec §1 비목표).
- staging 프로젝트·환경별 CSP (S13 — 개원 후), CSP `'unsafe-inline'` 제거 (S10 — 개원 전), Leaked password protection·세션 비활동 타임아웃 (S5 — Pro), 일일 백업·월 1회 덤프 (S12 — Pro).
- 퇴원생 Auth 삭제·개인정보 파기 자동화 (spec §11 — v1은 상태만, Pro 전환 체크리스트).
- 답변 고치기 화면(권한만 있음), 고아 영상 파일 정리 화면, 지도 embed.
- service_role 쓰기의 감사 actor (v2), goal 선택 `PointsProgress` (v2).
