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
- [x] Points history: client-side sort by shown date, "최근 50건만 보여요" note at the cap, and the student detail shows recent records + points (Task 8).

## guardian-records
- `classes` INSERT is still table-level for `authenticated`: add a column-level grant (name, level, schedule, capacity) like UPDATE got in `20261107000100_tighten_grants.sql`.
- site_content editor must write exactly the jsonb shape in `20261105000000_site_content.sql` (legal keys snake_case in DB, camelCase in TS) — put a shared zod write schema in `features/site-content/model`.
- useSiteContent hook tests: isLoading state; malformed row through the hook.
- Landing DB-text containers need `min-w-0` / `break-words` (long tokens overflow at 390px) once admins can type long text.
- Phone editor validation: `telHref` joins every digit (extensions) — validate phone format in the editor.
- Consent version is duplicated in `src/features/consultations/model/consultation.ts` and `supabase/functions/submit-consultation/handler.ts` — add a cross-check test or single source when consents change.
- pg_cron deletion of unregistered consultations after 6 months (privacy page states it).
- Don't export CONSENT_VERSION/TURNSTILE_SITE_KEY from consultations index; landing bundle pulls react-query via consultations index.
- Optional: pass admin id as audit hint for service_role writes.

## demo-deploy-qa
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
- Hard gate before public launch: /privacy Blank values filled, claims about unbuilt features removed or built, legal review, then re-enable indexing.
- Re-verify on cloud that an old refresh token fails after reset; code comment: access token valid ≤1h.
- `getUser` network failure maps to 401 not 500 on the HS256 fallback path.
- QA notes: signed-out aal2 token valid until exp; create-student orphan auth user can wedge a login id (dashboard cleanup step); local Kong answers OPTIONS with ACAO * (verify CORS on cloud gateway).
- Verify TOTP QR renders under the real CSP on the deployed preview.
- CI: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- QA step: second save of 학교·보호자 against the real DB.
- `seed-demo.sql` must reuse the auth.users shape from seed.sql (empty token columns + identities).

## student-app
- `my_rank()` follows the same rule as `student_point_totals` (active only, ties share a rank), and the student homework screen shows the `submit_homework` error text (the three P0001 messages) as is.

## videos-questions
- Replace the unanswered-question count `UNANSWERED_QUESTIONS_PLACEHOLDER` (`src/features/today/model/today.ts`) with the real hook.

## student-app (from class-ops final review)
- `my_rank()` must be a security definer RPC returning only {rank,total}; active students only; ties 1,2,2,4; add to 00_meta allowlist.
- Decide `submit_homework` rules for due dates and paused students.

## demo-deploy-qa (from class-ops final review)
- `today` keys computed at render (AttendanceScreen, TodayScreen) — a tab open past midnight keeps yesterday until re-render.
- Attendance board "recent 8" includes future-dated sessions — consider `.lte("date", today)`.
- Membership trigger blocks admin edits on past cells for removed students (board hides them).
- `classes` INSERT column-level grant.
- AttendanceTable: `th` scope=col/colgroup; roving tab stops; showHomework=false header + controlled double-click tests.
- Attendance undo on a stale toast overwrites a newer value (per-cell sequence number would fix ABA too).
- 오늘 card shows 수업 시작 briefly while progress loads; screen test for starting a pre-existing session.
- Points history `limit(50)` note; `aria-selected` on `tr`; history row / negative styling / failure / invalidation tests.
