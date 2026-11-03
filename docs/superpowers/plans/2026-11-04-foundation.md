# 기반(Foundation) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩과 앱 기능을 올릴 바닥을 만든다. 구조 규칙이 lint로 강제되고, 디자인 토큰·기본 컴포넌트·core 인프라·DB 보안 기본값·CI가 갖춰진 상태.

**Architecture:** 설계 문서 4장의 `app / core / design-system / features` 구조. 브라우저가 Supabase를 직접 부르는 정적 SPA(`output: "export"`)이고 권한은 RLS가 막는다. 이 계획은 기능(feature) 코드를 만들지 않는다. 랜딩은 다음 계획(`2026-11-xx-landing.md`)이다.

**Tech Stack:** Next.js 16.4.4 · React 19.3 · TypeScript 5 strict · Tailwind v4 · Supabase CLI 2.121 · Vitest · Testing Library · pgTAP · GitHub Actions

**Spec:** `docs/superpowers/specs/2026-11-03-heesu-architecture-design.md` (4·5·9·10·11·13장)

## Global Constraints

- 정적 내보내기 유지: `next.config.ts`의 `output: "export"`. Route Handler·Server Action·middleware·`next/image` 최적화 금지.
- 디자인 값은 토큰만. Tailwind 기본 팔레트는 꺼져 있다(`--color-*: initial`). 화면 코드에 hex·px 색 값 금지.
- 의존 규칙(설계 4장): `app → features → core, design-system`. `design-system`은 `features`·`core`를 import하지 않고, 외부는 `react, motion, canvas-confetti, lucide-react, class-variance-authority, clsx, tailwind-merge`만. `@supabase/supabase-js`는 `src/core/supabase/**`와 `src/features/*/data/**`에서만.
- TypeScript `strict` + `noUncheckedIndexedAccess`. `any` 금지(lint 에러). `dangerouslySetInnerHTML` 금지(`react/no-danger` 에러).
- 비밀값 커밋 금지. 브라우저에 들어가는 키는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 두 개뿐.
- 문구는 한국어 "-해요"체, 오류 문구는 고치는 방법까지(디자인 시스템 README "글 쓰는 법").
- 로컬 Supabase는 OrbStack Docker를 쓴다. 이 세션 셸에서는 `export PATH="$HOME/.orbstack/bin:$PATH"`가 필요할 수 있다.
- 클라우드 프로젝트 ref: `pudxtxzcftehxicfthmf` (Seoul, Free). 이 계획은 클라우드 DB에 아무것도 적용하지 않는다(로컬만).

## Review Focus

1. **새 테이블을 만들면서 RLS를 깜빡하는 경우** → 메타 테스트가 잡아야 한다. Task 7에서 "RLS 없는 테이블을 임시로 만들면 `00_meta.test.sql`이 실패한다"를 확인하는 단계를 둔다.
2. **anon/authenticated가 기본 권한으로 새 함수를 실행할 수 있는 경우** → Task 7 메타 테스트 `anon_executable_functions = '{}'`와, 임시 함수로 실패를 확인하는 단계.
3. **`.env.local`이나 실제 키가 커밋되는 경우** → Task 9 CI의 gitleaks와 Task 1의 `.env.example`만 커밋되는지 확인하는 단계.
4. **에러 분류가 알 수 없는 에러(문자열, null, 일반 Error)에서 터지는 경우** → Task 4 `error.test.ts`에 `classifyError(null)`, `classifyError("x")`, `classifyError(new Error("x"))` → `unknown` 케이스.
5. **env 값이 빠진 채 빌드돼 런타임에 빈 URL로 요청하는 경우** → Task 4 `env.test.ts`에 값이 없으면 한국어 메시지와 함께 throw하는 케이스.

---

### Task 1: 디자인 시스템 원본을 저장소에 들이기 (오케스트레이터 전용)

claude.ai 아티팩트 도구가 필요하므로 **서브에이전트가 아니라 메인 세션이 직접** 한다. 원본: 디자인 시스템 아티팩트 slug `0393fac2-dff3-48e7-b611-71f08277e26a`, 랜딩 시안 slug `a5c315f3-6659-4464-bec8-6cec001d2839`.

