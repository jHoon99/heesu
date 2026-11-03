# v1 follow-ups (carried from landing final review)

## auth-admin-base
- [x] Input/Checkbox/Select merge caller-provided aria-describedby and respect a caller aria-invalid when there is no error.
- [x] Tests: multiline Input; Checkbox with description + error; aria-describedby merge; Card/Badge/Toast behavior.
- [x] Danger toast with actionLabel is dismissed after onAction (tested).

## class-ops
- Any client-facing `raise exception` (P0001) text must be Korean "-해요" (classifyError shows it verbatim) — add this as an AGENTS.md convention.
- Strip/reject control characters in names shown in admin views.
- Meta test: security-definer scan without the `proowner = 'postgres'` filter for public/private, before new definer functions land.
- New policies use `(select private.is_admin())` / `(select private.my_student_id())`; column-level grants + `table_privs_are`/`column_privs_are` tests for authenticated; tighten `classes` UPDATE to columns (name, level, schedule, capacity) and `student_private` to (school, guardian_name, guardian_phone, memo).
- Revoke service_role EXECUTE on `my_role` and `password_changed`.
- `parseSchedule` returns `[]` on malformed input (would wipe on save) — make it fail loudly.
- Modal: render via a top-level host or move Modals out of Card (PasswordResetCard, StudentEditScreen); add focus-trap first→last wrap and unmount-while-open scroll-restore tests.
- Add `.hs-num { font-variant-numeric: tabular-nums }` to globals.css.
- StatusChip `ariaLabel` JSDoc: prefix, don't repeat the status word.
- Sign-out fallback duplicated in core/auth session.tsx and features/auth data — single helper.
- Import `SaveNotAppliedError` from core directly (drop the classes model shim); paused vs left status tone.
- `class_members` counts and attendance lists must exclude `status = 'left'` students (RLS/view).

## guardian-records
- site_content editor must write exactly the jsonb shape in `20261105000000_site_content.sql` (legal keys snake_case in DB, camelCase in TS) — put a shared zod write schema in `features/site-content/model`.
- useSiteContent hook tests: isLoading state; malformed row through the hook.
- Landing DB-text containers need `min-w-0` / `break-words` (long tokens overflow at 390px) once admins can type long text.
- Phone editor validation: `telHref` joins every digit (extensions) — validate phone format in the editor.
- Consent version is duplicated in `src/features/consultations/model/consultation.ts` and `supabase/functions/submit-consultation/handler.ts` — add a cross-check test or single source when consents change.
- pg_cron deletion of unregistered consultations after 6 months (privacy page states it).
- `student_private` column grants (upsert can rewrite student_id).
- Don't export CONSENT_VERSION/TURNSTILE_SITE_KEY from consultations index; landing bundle pulls react-query via consultations index.
- Optional: pass admin id as audit hint for service_role writes.

## demo-deploy-qa
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
