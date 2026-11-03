# v1 follow-ups (carried from landing final review)

## auth-admin-base
- [x] Input/Checkbox/Select merge caller-provided aria-describedby and respect a caller aria-invalid when there is no error.
- [x] Tests: multiline Input; Checkbox with description + error; aria-describedby merge; Card/Badge/Toast behavior.
- [x] Danger toast with actionLabel is dismissed after onAction (tested).

## class-ops
- Any client-facing `raise exception` (P0001) text must be Korean "-해요" (classifyError shows it verbatim) — add this as an AGENTS.md convention.
- Strip/reject control characters in names shown in admin views.

## guardian-records
- site_content editor must write exactly the jsonb shape in `20261105000000_site_content.sql` (legal keys snake_case in DB, camelCase in TS) — put a shared zod write schema in `features/site-content/model`.
- useSiteContent hook tests: isLoading state; malformed row through the hook.
- Landing DB-text containers need `min-w-0` / `break-words` (long tokens overflow at 390px) once admins can type long text.
- Phone editor validation: `telHref` joins every digit (extensions) — validate phone format in the editor.
- Consent version is duplicated in `src/features/consultations/model/consultation.ts` and `supabase/functions/submit-consultation/handler.ts` — add a cross-check test or single source when consents change.
- pg_cron deletion of unregistered consultations after 6 months (privacy page states it).

## demo-deploy-qa
- Turnstile siteverify fetch timeout (`AbortSignal.timeout(5000)`) + tests for non-2xx / non-JSON fail-closed.
- Type the Edge Function's supabase client with `Database` so `deno check` catches RPC param drift; hosted smoke test.
- Turnstile hostname check — ship together with real keys before 12/1 (test keys report a dummy hostname).
- A11y pass: role=alert on missing-token and Turnstile failure text; clear Turnstile `failed` after recovery; focus the success card; phone caret jump.
- Visual pass: section tab row scroll back to left when none active; icon differences vs mock (Quote glyph, single-person icon), footer privacy link underline; `text-h2` + `text-[20px]` conflict without cn in SiteHeader and PrivacyScreen.
- StrictMode Turnstile re-render check in a browser (QA item).
- README: local build needs `.env.local`.
- Hard gate before public launch: /privacy Blank values filled, claims about unbuilt features removed or built, legal review, then re-enable indexing.