**Files:**
- Create: `docs/design-system/` 아래 사본 — `README.md`, `develop.md`, `motion.md`, `tokens.json`, `code/globals.css`, `code/motion.tsx`, `components/index.d.ts`, `components/<Name>/README.md`·`preview.html` (전부), `landing-mock.html`(랜딩 시안 `project/Main.dc.html`)
- Create: `src/app/fonts/PretendardVariable.woff2` (디자인 시스템 `project/fonts/PretendardVariable.woff2`)

- [ ] **Step 1:** `mcp__claude-artifacts__read_file`의 `paths`로 위 파일을 받아 경로 그대로 저장한다. `bundle.js`·`bundle.css`는 받지 않는다(설계 11장: 참고만, 복사 금지).
- [ ] **Step 2:** 확인: `ls docs/design-system/components | wc -l` → 28 이상, `shasum -a 256 docs/design-system/tokens.json` → `a633d6dd…`로 시작.
- [ ] **Step 3:** 로고 파일은 아티팩트에 없다(`assets/Logos/README.md`만 있음). 사용자에게 로고 SVG/PNG를 요청하는 항목으로 남기고 진행한다.
- [ ] **Step 4: Commit**
```bash
git add docs/design-system src/app/fonts
git commit -m "docs: import heesu design system source files"
```

---

### Task 2: 도구와 구조 강제 (lint·format·tsconfig·테스트 러너)

**Files:**
- Modify: `package.json`, `tsconfig.json`, `eslint.config.mjs`
- Create: `.prettierrc.json`, `vitest.config.mts`, `src/test/setup.ts`, `.env.example`
- Create: `src/core/.gitkeep`, `src/design-system/.gitkeep`, `src/features/.gitkeep`
- Test: `src/test/boundaries.test.ts`

**Interfaces:**
- Produces: npm 스크립트 `typecheck`(`tsc --noEmit`), `lint`(`eslint .`), `test`(`vitest run`), `format`(`prettier --write .`), `db:test`(`supabase test db`), `db:types`(Task 8). 이후 모든 Task가 이 스크립트로 검증한다.

- [ ] **Step 1: 의존성 설치**
```bash
npm i @tanstack/react-query zod react-hook-form @hookform/resolvers @supabase/supabase-js class-variance-authority clsx tailwind-merge lucide-react motion canvas-confetti date-fns
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths prettier prettier-plugin-tailwindcss eslint-plugin-boundaries @types/canvas-confetti
```
`tus-js-client`, `@sentry/react`, `@playwright/test`는 쓰는 계획에서 설치한다(YAGNI).

- [ ] **Step 2:** `tsconfig.json`에 `"noUncheckedIndexedAccess": true`. `target`은 `ES2022`.
- [ ] **Step 3:** `eslint.config.mjs`에 추가
  - `@typescript-eslint/no-explicit-any: error`, `react/no-danger: error`
  - `eslint-plugin-boundaries` 요소 정의: `app`=`src/app/**`, `features`=`src/features/*` (capture `name`), `core`=`src/core/**`, `ds`=`src/design-system/**`. 규칙 `boundaries/element-types` default `disallow`, 허용: app→[features, core, ds], features→[core, ds, features(같은 name이거나 대상 파일이 `index.ts`)], core→[core], ds→[ds].
  - `boundaries/external`: `ds`는 위 Global Constraints의 7개 패키지 + `react`만.
  - `no-restricted-imports`: `@supabase/supabase-js`를 `src/core/supabase/**`, `src/features/*/data/**` 외에서 금지.
- [ ] **Step 4: 실패하는 테스트 작성** — `src/test/boundaries.test.ts`: ESLint Node API(`new ESLint()`의 `lintText(code, { filePath })`)로 아래 4개를 검사한다.
  - `src/design-system/x.ts`에서 `import "@/core/env"` → 에러 1개 이상
  - `src/features/a/screen/x.tsx`에서 `import "@/features/b/data/y"` → 에러
  - `src/features/a/screen/x.tsx`에서 `import "@/features/b"` → 에러 0
  - `src/app/x.tsx`에서 `import { createClient } from "@supabase/supabase-js"` → 에러
