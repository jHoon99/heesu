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
(Closed by the auth-admin-base plan.)
- [x] StatusChip: accessible name = `${ariaLabel} ${status word}`; non-interactive chip needs a role or no aria-label. (Task 1)
- [x] Lint warning when admin features import `design-system/motion` (spec §11). (Task 1)
- [x] Danger button hover token; tests for Input hint path, Select, Card/Badge/Toast; QueryClient defaults test. (Task 1)
- [x] ESLint: `@supabase/supabase-js/*` pattern, assert `ruleId` in boundary tests, positive test for allowed supabase imports; allow `import type` from supabase-js in `core/auth` (or re-export types from `core/supabase`). (Task 1)
- [x] Meta tests: sequence default-privilege probe; relkind `f` in test 1; security-definer scan beyond public/private. (Task 1)
- [x] CI: `persist-credentials: false`, `timeout-minutes`, `concurrency`. (Task 1)

## Guardian / storage plans
- Re-check `curl -sI https://<host>/g` returns `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex` once `/g` exists.
- [x] Storage: meta test that `storage.objects` policies match an allowlist (S9). (Task 2)
- Staging project (S13): generate `_headers` CSP per environment (project ref is hardcoded).

## Cloud checklist (before first `supabase db push` / opening)
- Dashboard: Auth "Allow new users to sign up" off; Anonymous sign-ins off; Realtime "Allow public access" off.
- Admin password ≥ 12 characters (config minimum 8 is for students); admin TOTP enrolled.
- Dashboard: enable the `pg_cron` extension (Database > Extensions) if `db push` of `20261110000100_consultations_retention.sql` cannot create it; afterwards confirm `select jobname, schedule from cron.job` shows `purge-stale-consultations` at `0 18 * * *`.
- First `db push`: confirm `drop extension if exists pg_graphql` succeeds on cloud (if it fails, the whole baseline migration fails).
- Cloudflare Pages env vars set for both Production and Preview.
- 2FA on Supabase, GitHub, Cloudflare (and Solapi later).
- No schema edits from the dashboard (spec §7) — local meta tests can't see them.
- `supabase secrets set TURNSTILE_SECRET_KEY=...` (test secret during the demo; before 12/1 swap in the real secret and the site-key constant).
- `supabase functions deploy submit-consultation` (verify_jwt=false comes from config.toml).
- Turnstile widget allowed hostnames: `heesu.pages.dev`, `dev.heesu.pages.dev`.
- [x] pg_cron deletion of unregistered consultations (plan 6) must ship before the page goes public (`/privacy` promises deletion after 6 months). (Task 4) — 클라우드에서 cron.job 확인은 계획 7
- Re-enable /privacy indexing (remove `robots: { index: false }` from the page metadata) + add it back to `public/sitemap.xml` after legal review and the Blank values are filled.
- `supabase link` + `supabase db push` for all migrations.
- Deploy functions and set secrets (`TURNSTILE_SECRET_KEY` test key for the demo).
- Hosted smoke test: real submit from dev.heesu.pages.dev; `curl` with a foreign Origin must return 403.
- Check whether the project disabled legacy API keys — if so, `SUPABASE_SERVICE_ROLE_KEY` in functions must come from a custom secret holding the new `sb_secret_…` key.
- Test Turnstile keys let bots pass until the real keys are in on 12/1.
- Dashboard Auth Redirect URLs = exactly 3 addresses: `http://localhost:3000`, `https://dev.heesu.pages.dev`, `https://heesu.pages.dev`.
- Deploy `create-student` and `reset-student-password` with `--no-verify-jwt` (same as config.toml; the functions check the admin session themselves).
- After creating the admin account, insert it into `private.admins`; enroll TOTP at the first login.
- Never run `supabase db push --include-seed` or `supabase db reset --linked` against cloud (seed.sql has a public admin password). After deploy, verify no `*@example.test` admin exists.
- Auth settings: Email provider ON, "Allow new users to sign up" OFF, "Confirm email" ON, minimum password length 8.
- Verify an old refresh token fails after an admin password reset (passed locally). Note: with asymmetric JWT keys a signed-out admin's access token stays valid until expiry (up to 1h).
- Before applying the 20261107 migrations to cloud, check that existing student and class names contain no control characters (the new check constraints would fail the whole push).
- Local build needs `.env.local` (copy values from `supabase status`).

## demo-deploy-qa
- db push 뒤 클라우드에서 pg_cron 확장·cron.job 'purge-stale-consultations' 확인(Free 프로젝트도 Database → Extensions에서 켤 수 있어야 한다).
- 배포 미리보기에서 curl -sI /g → Referrer-Policy: no-referrer, X-Robots-Tag: noindex.
- QA: 카카오톡 인앱 브라우저(아이폰·안드로이드)에서 학부모 링크 열기·새로고침·링크 미리보기에 토큰이 안 보이는지.
- 누나 확인: 등록 동의서에 수업 녹화·영상 게시 동의 항목(S9).
- guardian_view 반복 호출은 DB에서 막지 않는다 — Supabase 사용량 알림(S14)을 켠다.

## v2
- service_role 쓰기(create-student 등)의 감사 actor가 null — 호출한 원장 id를 남기는 방법.
- PointsProgress goal 선택 prop(디자인 시스템 계약 변경, 디자인 원본과 같이).
