# Foundation follow-ups (carry into later plans)

## Landing plan (by Dec 1) must include
- [x] Pretendard 2 MB woff2 is preloaded on every page: subset the font or set `preload: false` in `src/app/layout.tsx`.
- [x] Exclude `supabase/functions/**` from `tsconfig.json` include and ESLint; give Edge Functions their own Deno check (`deno check`/`deno lint`) in CI. CI's `supabase start -x` list excludes `edge-runtime`; change it when function tests exist.
- [x] Add a toast provider/queue to root Providers (spec §4) for consultation form feedback.
- [x] Add placeholder env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) to `vitest.config.mts` `test.env` before any test imports `core/supabase/client`.
- [x] `site_content` / consultations: admin policies `to authenticated`; pgTAP "anon select on site_content succeeds", "anon select on consultations → 0 rows".
- [x] `private.audit()`: guard against BEFORE/statement triggers (`tg_when <> 'AFTER' or tg_level <> 'ROW'` → raise); run the audit test as `authenticated`. First audited table is `consultations`.
- [x] `classifyError`: map 23502/23503/22xxx → invalid; P0001 (RPC raise) → its own message; auth 400 `invalid_credentials`.
- [x] Design-system Input: spread `{...rest}` before the aria wiring so callers can't override `aria-describedby`/`id`; give Card/Badge a `className` prop.
- [x] Add `zz-fixture` paths to `.gitignore`; add `docs/` to `.prettierignore` and run `npm run format` once.
- [x] CSP (`public/_headers`): decide map embed for "오시는 길" — no iframe; `frame-src` stays Turnstile only, pinned in `headers.test.ts` (landing Task 9).

(All items above done in the landing plan, Tasks 1-9.)

## Admin plan must include
- StatusChip: accessible name = `${ariaLabel} ${status word}`; non-interactive chip needs a role or no aria-label.
- Lint warning when admin features import `design-system/motion` (spec §11).
- Danger button hover token; tests for Input hint path, Select, Card/Badge/Toast; QueryClient defaults test.
- ESLint: `@supabase/supabase-js/*` pattern, assert `ruleId` in boundary tests, positive test for allowed supabase imports; allow `import type` from supabase-js in `core/auth` (or re-export types from `core/supabase`).
- Meta tests: sequence default-privilege probe; relkind `f` in test 1; security-definer scan beyond public/private.
- CI: `persist-credentials: false`, `timeout-minutes`, `concurrency`.

## Guardian / storage plans
- Re-check `curl -sI https://<host>/g` returns `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex` once `/g` exists.
- Storage: meta test that `storage.objects` policies match an allowlist (S9).
- Staging project (S13): generate `_headers` CSP per environment (project ref is hardcoded).

## Cloud checklist (before first `supabase db push` / opening)
- Dashboard: Auth "Allow new users to sign up" off; Anonymous sign-ins off; Realtime "Allow public access" off.
- Admin password ≥ 12 characters (config minimum 8 is for students); admin TOTP enrolled.
- First `db push`: confirm `drop extension if exists pg_graphql` succeeds on cloud (if it fails, the whole baseline migration fails).
- Cloudflare Pages env vars set for both Production and Preview.
- 2FA on Supabase, GitHub, Cloudflare (and Solapi later).
- No schema edits from the dashboard (spec §7) — local meta tests can't see them.
- `supabase secrets set TURNSTILE_SECRET_KEY=...` (test secret during the demo; before 12/1 swap in the real secret and the site-key constant).
- `supabase functions deploy submit-consultation` (verify_jwt=false comes from config.toml).
- Turnstile widget allowed hostnames: `heesu.pages.dev`, `dev.heesu.pages.dev`.
- pg_cron deletion of unregistered consultations (plan 6) must ship before the page goes public (`/privacy` promises deletion after 6 months).