- [ ] **Step 5:** `npm test -- src/test/boundaries.test.ts` → Step 3 전이면 FAIL, 후면 PASS. 4개 모두 통과할 때까지 Step 3 설정을 고친다.
- [ ] **Step 6:** `vitest.config.mts`: `environment: "jsdom"`, `setupFiles: ["src/test/setup.ts"]`(jest-dom 등록), `vite-tsconfig-paths` 플러그인, `include: ["src/**/*.test.{ts,tsx}"]`.
- [ ] **Step 7:** `.prettierrc.json`: `{ "plugins": ["prettier-plugin-tailwindcss"], "tailwindStylesheet": "./src/app/globals.css" }`. `.env.example`에 두 변수 이름과 로컬 기본값 자리(`http://127.0.0.1:54321`, 빈 키)를 적는다.
- [ ] **Step 8:** `npm run typecheck && npm run lint && npm test` → 모두 0 exit.
- [ ] **Step 9: Commit** `chore: tooling, lint boundaries, vitest`

---

### Task 3: 디자인 토큰·글꼴·레이아웃 교체

**Files:**
- Modify: `src/app/globals.css` (← `docs/design-system/code/globals.css` 내용 그대로, 단 Google Fonts `@import` 줄 삭제)
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
- Test: `src/test/tokens.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `tokens.test.ts`: `src/app/globals.css`를 읽어
  - `--brown-700: #7A4E2E;`, `--bg-page: var(--beige);`, `--color-*: initial;`, `--spacing: 4px;`가 들어 있음
  - `fonts.googleapis.com` 문자열이 없음(외부 CSS import 금지 — CSP S10)
- [ ] **Step 2:** `npm test -- src/test/tokens.test.ts` → FAIL
- [ ] **Step 3:** globals.css 교체. `layout.tsx`: `next/font/local`로 `./fonts/PretendardVariable.woff2`(weight `"45 920"`, `variable: "--font-pretendard"`), `next/font/google`의 `Gowun_Batang`(weight `["400","700"]`, `variable: "--font-gowun"`, `display: "swap"`). globals.css의 `--font-sans` 맨 앞에 `var(--font-pretendard),`, `--font-serif` 맨 앞에 `var(--font-gowun),`. `<html lang="ko">`. metadata title `희수영어`.
- [ ] **Step 4:** `page.tsx`는 임시로 `<main className="p-4 text-h1 text-text-brand">희수영어</main>` 한 줄(랜딩 계획에서 교체).
- [ ] **Step 5:** `npm test && npm run build` → PASS, 그리고 `grep -c "blue-500" out/_next/static/**/*.css` → 0
- [ ] **Step 6: Commit** `feat(ds): design tokens, fonts, base layout`

---

### Task 4: core — env, Supabase 클라이언트, 에러 분류

**Files:**
- Create: `src/core/env.ts`, `src/core/supabase/client.ts`, `src/core/supabase/error.ts`, `src/core/supabase/database.types.ts`(Task 8 전까지 `export type Database = { public: { Tables: {}; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {} } }` 자리표시)
- Test: `src/core/env.test.ts`, `src/core/supabase/error.test.ts`

**Interfaces:**
- Produces:
  - `parseEnv(source: Record<string, string | undefined>): { supabaseUrl: string; supabasePublishableKey: string }` — 실패 시 `Error("환경 변수 NEXT_PUBLIC_SUPABASE_URL 이 비어 있어요. .env.local 을 확인해 주세요.")` 형태로 빠진 이름을 넣어 throw.
  - `env` = `parseEnv({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, ... })` (정적 치환 때문에 키를 하나씩 직접 적는다)
  - `supabase: SupabaseClient<Database>` — `createClient(env.supabaseUrl, env.supabasePublishableKey, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true } })`
  - `type ApiErrorKind = "notFound" | "forbidden" | "network" | "server" | "conflict" | "invalid" | "unknown"`
  - `classifyError(error: unknown): { kind: ApiErrorKind; message: string }`

- [ ] **Step 1: 실패하는 테스트** — `env.test.ts`: 두 값이 있으면 객체 반환 / URL 없으면 메시지에 `NEXT_PUBLIC_SUPABASE_URL` 포함해 throw / URL이 `https?://` 형식이 아니면 throw.
- [ ] **Step 2: 실패하는 테스트** — `error.test.ts` (입력 → 기대 kind, message):

| 입력 | kind | message |
| --- | --- | --- |
| `{ code: "PGRST116" }` | notFound | `이미 삭제되었거나 찾을 수 없어요.` |
| `{ code: "42501" }` | forbidden | `접근 권한이 없어요.` |
| `{ code: "23505" }` | conflict | `이미 처리된 요청이에요.` |
| `{ code: "23514" }` / `{ code: "22001" }` | invalid | `입력한 내용을 다시 확인해 주세요.` |
| `new TypeError("Failed to fetch")` | network | `네트워크 상태를 확인해 주세요.` |
| `{ status: 503 }` | server | `잠시 후 다시 시도해 주세요.` |
| `null`, `"x"`, `new Error("x")`, `{}` | unknown | `문제가 생겼어요. 잠시 후 다시 시도해 주세요.` |

- [ ] **Step 3:** `npm test -- src/core` → FAIL
- [ ] **Step 4:** 구현. `classifyError`는 throw하지 않는다(어떤 입력에도 객체 반환). 메시지는 위 표 그대로.
- [ ] **Step 5:** `npm test -- src/core && npm run lint` → PASS
- [ ] **Step 6: Commit** `feat(core): env validation, supabase client, error classification`

---

### Task 5: design-system 기본 컴포넌트

랜딩과 앱 공통으로 먼저 필요한 것만. 나머지(`AttendanceTable`, `AdminSidebar`, `StudentTabBar`, `VideoCard`, `PointsProgress`, `Modal`, `Tabs`, `Radio`, `PointsBurst`, `Confetti`, `ConsultForm`)는 쓰는 계획에서 만든다.

**Files:**
- Create: `src/design-system/cn.ts`, `src/design-system/components/{Button,Input,Select,Checkbox,Card,Badge,StatusChip,Toast}/<Name>.tsx`, `src/design-system/motion/motion.tsx`(← `docs/design-system/code/motion.tsx`), `src/design-system/index.ts`
- Test: `src/design-system/components/Input/Input.test.tsx`, `Checkbox/Checkbox.test.tsx`, `StatusChip/StatusChip.test.tsx`, `Button/Button.test.tsx`

**Interfaces:**
- Consumes: Task 3 토큰 클래스(`bg-primary`, `text-label`, `h-12`, `rounded-md` …), `docs/design-system/develop.md` 3장 클래스 규칙.
- Produces: `cn(...inputs: ClassValue[]): string` (clsx + tailwind-merge). 컴포넌트 props는 `docs/design-system/components/index.d.ts`의 `ButtonProps`, `InputProps`, `SelectProps`, `CheckboxProps`, `CardProps`, `BadgeProps`, `StatusChipProps`, `ToastProps`와 **이름·타입이 같다**. `icon`/`IconName` 자리는 `lucide-react` 아이콘 컴포넌트(`LucideIcon`)를 받는다(디자인 시스템 README "아이콘"). `Attendance`, `Homework` 타입과 `nextAttendance(a: Attendance): Attendance`, `nextHomework(h: Homework): Homework`를 `StatusChip`에서 export.
- `index.ts`가 위 전부와 `motion.tsx`의 export를 다시 export한다.

- [ ] **Step 1: 실패하는 테스트**
  - `Input`: `label`이 있으면 `getByLabelText(label)`로 input을 찾는다 / `error`가 있으면 `aria-invalid="true"`이고 `aria-describedby`가 오류 문구 요소 id를 가리킨다 / `required`면 라벨에 `*`가 보이고 input `required`.
  - `Checkbox`: 라벨 클릭으로 체크가 토글된다.
  - `StatusChip`: `status="late"`면 글자 `지각`과 아이콘(`svg`)이 함께 렌더된다(색만으로 구분 금지 규칙). 상태별 글자: `none`→`미입력`, `present`→`출석`, `late`→`지각`, `absent`→`결석`, `makeup`→`보강`, `done`→`완료`, `missing`→`미완료`. `onClick`이 있으면 `button` 역할.
  - `nextAttendance`: `none→present→late→absent→makeup→none`, `nextHomework`: `none→done→missing→none` (develop.md 5장).
  - `Button`: `disabled`면 클릭 핸들러가 불리지 않는다 / `variant` 기본값 `primary`.
- [ ] **Step 2:** `npm test -- src/design-system` → FAIL
- [ ] **Step 3:** 구현. 변형은 `cva`. 모양은 `docs/design-system/components/<Name>/preview.html`과 README를 따른다. 높이: 모바일 `lg`=48px(`h-12`), `md`=40px, `sm`=32px. 포커스 링은 globals.css 기본(`:focus-visible`)을 쓴다. 상태 색은 README 의미 색 표(출석 success, 지각 warning, 결석 danger, 보강 info, 미완료 incomplete, 미입력 점선 + `text-text-subtle`).
- [ ] **Step 4:** `npm test -- src/design-system && npm run lint && npm run typecheck` → PASS
- [ ] **Step 5:** 눈으로 확인용 임시 페이지는 만들지 않는다. 확인은 랜딩 계획에서 실제 화면으로 한다.
- [ ] **Step 6: Commit** `feat(ds): base components and motion`

---

### Task 6: Query Provider와 앱 셸

**Files:**
- Create: `src/core/query/QueryProvider.tsx`(`"use client"`), `src/app/providers.tsx`(`"use client"`)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: Task 4 `classifyError`, Task 5 `HeesuMotion`(motion.tsx)·`Toast`.
- Produces: `QueryProvider` — `QueryClient` 기본값 `queries: { staleTime: 30_000, retry: (count, err) => count < 2 && classifyError(err).kind === "network", refetchOnWindowFocus: true }`, `mutations: { retry: false }`. `Providers` = `QueryProvider` > `HeesuMotion` > children.

- [ ] **Step 1:** 구현 후 `layout.tsx`의 `<body>` 안을 `<Providers>{children}</Providers>`로 감싼다.
- [ ] **Step 2:** `npm run build` → 성공, `out/index.html` 존재.
- [ ] **Step 3: Commit** `feat(core): query provider and app providers`

---

### Task 7: Supabase 로컬 초기화와 보안 기본값 마이그레이션

**Files:**
- Create: `supabase/config.toml`(`supabase init`), `supabase/migrations/<ts>_security_baseline.sql`, `supabase/tests/00_meta.test.sql`, `supabase/tests/01_auth_lockdown.test.sql`, `supabase/seed.sql`(빈 파일 + 주석 "가짜 데이터만")

**Interfaces:**
- Produces (SQL):
  - 스키마 `private` (anon/authenticated에 `usage` 없음)
  - `private.admins(user_id uuid primary key references auth.users on delete cascade, created_at timestamptz default now())`
  - `private.is_admin() returns boolean` — `security definer`, `stable`, `set search_path = ''`. `exists(select 1 from private.admins where user_id = auth.uid()) and coalesce(auth.jwt()->>'aal','') = 'aal2'`.
  - 권한: RLS 정책이 `private.is_admin()`을 부르려면 호출자에게 스키마 usage와 함수 execute가 있어야 한다. 그래서 `grant usage on schema private to authenticated; grant execute on function private.is_admin() to authenticated;`만 한다. `private`는 `config.toml`의 API 스키마 목록에 없으므로 REST(`/rest/v1/rpc`)로는 노출되지 않는다. `private`의 테이블에는 anon·authenticated 권한을 하나도 주지 않는다. anon에는 스키마 usage도 주지 않는다.
  - `private.audit_log(id bigint generated always as identity primary key, at timestamptz not null default now(), actor uuid, table_name text not null, row_id text not null, op text not null check (op in ('INSERT','UPDATE','DELETE')))` + `private.audit() returns trigger`(나중 테이블에서 붙임). anon/authenticated 권한 없음.

- [ ] **Step 1:** `export PATH="$HOME/.orbstack/bin:$PATH"; supabase init` (VS Code 설정 질문은 No).
- [ ] **Step 2:** `config.toml` 수정 (설계 13장 S1·S5·S8):
  - `[auth] enable_signup = false`, `enable_anonymous_sign_ins = false`, `minimum_password_length = 8`, `site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000"]`
  - `[auth.email] enable_signup = false`, `enable_confirmations = false`
  - `[auth.mfa.totp] enroll_enabled = true`, `verify_enabled = true`
  - `[auth] enable_refresh_token_rotation = true`
  - `[api] schemas = ["public"]` (private 미노출 확인)
  - `[realtime]` 기본 유지(public 채널 차단은 클라우드 대시보드 설정 — Task 10 체크리스트)
- [ ] **Step 3: 실패하는 테스트** — `00_meta.test.sql` (pgTAP, `begin; select plan(n); … select * from finish(); rollback;`):
  - `public` 스키마에서 `relrowsecurity = false`인 일반 테이블 수 = 0
  - anon이 EXECUTE 가능한 `public` 함수 목록 = `'{}'::text[]` (이후 계획에서 `guardian_view` 추가 시 이 허용 목록을 함께 고친다)
  - authenticated가 EXECUTE 가능한 `public` 함수 목록 = `'{}'::text[]`
  - `prosecdef = true`인 `public`·`private` 함수 중 `proconfig`에 `search_path=`가 없는 것 수 = 0
  - `public`의 materialized view 수 = 0, `security_invoker` 아닌 view 수 = 0
  - anon은 `private` 스키마 usage 없음 (`has_schema_privilege('anon','private','usage') = false`)
  - anon·authenticated가 권한을 가진 `private` 테이블 수 = 0 (`information_schema.role_table_grants`)
- [ ] **Step 4: 실패하는 테스트** — `01_auth_lockdown.test.sql`: `private.admins`에 없는 사용자 JWT(`request.jwt.claims`를 `set local`로 설정, `role authenticated`)로 `private.is_admin()` → false / admins에 있지만 `aal = aal1` → false / admins + `aal2` → true / anon 역할로 `private.audit_log` select → 권한 에러(`throws_ok`).
- [ ] **Step 5:** `supabase start && npm run db:test` → FAIL(마이그레이션 없음)
- [ ] **Step 6:** `security_baseline.sql` 작성:
  - `alter default privileges in schema public revoke all on tables from anon, authenticated;` 시퀀스·함수도 동일, 함수는 `from public`까지. `postgres`·`supabase_admin` 소유자 모두에 대해(`for role postgres`).
  - `revoke execute on all functions in schema public from public, anon, authenticated;`
  - `private` 스키마, `admins`, `is_admin()`, `audit_log`, `audit()`.
  - `drop extension if exists pg_graphql;`
- [ ] **Step 7:** `supabase db reset && npm run db:test` → 전부 PASS
- [ ] **Step 8 (Review Focus 1·2):** 임시로 `create table public.tmp(x int);`와 `create function public.f() returns int language sql as 'select 1';`를 마이그레이션 끝에 넣고 `npm run db:test` → 메타 테스트 FAIL 확인 → 임시 코드 삭제 → PASS.
- [ ] **Step 9: Commit** `feat(db): supabase init and security baseline with meta tests`

---

### Task 8: DB 타입 생성과 드리프트 검사

**Files:**
- Modify: `package.json` 스크립트 `db:types` = `supabase gen types typescript --local --schema public > src/core/supabase/database.types.ts`
- Modify: `src/core/supabase/database.types.ts` (생성 결과로 교체)

- [ ] **Step 1:** `npm run db:types && npm run typecheck` → PASS
- [ ] **Step 2:** 드리프트 검사 명령: `npm run db:types && git diff --exit-code src/core/supabase/database.types.ts` → exit 0. (Task 9가 CI에서 실행)
- [ ] **Step 3: Commit** `chore(db): generated database types`

---

### Task 9: CI (GitHub Actions)와 의존성 관리

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/dependabot.yml`

- [ ] **Step 1:** `ci.yml` — 트리거 `pull_request`(대상 `dev`, `main`)와 `push`(`dev`, `main`). **`pull_request_target` 금지.** `permissions: contents: read`. 모든 `uses:`는 태그가 아니라 **커밋 SHA로 고정**하고 옆 주석에 버전(`# v4.2.2`)을 적는다(구현자가 각 action의 최신 릴리스 SHA를 조회). 잡 하나, 순서:
  1. checkout (fetch-depth 0, gitleaks용)
  2. gitleaks (`gitleaks/gitleaks-action`)
  3. setup-node (node 22, cache npm) → `npm ci`
  4. `npm run typecheck` → `npm run lint` → `npm test`
  5. `supabase/setup-cli` (version `2.121.0`) → `supabase start` → `npm run db:test`
  6. 타입 드리프트: `npm run db:types && git diff --exit-code src/core/supabase/database.types.ts`
  7. `npm run build` (env: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-placeholder`)
- [ ] **Step 2:** `dependabot.yml`: `npm`(주간, `target-branch: dev`, 묶음 `minor-and-patch`), `github-actions`(월간, `target-branch: dev`).
- [ ] **Step 3:** 기능 브랜치를 push하고 `dev` 대상 PR을 만든 뒤 `gh pr checks --watch` → 모두 통과.
- [ ] **Step 4 (Review Focus 3):** 로컬에서 `git ls-files | grep -E '^\.env'` → `.env.example`만 나온다.
- [ ] **Step 5: Commit** `ci: typecheck, lint, test, db test, types drift, build, gitleaks`

---

### Task 10: 보안 헤더, 에이전트 규칙, 저장소 보호 (마무리)

**Files:**
- Create: `public/_headers`, `CLAUDE.md`
- Modify: `AGENTS.md` (Next.js 자동 블록 **밖** 아래쪽에 프로젝트 규칙 추가. `<!-- BEGIN:nextjs-agent-rules -->` 블록은 건드리지 않는다)
- Test: `src/test/headers.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `headers.test.ts`: `public/_headers`를 읽어 `/*` 블록에 `Content-Security-Policy`(`default-src 'self'`, `connect-src`에 `https://pudxtxzcftehxicfthmf.supabase.co`와 `wss://pudxtxzcftehxicfthmf.supabase.co`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'none'` 포함), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`가 있고, `/g` 블록에 `Referrer-Policy: no-referrer`와 `X-Robots-Tag: noindex`가 있다.
- [ ] **Step 2:** `npm test -- src/test/headers.test.ts` → FAIL
- [ ] **Step 3:** `_headers` 작성. CSP 전체 값은 설계 13장 S10 그대로(`<ref>` = `pudxtxzcftehxicfthmf`, Sentry 도메인은 Sentry 연결 계획에서 추가). `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`으로 시작(해시 전환은 개원 전 계획).
- [ ] **Step 4:** `npm test && npm run build && test -f out/_headers` → PASS
- [ ] **Step 5:** `AGENTS.md` 프로젝트 규칙(20줄 이내): 설계 문서 경로, 폴더 구조 한 줄씩, 의존 규칙, "토큰만 사용", "권한은 RLS + pgTAP 테스트 없이 테이블 추가 금지", "인증·권한·DB 쓰기 코드는 한 줄로 설명 못 하면 머지 금지", 검증 명령(`npm run typecheck && npm run lint && npm test && npm run db:test && npm run build`). `CLAUDE.md` 내용은 `@AGENTS.md` 한 줄.
- [ ] **Step 6: Commit** `feat: security headers and agent rules`
- [ ] **Step 7 (오케스트레이터):** GitHub 설정을 `gh api`로 — `main` 브랜치 보호(직접 push 금지, PR 필수, CI 잡 통과 필수), secret scanning + push protection 켜기. 결과를 `gh api repos/jHoon99/heesu/branches/main/protection`으로 확인.
- [ ] **Step 8 (사용자에게 전달할 체크리스트):** 클라우드 대시보드에서 할 것 — Auth "Allow new users to sign up" 끄기, Anonymous sign-ins 끄기, Realtime "Allow public access" 끄기, Supabase·GitHub·Cloudflare 계정 2FA, Cloudflare 환경 변수 2개 입력 확인.
