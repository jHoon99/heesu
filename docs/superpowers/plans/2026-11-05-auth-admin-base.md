# 로그인·원장 기본(auth-admin-base) 구현 계획 — v1 계획 2/7

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/login`(원장 이메일+비밀번호+TOTP → aal2, 학생 아이디+비밀번호 → 첫 로그인 비밀번호 변경), 역할별 이동, 원장 셸(사이드바, 나중 계획 메뉴는 "준비 중"), `students`·`student_private`·`classes`·`class_members`·`consents` + RLS + pgTAP, Edge Function `create-student`·`reset-student-password`, 원장 학생·반 화면을 로컬에서 끝까지 동작하게 만들고, 기반 계획의 "Admin plan" 후속 항목을 닫는다.

**Architecture:** 권한은 전부 DB가 판단한다: `private.is_admin()`(admins + aal2), `private.my_student_id()`(퇴원 아닌 본인 학생 id), 화면 이동용 `public.my_role()`. 학생 계정 생성·비밀번호 초기화는 service_role이 필요해서 Edge Function(Deno, handler/deps 분리)이 `getClaims`로 서명 검증 → aal2 확인 → service_role RPC `admin_user_exists`로 `private.admins` 확인 뒤에만 실행한다. 프론트는 `core/auth`(세션·역할·가드)와 기능 폴더 `auth`·`admin-shell`·`classes`·`students`로 나누고, 화면 → TanStack Query 훅 → data 함수 → Supabase(RLS) 세 단계를 지킨다.

**Tech Stack:** Next.js 16.4.4 (static export) · React 19.3 · Tailwind v4 · TanStack Query 5 · react-hook-form 7 + zod 4 · supabase-js 2.118 (Auth MFA TOTP) · Supabase CLI 2.121 · pgTAP · Deno 2.9.7 · Vitest

**Spec:** `docs/superpowers/specs/2026-11-04-heesu-v1-features-design.md` (§2, §4 행 로그인·학생·반과 사이드바 메뉴, §5 첫 로그인, §7 `students`·`student_private`·`classes`·`class_members`·`consents`·감사 로그, §10 항목 2, §11 퇴원·학생 비밀번호 초기화·법정대리인 동의 입력·기술 보정 전부) · 구조·보안 `docs/superpowers/specs/2026-11-03-heesu-architecture-design.md` (§4, §5, §6, §11, §13 S1·S2·S3·S4·S5·S12) · 후속 항목 `docs/superpowers/plans/foundation-followups.md` "Admin plan must include" · 디자인 `docs/design-system/README.md`, `components/{AdminSidebar,Modal,Tabs,Radio,AdminAttendanceScreen}/README.md`, `components/index.d.ts` · 형식·기존 코드 `docs/superpowers/plans/2026-11-05-landing.md`

## Global Constraints

- 정적 내보내기(`output: "export"`): Route Handler·Server Action·middleware 금지. 동적 id는 쿼리(`/admin/students/detail?id=…`). `useSearchParams()`를 쓰는 화면은 page.tsx에서 `<Suspense>`로 감싼다(안 하면 `next build` 실패).
- 의존 규칙: `app → features → core, design-system`. `features/A`는 `features/B/index.ts`로만. `design-system`은 `react, motion, canvas-confetti, lucide-react, class-variance-authority, clsx, tailwind-merge`만(→ `next/link` 불가, 링크 컴포넌트는 prop으로 받는다). `@supabase/supabase-js`는 `src/core/supabase/**`, `src/features/*/data/**`에서만(타입도 — `core/auth`는 `core/supabase/client.ts`가 다시 내보내는 타입을 쓴다).
- 새 npm 의존성 없음.
- 역할은 `private.admins`·`students.user_id`로만. JWT `user_metadata`·`app_metadata`를 권한·화면 판단에 쓰지 않는다. 첫 로그인 강제는 `students.must_change_password`(spec §11, 아키텍처 S4의 `app_metadata` 문구보다 우선).
- 학생 Auth 이메일 = `<아이디>@student.heesu.internal`. 아이디 `^[a-z0-9_]{3,20}$`. 학생 초기·새 비밀번호 8자 이상, UTF-8 72바이트 이하(bcrypt 한도). 원장 비밀번호 12자 이상은 대시보드 몫(QA 문서).
- 허용 주소(CORS·Auth redirect): 정확히 `http://localhost:3000`, `https://dev.heesu.pages.dev`, `https://heesu.pages.dev`. 와일드카드 금지.
- 고정 값(DB enum·앱 상수·Edge Function이 같은 문자열):
  - 학년 `public.school_grade` `중1…고3`(랜딩에서 이미 있음, 재사용).
  - 학생 상태 `public.student_status` `active | paused | left` → 화면 `재원 | 휴원 | 퇴원`.
  - 반 구분 `public.class_level` `middle | high` → `중등 | 고등`.
  - 동의 방법 `public.consent_method` `written | phone | kakao` → `서면 | 전화 | 카톡`.
  - `classes.schedule` = `[{ "day": 1-7, "start": "HH:MM", "end": "HH:MM" }]`, day는 ISO 요일(1=월 … 7=일, Postgres `extract(isodow)`와 같음). 화면 요일 글자 `월 화 수 목 금 토 일`.
- 원장 화면: 배경 `bg-bg-admin`, 표·카드 `bg-bg-surface-raised`, 컨트롤 40px(`Button`·`Input`·`Select`에 `size="md"`), 표 행 `h-10 text-table`, 등장 모션 없음(`Reveal`·`TextRise`·`CountUp` 등 금지 — Task 1이 lint 경고로 강제), 사이드바 232px(`w-(--sidebar)`), 1024px 미만 64px 아이콘만. primary 버튼은 화면에 하나.
- 문구는 "-해요"체, 오류는 고치는 방법까지, 이모지 금지. 고정 문구(글자 그대로):
  - 준비 중 화면: `{메뉴 이름} 화면은 준비 중이에요. 다음 업데이트에서 열려요.`
  - 로그인 제목 `희수영어 로그인`, 입력 라벨 `아이디 또는 이메일`, `비밀번호`, 버튼 `로그인`.
  - TOTP 등록 안내 `인증 앱(Google Authenticator 등)으로 QR 코드를 찍고, 앱에 보이는 6자리 숫자를 입력해 주세요.` / 확인 안내 `인증 앱에 보이는 6자리 숫자를 입력해 주세요.` / 버튼 `확인`.
  - 첫 로그인 제목 `새 비밀번호를 정해 주세요`, 본문 `원장님이 알려 준 비밀번호는 처음 한 번만 써요. 나만 아는 비밀번호로 바꿔 주세요.`
  - 로그인할 수 없는 계정: `로그인할 수 없는 계정이에요. 학원에 문의해 주세요.`
- RLS: `private.*`를 부르는 정책은 모두 `to authenticated`. 새 테이블마다 pgTAP: 학생 A로 B 행 → 0행, 원장도 학생도 아닌 사용자 → 0행·쓰기 실패, anon → `42501`, 원장 aal1 → 0행. 함수를 anon/authenticated에 열면 `00_meta.test.sql` 허용 목록(스키마별 정렬된 `proname` text[])을 고친다. `raise exception` 문구는 한국어 "-해요".
- 감사 로그: `students`(`id`), `student_private`(`'student_id'`), `consents`(`id`)에 `after insert or update or delete … for each row execute function private.audit(<키>)`.
- 로컬 Supabase: API `http://127.0.0.1:56321`, DB `postgresql://postgres:postgres@127.0.0.1:56322/postgres`, Studio 56323, Mailpit 56324. 셸마다 `export PATH="$HOME/.orbstack/bin:$PATH"`. 마이그레이션 적용 `supabase db reset`. 타입은 `npm run db:types`로만 갱신.
- 클라우드(`pudxtxzcftehxicfthmf`)에는 아무것도 적용·배포하지 않는다(계획 7).
- 각 Task 끝 전체 검증: `npm run typecheck && npm run lint && npm test && npm run fn:check && npm run db:test && npm run build`. 커밋은 Conventional Commits, push 금지.

## Review Focus

1. **학생이 폰에서 아이디를 대문자·공백과 함께 입력하는 경우**(iOS 자동 대문자 `Haneul `, 원장 이메일 대문자) → 소문자·trim으로 맞춰 로그인되고, 형식이 아예 틀리면 요청 없이 고치는 방법을 보여 준다. → Task 6 `toAuthEmail` 표 테스트 + LoginScreen "형식 오류 → signIn 호출 없음".
2. **원장이 TOTP 등록 도중 그만두거나(미확인 factor가 남음) 코드 입력 단계에서 탭을 닫았다가 다시 오는 경우** → 남은 미확인 factor 때문에 막히지 않고 새로 등록되며, aal1 세션으로 돌아오면 바로 코드 입력 단계가 뜬다. → Task 6 `planMfaStep` 테스트, LoginScreen "aal1 세션으로 진입 → 코드 입력 단계".
3. **첫 로그인 비밀번호 변경이 반만 성공한 경우**(`updateUser` 성공, `password_changed()` 실패) → 다시 누르면 `same_password` 오류 없이 플래그만 다시 내리고 통과한다. → Task 7 `useChangeFirstPassword` 테스트.
4. **학생 추가가 중간에 실패하는 경우**(Auth 사용자는 생겼는데 `students` insert 실패, 같은 아이디 동시 생성, 느린 망 두 번 클릭) → 고아 Auth 사용자가 남아 그 아이디를 영영 못 쓰게 되지 않고, 요청은 한 번만 간다. → Task 4 handler 테스트 "insert 실패 → deleteAuthUser 호출 + 500", "insert 23505 → 409 login_taken + deleteAuthUser"; Task 10 StudentNewScreen "pending 중 두 번 클릭 → 1회".
5. **상세·수정 주소의 `?id=`가 없거나 틀리거나 지워진 경우**(오타, 옛 북마크, uuid 아님) → 무한 로딩·크래시 대신 "찾을 수 없어요" 카드와 목록으로 가는 링크. → Task 9 ClassFormScreen, Task 10 StudentEditScreen, Task 11 StudentDetailScreen 테스트 "id 없음·uuid 아님·0행 → 안내 카드, 요청은 uuid일 때만".

---

### Task 1: 기반 후속 항목 정리 (lint·CI·메타 테스트·디자인 시스템 보완)

**Files:**
- Modify: `eslint.config.mjs`, `src/test/boundaries.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `supabase/tests/00_meta.test.sql`
- Modify: `src/core/supabase/client.ts` (타입 다시 내보내기)
- Modify: `src/core/query/QueryProvider.tsx`, `src/core/query/QueryProvider.test.ts`
- Modify: `src/design-system/components/StatusChip/StatusChip.tsx`, `.../StatusChip.test.tsx`
- Modify: `src/app/globals.css`, `src/design-system/components/Button/Button.tsx`, `.../Button.test.tsx`, `src/test/tokens.test.ts`
- Modify: `src/design-system/components/Input/Input.test.tsx`; Create: `src/design-system/components/Select/Select.test.tsx`

**Interfaces:**
- Produces:
  - `src/core/supabase/client.ts`: `export type { Session, User, AuthError } from "@supabase/supabase-js";`
  - `createQueryClient(): QueryClient` (QueryProvider가 이것으로 만든다).
  - lint: 원장 화면 파일(`ADMIN_UI_FILES`)에서 `@/design-system`의 모션 export를 import하면 **경고**(`@typescript-eslint/no-restricted-imports`). 이후 원장 기능 폴더가 생기면 이 목록에 더한다.
  - 토큰 `--danger-hover` / Tailwind `bg-danger-hover`.

- [ ] **Step 1: 실패하는 테스트 작성 — `boundaries.test.ts`**
  - 기존 테스트의 실패 기대에 `ruleId`를 단다: design-system→core, 다른 기능 내부 import는 `"boundaries/dependencies"`, supabase-js는 `"no-restricted-imports"`.
  - `it("forbids supabase-js subpaths outside data")`: `src/app/x.tsx`에서 `import "@supabase/supabase-js/dist/module/index.js"` → 오류 1개 이상, ruleId `"no-restricted-imports"`.
  - `it("allows supabase-js in feature data and core/supabase")`: `src/features/zz-fixture/data/x.ts`, `src/core/supabase/x.ts` 각각 `import { createClient } from "@supabase/supabase-js"` → 오류 0.
  - `it("warns when admin UI imports entrance motion")`: `src/features/students/screen/x.tsx`에서 `import { Reveal } from "@/design-system";` → severity 1 메시지 1개, ruleId `"@typescript-eslint/no-restricted-imports"`; 같은 파일에서 `import { Button } from "@/design-system";` → 경고 0; `src/features/landing/screen/x.tsx`에서 `Reveal` → 경고 0. (warning을 보는 `lintAll` 헬퍼를 더한다.)
- [ ] **Step 2:** `npm test -- src/test/boundaries.test.ts` → 새 케이스 FAIL.
- [ ] **Step 3: 구현 — `eslint.config.mjs`**
  - `SUPABASE_RESTRICTION`에 `patterns: [{ group: ["@supabase/supabase-js/*"], message: <같은 문구> }]`.
  - `const ADMIN_UI_FILES = ["src/app/admin/**", "src/features/admin-shell/**", "src/features/students/**", "src/features/classes/**"];`
  - `const ENTRANCE_MOTION = ["Reveal", "RevealGroup", "TextRise", "LeafDraw", "CountUp", "PointsBurst", "ProgressFill", "celebrate"];`
  - 설정 블록 `{ files: ADMIN_UI_FILES, ignores: [테스트 파일], rules: { "@typescript-eslint/no-restricted-imports": ["warn", { paths: [{ name: "@/design-system", importNames: ENTRANCE_MOTION, message: "원장 화면에는 등장 모션을 쓰지 않아요(디자인 시스템 README 모션)." }], patterns: [{ group: ["@/design-system/motion", "@/design-system/motion/*"], message: <같은 문구> }] }] } }`.
- [ ] **Step 4:** `npm test -- src/test/boundaries.test.ts && npm run lint` → PASS.
- [ ] **Step 5: 구현 — CI** `.github/workflows/ci.yml`: 최상위 `concurrency: { group: "ci-${{ github.ref }}", cancel-in-progress: true }`; job에 `timeout-minutes: 25`; checkout `with`에 `persist-credentials: false`(fetch-depth 0 유지). 확인: `git diff .github/workflows/ci.yml`에 이 세 군데만 바뀌었다(실행 검증은 PR CI 몫).
- [ ] **Step 6: 실패하는 테스트 작성 — `00_meta.test.sql`**
  - 테스트 1을 바꾼다: public의 `relkind in ('r','p')` 중 RLS 꺼진 것 **+ `relkind = 'f'`(foreign table, RLS 불가) 개수** = 0.
  - 새 테스트: 트랜잭션 안에서 `create sequence public.__meta_probe_seq;` → anon·authenticated 중 `has_sequence_privilege(r, 'public.__meta_probe_seq', 'usage, select, update')`인 역할 목록 = `'{}'`.
  - security definer 검사 범위를 넓힌다: `n.nspname not in ('pg_catalog','information_schema')`이고 `pg_get_userbyid(p.proowner) = 'postgres'`인 security definer 함수 중 `search_path=""`가 없는 것 = `'{}'`. 먼저 쿼리를 그대로 돌려 결과를 보고, Supabase가 만든(우리 마이그레이션에 없는) 함수가 걸리면 그 스키마만 `and n.nspname not in (…)`에 이유 주석과 함께 뺀다(우리 `public`·`private`는 절대 빼지 않는다).
  - `plan(n)`을 맞춘다.
- [ ] **Step 7:** `supabase db reset && npm run db:test` → PASS (지금 마이그레이션은 이미 규칙을 지키므로 새 테스트도 바로 통과해야 정상. 실패하면 마이그레이션이 아니라 쿼리를 먼저 의심).
- [ ] **Step 8: 실패하는 테스트 작성 — 디자인 시스템·Query**
  ```tsx
  // StatusChip.test.tsx
  it("prefixes ariaLabel to the status word on interactive chips", () => {
    render(<StatusChip status="late" ariaLabel="김하늘 11월 4일 출결" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "김하늘 11월 4일 출결 지각" })).toBeInTheDocument();
  });
  it("keeps a non-interactive chip readable without aria-label", () => {
    const { container } = render(<StatusChip status="done" ariaLabel="숙제" />);
    const chip = container.firstElementChild!;
    expect(chip).not.toHaveAttribute("aria-label");
    expect(chip).toHaveTextContent("숙제 완료");
  });
  // Button.test.tsx
  it("uses the danger hover token", () => {
    render(<Button variant="danger">삭제</Button>);
    expect(screen.getByRole("button", { name: "삭제" }).className).toContain("hover:bg-danger-hover");
  });
  // Input.test.tsx
  it("links the hint and swaps it for the error", () => { /* hint만: aria-describedby = hint p의 id, aria-invalid 없음 / rerender error: 같은 id에 error 문구, hint 문구는 없음, aria-invalid="true" */ });
  // Select.test.tsx
  it("labels the select, shows a disabled empty placeholder, and marks errors", () => {
    render(<Select label="학년" placeholder="학년을 골라 주세요" options={["중1", { value: "h1", label: "고1" }]} error="학년을 골라 주세요." defaultValue="" />);
    const sel = screen.getByLabelText("학년");
    expect(within(sel).getByRole("option", { name: "학년을 골라 주세요" })).toBeDisabled();
    expect(within(sel).getByRole("option", { name: "고1" })).toHaveValue("h1");
    expect(sel).toHaveAttribute("aria-invalid", "true");
  });
  // QueryProvider.test.ts
  it("sets the agreed defaults", () => {
    const d = createQueryClient().getDefaultOptions();
    expect(d.queries?.staleTime).toBe(30_000);
    expect(d.queries?.retry).toBe(shouldRetryQuery);
    expect(d.queries?.refetchOnWindowFocus).toBe(true);
    expect(d.mutations?.retry).toBe(false);
  });
  // tokens.test.ts: "--danger-hover:" 포함
  ```
- [ ] **Step 9:** `npm test -- src/design-system src/core/query src/test/tokens.test.ts` → 새 케이스 FAIL (Input·Select는 이미 맞으면 PASS여도 된다 — 지금 동작을 고정하는 테스트).
- [ ] **Step 10: 구현** — StatusChip: 버튼일 때 `aria-label={ariaLabel ? `${ariaLabel} ${text}` : undefined}`(text = `label ?? meta.text`); span일 때 aria-label을 지우고 `ariaLabel`이 있으면 `<span className="sr-only">{ariaLabel} </span>`을 글자 앞에. globals.css: `--danger-hover: color-mix(in srgb, var(--danger-700) 85%, var(--brown-900));`와 `@theme`의 `--color-danger-hover: var(--danger-hover);`. Button danger: `hover:bg-danger-hover`. `QueryProvider`: `createQueryClient()`를 export하고 `useState(createQueryClient)`. `client.ts`에 타입 re-export.
- [ ] **Step 11:** 전체 검증 → PASS.
- [ ] **Step 12: Commit**
  ```bash
  git add -A && git commit -m "chore: close admin foundation follow-ups for lint, CI, meta tests and design-system"
  ```

---

### Task 2: DB — `students`, `student_private`, 역할 함수, 감사

**Files:**
- Create: `supabase/migrations/20261106000000_students.sql`
- Create: `supabase/tests/04_students.test.sql`
- Modify: `supabase/tests/00_meta.test.sql` (허용 목록), `src/core/supabase/database.types.ts` (`npm run db:types`)

**Interfaces:**
- Produces (DB):
  - `public.student_status` enum `('active','paused','left')`.
  - `public.students(id uuid pk default gen_random_uuid(), user_id uuid unique references auth.users on delete set null, login_id text not null unique check (login_id ~ '^[a-z0-9_]{3,20}$'), name text not null check (char_length(btrim(name)) between 1 and 20), grade public.school_grade not null, status public.student_status not null default 'active', joined_at date not null default current_date, must_change_password boolean not null default true, created_at timestamptz not null default now())`
  - `public.student_private(student_id uuid pk references public.students on delete cascade, school text check (school is null or char_length(school) <= 40), guardian_name text check (… <= 20), guardian_phone text check (guardian_phone is null or guardian_phone ~ '^010-[0-9]{4}-[0-9]{4}$'), memo text check (… <= 2000), updated_at timestamptz not null default now())` + `private.set_updated_at()` before update 트리거(랜딩 마이그레이션에 이미 있는 함수 재사용).
  - `private.my_student_id() returns uuid` — sql, stable, security definer, `set search_path = ''`: `select id from public.students where user_id = auth.uid() and status <> 'left'`. authenticated에 execute.
  - `public.my_role() returns text` — sql, stable, **security invoker**, `set search_path = ''`: `case when private.is_admin() then 'admin' when private.my_student_id() is not null then 'student' end`. authenticated에만 execute.
  - `public.password_changed() returns void` — plpgsql, security definer, `set search_path = ''`: `update public.students set must_change_password = false where id = private.my_student_id();` (행이 없으면 아무 일도 없음). authenticated에만 execute.
  - `public.admin_user_exists(p_user_id uuid) returns boolean` — sql, stable, security definer, `set search_path = ''`: `exists (select 1 from private.admins where user_id = p_user_id)`. **service_role에만** execute(Edge Function용. private 스키마는 PostgREST에 노출되지 않아서 public 함수가 필요하다).
  - 권한: `grant select on public.students to authenticated`; `grant update (name, grade, status, joined_at) on public.students to authenticated`(컬럼 단위 — `login_id`·`user_id`·`must_change_password`는 클라이언트가 못 바꾼다); insert·delete는 authenticated에 없음(생성은 service_role뿐, 삭제 대신 `left`). `grant select, insert, update on public.student_private to authenticated`. service_role: `grant select, insert, update on public.students`, `grant select on public.student_private`(명시).
  - 정책(모두 `to authenticated`): `students_admin_select using (private.is_admin())`, `students_self_select using (id = private.my_student_id())`, `students_admin_update using/with check (private.is_admin())`; `student_private_admin_{select,insert,update}` (`private.is_admin()`).
  - 감사: `students_audit` → `private.audit()`, `student_private_audit` → `private.audit('student_id')`.

- [ ] **Step 1: 실패하는 테스트 작성 — `04_students.test.sql`** (postgres로 준비: auth.users 5명 — 원장 `…a004`, 학생 A `…c004`, 학생 B `…d004`, 퇴원생 L `…e004`, 아무나 `…b004`; admins에 원장; students A(`haneul_a`), B(`minjun_b`), L(`left_l`, status `left`); student_private A·B)
  - 함수: A로 `private.my_student_id()` = A의 id; L → null; 아무나 → null; 원장 aal2 → null. `public.my_role()`: 원장 aal2 → `'admin'`, 원장 aal1 → null, A → `'student'`, L → null, 아무나 → null.
  - students 읽기: A → 정확히 1행이고 그 id가 A(`results_eq`) — **B는 안 보인다**; L → 0행; 아무나 → 0행; 원장 aal1 → 0행; 원장 aal2 → 3행; anon → `throws_ok(…, '42501')`.
  - students 쓰기: A `update … set name = 'x' where id = <B>` → `is_empty(… returning id)`, A가 자기 행 name update → 0행(정책상 원장만); A `update … set must_change_password = false` → `42501`(컬럼 권한); 원장 aal2 `set must_change_password = false` → `42501`, `set login_id = 'zzz'` → `42501`, `set name = '김하늘', status = 'paused'` → `lives_ok` 후 값 확인; 원장 aal2 insert → `42501`; 원장 delete → `42501`.
  - `password_changed()`: anon 실행 → `42501`; A 실행 → A의 `must_change_password = false`, B는 `true` 그대로; L 실행 → L 값 그대로(`true`); 아무나 실행 → 에러 없음, 변경 0.
  - `admin_user_exists`: authenticated(원장 aal2 포함)·anon 실행 → `42501`; `set local role service_role`로 원장 id → true, A의 user_id → false.
  - student_private: A·B·아무나·원장 aal1 select → 0행; A insert(자기 student_id) → `42501`; 원장 aal2 select 2행, `insert … on conflict (student_id) do update`로 A 메모 수정 `lives_ok`.
  - 제약: postgres로 `login_id = 'Bad-Id'` → `23514`; `'ab'` → `23514`; 중복 login_id → `23505`; `guardian_phone = '01000000000'` → `23514`; `name = '  '` → `23514`.
  - service_role: `insert into public.students (user_id, login_id, name, grade) values (…)` → `lives_ok`, 새 행 `must_change_password = true`, `status = 'active'`.
  - 감사: 원장 aal2의 students update → `private.audit_log`에 `('public.students', <A id>::text, 'UPDATE', actor = 원장)`; A의 `password_changed()` → actor = A의 uid; student_private update → `row_id = <A id>::text`(키 `student_id`).
- [ ] **Step 2: 실패하는 테스트 작성 — `00_meta.test.sql`** 허용 목록: public·authenticated `'{my_role,password_changed}'`, private·authenticated `'{is_admin,my_student_id}'`. public·anon은 `'{}'` 그대로. 머리 주석에 "`admin_user_exists`·`submit_consultation`은 service_role 전용이라 목록에 없다" 추가.
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 04·00 FAIL.
- [ ] **Step 4: 구현 — `20261106000000_students.sql`** (Interfaces 그대로). 파일 머리: 공개 저장소 전제 한 줄, 검사 파일 이름, "퇴원생은 `my_student_id()`가 null이라 로그인해도 0행(spec §11). 학부모 토큰 폐기 트리거는 계획 6". 함수마다 `revoke all on function … from public, anon, authenticated;` 후 필요한 역할에만 grant.
- [ ] **Step 5:** `supabase db reset && npm run db:test` → PASS. `npm run db:types` 후 `git diff --stat src/core/supabase/database.types.ts`에 `students`·`student_private`·`my_role`·`password_changed`·`admin_user_exists`가 보인다.
- [ ] **Step 6:** 전체 검증 → PASS.
- [ ] **Step 7: Commit**
  ```bash
  git add -A && git commit -m "feat(db): students and student_private with role helpers, password_changed rpc and audit"
  ```

---

### Task 3: DB — `classes`, `class_members`, `consents`, 로컬 시드

**Files:**
- Create: `supabase/migrations/20261106000100_classes_consents.sql`
- Create: `supabase/tests/05_classes.test.sql`, `supabase/tests/06_consents.test.sql`
- Modify: `supabase/seed.sql`, `src/core/supabase/database.types.ts`

**Interfaces:**
- Consumes: `private.my_student_id()`, `private.is_admin()`, `public.students` (Task 2).
- Produces (DB):
  - `public.class_level` enum `('middle','high')`; `public.consent_method` enum `('written','phone','kakao')`.
  - `public.classes(id uuid pk default gen_random_uuid(), name text not null unique check (char_length(btrim(name)) between 1 and 30), level public.class_level not null, schedule jsonb not null default '[]', capacity int check (capacity is null or capacity between 1 and 50), created_at timestamptz not null default now())`.
  - `private.check_class_schedule()` — before insert or update 트리거(plpgsql, `set search_path = ''`, 실행 권한 없음 — 트리거는 권한 검사 없이 불린다). 규칙: 배열, 0~14개, 각 원소는 정확히 키 `day`·`start`·`end`, `day`는 1~7 정수, `start`·`end`는 `^([01][0-9]|2[0-3]):[0-5][0-9]$`, `start < end`. 어기면 `raise exception '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.'` (P0001 → 화면에 그대로).
  - `public.class_members(class_id uuid references public.classes on delete cascade, student_id uuid references public.students on delete cascade, created_at timestamptz not null default now(), primary key (class_id, student_id))` + 인덱스 `(student_id)`.
  - `public.consents(id uuid pk default gen_random_uuid(), student_id uuid not null references public.students on delete cascade, guardian_name text not null check (char_length(btrim(guardian_name)) between 1 and 20), method public.consent_method not null, version text not null check (char_length(btrim(version)) between 1 and 40), consented_at timestamptz not null, created_at timestamptz not null default now())` + 인덱스 `(student_id, consented_at desc)`.
  - 권한: classes `select, insert, update`(delete 없음 — v1은 이름 바꾸기로 대신); class_members `select, insert, delete`; consents `select, insert`(update·delete 없음 — 법정 기록은 추가만, 틀리면 새 기록).
  - 정책(`to authenticated`): classes `admin_all`(select·insert·update 각각 `private.is_admin()`), `classes_member_select using (exists (select 1 from public.class_members m where m.class_id = classes.id and m.student_id = private.my_student_id()))`; class_members admin select·insert·delete + `class_members_self_select using (student_id = private.my_student_id())`; consents admin select·insert.
  - 감사: `consents_audit` → `private.audit()`.

- [ ] **Step 1: 실패하는 테스트 작성 — `05_classes.test.sql`** (준비: 원장, 학생 A·B·퇴원생 L, 아무나; 반 X(A, L 소속), Y(B 소속))
  - A: classes → X만 1행(`results_eq` 이름); class_members → 자기 행 1개; `update classes set name='해킹'` → 0행; insert classes → `42501`; insert class_members(Y, A) → `42501`; delete class_members → 0행 영향(이후 postgres로 행 수 그대로).
  - B: X 안 보임. L: classes 0행, class_members 0행. 아무나·원장 aal1: 0행. anon: classes select → `42501`.
  - 원장 aal2: 2행; insert 반 `('고등 독해반','high','[{"day":2,"start":"19:00","end":"21:00"}]', 8)` `lives_ok`; class_members insert·delete `lives_ok`; classes delete → `42501`.
  - 시간표 검사(postgres): `'[{"day":8,"start":"17:00","end":"19:00"}]'`, `'[{"day":1,"start":"19:00","end":"17:00"}]'`, `'[{"day":1,"start":"7:00","end":"9:00"}]'`, `'{}'`, `'[{"day":1,"start":"17:00"}]'`, `'[{"day":1,"start":"17:00","end":"19:00","x":1}]'`, `'[{"day":"1","start":"17:00","end":"19:00"}]'` → 각각 `throws_ok(…, 'P0001', '시간표는 요일(1~7)과 시작·끝 시각(HH:MM, 시작이 끝보다 빠르게)으로 적어 주세요.')`; `'[]'`과 두 칸짜리 정상 값 → `lives_ok`; update로 잘못 바꾸기도 P0001.
  - 제약: capacity 0 → `23514`; 같은 이름 → `23505`.
- [ ] **Step 2: 실패하는 테스트 작성 — `06_consents.test.sql`**
  - 원장 aal2: insert `(A, '김보호', 'kakao', '2026-11', now())` `lives_ok`, select 1행; `update … set version='x'` → `42501`; delete → `42501`.
  - A·아무나·원장 aal1: select 0행; A insert(자기 student_id) → `42501`. anon select → `42501`.
  - `method = 'email'` → `22P02`; `guardian_name = ' '` → `23514`.
  - 감사: insert가 `('public.consents', id::text, 'INSERT', 원장)`으로 남는다.
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 05·06 FAIL.
- [ ] **Step 4: 구현 — `20261106000100_classes_consents.sql`** (Interfaces 그대로, 머리 주석 형식은 Task 2와 같게).
- [ ] **Step 5: 로컬 시드 — `seed.sql`에 추가** (모두 명백한 가짜, 로컬 전용 비밀번호를 주석으로 밝힌다):
  - 원장 `admin@example.test` / `local-admin-pass-1234`(→ `private.admins`), 학생 `haneul`(김하늘, 중2) / `student-pass-1`, `minjun`(이민준, 고1) / `student-pass-1`. `auth.users`에는 `instance_id '00000000-0000-0000-0000-000000000000'`, `aud`·`role` `'authenticated'`, `encrypted_password = extensions.crypt(<pw>, extensions.gen_salt('bf'))`, `email_confirmed_at now()`, `raw_app_meta_data '{"provider":"email","providers":["email"]}'`, `raw_user_meta_data '{}'`, 그리고 `confirmation_token`·`recovery_token`·`email_change_token_new`·`email_change`를 `''`로(NULL이면 GoTrue 로그인이 깨진다). `auth.identities`에 `(provider_id = user id::text, user_id, identity_data = {"sub": id, "email": email}, provider 'email', last_sign_in_at·created_at·updated_at now())`.
  - `students` 2행(user_id 연결, `must_change_password` true), `student_private` 1행, 반 2개(`중등 기초반` middle 월·수 17:00–19:00 정원 8, `고등 독해반` high 화·목 19:00–21:00), 학생 1명씩 배정.
- [ ] **Step 6:** `supabase db reset`(시드 오류 없음) → `npm run db:test` PASS → `curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' -H "apikey: $(supabase status -o env | sed -n 's/^PUBLISHABLE_KEY=//p' | tr -d '"')" -H 'content-type: application/json' -d '{"email":"haneul@student.heesu.internal","password":"student-pass-1"}' | head -c 80` → `{"access_token":` 로 시작. (`supabase status -o env`의 키 이름이 다르면 출력에서 publishable/anon 키 이름을 확인해 바꾼다.)
- [ ] **Step 7:** `npm run db:types` → 전체 검증 PASS.
- [ ] **Step 8: Commit**
  ```bash
  git add -A && git commit -m "feat(db): classes with schedule check, class_members, consents and local auth seed"
  ```

---

### Task 4: Edge Functions — `_shared`, `create-student`, `reset-student-password`

**Files:**
- Create: `supabase/functions/_shared/http.ts`, `supabase/functions/_shared/admin.ts`
- Modify: `supabase/functions/submit-consultation/handler.ts` (허용 주소·CORS·json을 `_shared/http.ts`에서 가져온다. 기존 테스트는 고치지 않고 통과해야 한다)
- Create: `supabase/functions/create-student/{deno.json,deno.lock,handler.ts,index.ts,handler_test.ts}`
- Create: `supabase/functions/reset-student-password/{deno.json,deno.lock,handler.ts,index.ts,handler_test.ts}`
- Create: `scripts/fn-check.sh`; Modify: `package.json` (`fn:check`), `supabase/config.toml`

**Interfaces:**
- Produces:
  - `_shared/http.ts`: `ALLOWED_ORIGINS: readonly string[]` (Global Constraints 3개), `corsHeaders(origin: string): Record<string,string>`(Allow-Methods `POST, OPTIONS`, Allow-Headers `authorization, x-client-info, apikey, content-type`, Max-Age 600, `Vary: Origin`), `json(status: number, body: unknown, origin: string | null): Response`, `preflight(req: Request): { ok: true; origin: string } | { ok: false; response: Response }`(Origin 없음·불허 → 403 `forbidden_origin`, OPTIONS → 204, POST 아님 → 405 `method`), `charLength(s: string): number`(코드 포인트), `describeError(err: unknown): { name: string; code: string | null }`.
  - `_shared/admin.ts`: `type AdminDeps = { getClaims(jwt: string): Promise<{ sub: string; aal: string | null } | null>; isAdmin(userId: string): Promise<boolean> }`; `requireAdmin(req: Request, deps: AdminDeps): Promise<{ ok: true; userId: string } | { ok: false; status: 401 | 403; error: "unauthorized" | "forbidden" }>` — `Authorization: Bearer <jwt>` 없음·`getClaims` null → 401; `aal !== "aal2"` → 403(이때 `isAdmin`은 부르지 않는다); `isAdmin` false → 403. `isValidPassword(pw: string): boolean` (코드 포인트 ≥ 8, UTF-8 ≤ 72바이트). `LOGIN_ID_RE = /^[a-z0-9_]{3,20}$/`, `STUDENT_EMAIL_DOMAIN = "student.heesu.internal"`, `GRADES`·`type Grade`(중1~고3; submit-consultation은 자기 것을 그대로 둔다).
  - HTTP 계약 (`{ error, message }` 오류 본문, message는 아래 문구 그대로):
    - `create-student` POST `{ loginId, password, name, grade, joinedAt }` → 201 `{ id: string }`. 오류: 401 `unauthorized` `로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.` / 403 `forbidden` `원장 계정(2단계 인증 완료)으로만 할 수 있어요. 다시 로그인해 주세요.` / 400 `invalid` + 항목별 문구(`body` `요청 내용을 읽지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.`, `loginId` `아이디는 영문 소문자·숫자·밑줄(_)로 3~20자로 입력해 주세요.`, `password` `비밀번호는 8자 이상, 영문 기준 72자 이하로 입력해 주세요.`, `name` `이름을 1~20자로 입력해 주세요.`, `grade` `학년을 중1부터 고3 중에서 골라 주세요.`, `joinedAt` `등록일을 2026-11-05 형식으로 입력해 주세요.`) / 409 `login_taken` `이미 쓰고 있는 아이디예요. 다른 아이디를 입력해 주세요.` / 500 `server` `잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.`
    - `reset-student-password` POST `{ studentId, password }` → 200 `{ ok: true }`. 오류: 401·403·500 위와 같음, 400 `invalid`(`studentId` `학생 정보를 읽지 못했어요. 목록을 새로고침한 뒤 다시 시도해 주세요.`, `password` 위와 같음), 404 `not_found` `학생을 찾을 수 없어요. 목록을 새로고침한 뒤 다시 시도해 주세요.`, 409 `student_left` `퇴원한 학생은 비밀번호를 바꿀 수 없어요. 상태를 재원으로 바꾼 뒤 시도해 주세요.`
  - `create-student` `Deps = AdminDeps & { createAuthUser(email: string, password: string): Promise<{ ok: true; userId: string } | { ok: false; reason: "exists" }>; insertStudent(row: { userId: string; loginId: string; name: string; grade: Grade; joinedAt: string }): Promise<{ ok: true; id: string } | { ok: false; reason: "exists" }>; deleteAuthUser(userId: string): Promise<void> }`; `createHandler(deps): (req) => Promise<Response>`.
  - `reset-student-password` `Deps = AdminDeps & { findStudent(id: string): Promise<{ userId: string | null; status: "active" | "paused" | "left" } | null>; markMustChange(id: string): Promise<void>; setPassword(userId: string, password: string): Promise<void> }`.
  - npm `fn:check` = `sh scripts/fn-check.sh` (세 함수 각각 `deno check --frozen *.ts && deno lint && deno test --frozen`, 그리고 `deno lint ../_shared` 한 번).

- [ ] **Step 1: 도구 설정** — 두 함수의 `deno.json`은 `submit-consultation/deno.json`과 같은 imports. 각 폴더에서 `deno install`(또는 `deno cache index.ts handler_test.ts`)로 `deno.lock`을 만든다. `scripts/fn-check.sh`(`set -eu`, 함수 폴더 목록을 돌며 서브셸에서 실행). `config.toml`: `[functions.create-student]`·`[functions.reset-student-password]`에 `verify_jwt = false`(OPTIONS 프리플라이트가 Origin 검사까지 오게 하고, JWT는 함수가 `getClaims`로 검증 — 주석으로 이유), `[auth] additional_redirect_urls = ["http://localhost:3000", "https://dev.heesu.pages.dev", "https://heesu.pages.dev"]`.
- [ ] **Step 2: 실패하는 테스트 작성 — `create-student/handler_test.ts`** (가짜 deps가 호출을 기록; 기본 = 원장 aal2, 생성 성공)
  - 불허 Origin → 403 `forbidden_origin`, deps 호출 0. OPTIONS(허용 Origin) → 204 + ACAO = 그 Origin.
  - Authorization 없음 → 401 `unauthorized`; `getClaims` null → 401; `aal: "aal1"` → 403 `forbidden`이고 `isAdmin` 호출 0; `isAdmin` false → 403. 어느 경우든 `createAuthUser` 호출 0.
  - 본문: JSON 아님 → 400 `invalid` + body 문구; `loginId` `"Haneul"`·`"ab"`·`"a".repeat(21)`·`"ha-neul"` → loginId 문구; `password` `"1234567"`(7자) → password 문구, `"가".repeat(25)`(75바이트) → password 문구, `"a".repeat(72)` → 통과; `name` `"  "`·21자 → name 문구, 앞뒤 공백은 trim되어 저장; `grade` `"초6"` → grade 문구; `joinedAt` `"2026-13-01"`·`"2026-02-30"`·`"20261105"` → joinedAt 문구.
  - 성공: `createAuthUser("haneul@student.heesu.internal", pw)` 1회, `insertStudent`에 `{ userId, loginId: "haneul", name, grade, joinedAt }`, 201 `{ id }`.
  - `createAuthUser` → `{ ok: false, reason: "exists" }` → 409 `login_taken`, `insertStudent` 호출 0.
  - `insertStudent` → `{ ok: false, reason: "exists" }` → 409 `login_taken` + `deleteAuthUser(userId)` 1회.
  - `insertStudent` throw → 500 `server` + `deleteAuthUser(userId)` 1회; `deleteAuthUser`까지 throw해도 500(응답 본문에 오류 내용 없음).
  - 로그(`console.error` 가로채기)에 비밀번호·이름이 없다.
- [ ] **Step 3: 실패하는 테스트 작성 — `reset-student-password/handler_test.ts`**
  - Origin·401·403 규칙은 create-student와 같은 표로 3건.
  - `studentId` uuid 아님 → 400 studentId 문구; password 7자 → 400.
  - `findStudent` null 또는 `userId: null` → 404 `not_found`; `status: "left"` → 409 `student_left`; 둘 다 `setPassword` 호출 0.
  - 성공: 호출 순서 `markMustChange(id)` → `setPassword(userId, pw)`(플래그를 먼저 — 비밀번호만 바뀌고 강제가 빠지는 일이 없게), 200 `{ ok: true }`.
  - `setPassword` throw → 500 `server`.
- [ ] **Step 4:** `npm run fn:check` → FAIL(모듈 없음).
- [ ] **Step 5: 구현 — `_shared/*.ts`, 두 `handler.ts`**. 처리 순서: `preflight` → `requireAdmin` → 본문 파싱(16,000자 상한) → 동작. `joinedAt`은 `^\d{4}-\d{2}-\d{2}$` + `new Date(\`${v}T00:00:00Z\`)`의 `toISOString().slice(0,10) === v`. `submit-consultation/handler.ts`는 `ALLOWED_ORIGINS`·`corsHeaders`·`json`·`charLength`·`describeError`를 `../_shared/http.ts`에서 import하고 `ALLOWED_ORIGINS`는 다시 export(테스트가 쓴다).
- [ ] **Step 6: 구현 — 두 `index.ts`** (`submit-consultation/index.ts`처럼 비밀값 누락 시 모든 dep가 실패하는 `buildDeps`):
  - `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })` 하나.
  - `getClaims: async (jwt) => { const { data, error } = await sb.auth.getClaims(jwt); if (error || !data) return null; return { sub: String(data.claims.sub), aal: typeof data.claims.aal === "string" ? data.claims.aal : null }; }`
  - `isAdmin`: `sb.rpc("admin_user_exists", { p_user_id })` → `data === true`(error면 throw).
  - `createAuthUser`: `sb.auth.admin.createUser({ email, password, email_confirm: true })`; `error.code === "email_exists"` → exists. `app_metadata`·`user_metadata`는 넣지 않는다.
  - `insertStudent`: `sb.from("students").insert({ user_id, login_id, name, grade, joined_at }).select("id").single()`; `error.code === "23505"` → exists.
  - `deleteAuthUser`: `sb.auth.admin.deleteUser(id)`. reset: `findStudent` = `from("students").select("user_id, status").eq("id", id).maybeSingle()`, `markMustChange` = `update({ must_change_password: true }).eq("id", id)`, `setPassword` = `auth.admin.updateUserById(userId, { password })`.
- [ ] **Step 7:** `npm run fn:check` → PASS(세 함수, `deno lint` 경고 0, `deno.lock` 변경 없음).
- [ ] **Step 8: 로컬 확인(edge-runtime 필요, CI 밖)** — `supabase start`(제외 목록 없이) → `supabase functions serve --no-verify-jwt` 다른 터미널 → 원장 토큰 없이 `curl -i -X POST http://127.0.0.1:56321/functions/v1/create-student -H 'origin: http://localhost:3000' -H 'content-type: application/json' -d '{}'` → `401`; `-H 'origin: https://evil.example'` → `403`. (aal2 성공 경로는 Task 10 화면에서 확인.)
- [ ] **Step 9:** 전체 검증 → PASS.
- [ ] **Step 10: Commit**
  ```bash
  git add -A && git commit -m "feat(fn): create-student and reset-student-password with aal2 admin check and shared origin allowlist"
  ```

---

### Task 5: 디자인 시스템 — `Modal`, `Tabs`, `Radio`, `AdminSidebar`

**Files:**
- Create: `src/design-system/components/Modal/Modal.tsx`, `Modal.test.tsx`
- Create: `src/design-system/components/Tabs/Tabs.tsx`, `Tabs.test.tsx`
- Create: `src/design-system/components/Radio/Radio.tsx`, `Radio.test.tsx`
- Create: `src/design-system/components/AdminSidebar/AdminSidebar.tsx`, `AdminSidebar.test.tsx`
- Modify: `src/design-system/index.ts`

**Interfaces:**
- Produces (props는 `docs/design-system/components/index.d.ts` 계약 + 아래 차이만):
  - `Modal({ open, title, children, footer, onClose, width? = 440 }: ModalProps)` — `role="dialog"`, `aria-modal="true"`, `aria-labelledby`=제목. 열릴 때 대화상자 안 첫 포커스 대상으로 포커스, 닫히면 연 요소로 되돌림, Tab은 안에서 순환, Esc·바깥(scrim) 클릭·제목 줄의 `닫기` 버튼 → `onClose`. 렌더는 `AnimatePresence` + `overlay.scrim`/`overlay.modal`, `rounded-xl shadow-lg bg-bg-surface-raised`. `inline` prop은 만들지 않는다(미리보기 전용).
  - `Tabs({ items, value, defaultValue, onChange, variant = "line", ariaLabel }: TabsProps)` — `role="tablist"`/`role="tab"`·`aria-selected`, 선택된 탭만 `tabIndex=0`, ←/→/Home/End로 이동하며 바로 선택(자동 활성화). `count`가 있으면 라벨 뒤 `Badge tone="count"`. 제어(`value`)·비제어(`defaultValue`, 없으면 첫 항목).
  - `Radio({ label, description, error?, ...input }: RadioProps & { error?: ReactNode })` — Checkbox와 같은 구조(`type="radio"`, id·aria-describedby·aria-invalid 연결, `{...rest}` 먼저). 그룹 질문은 쓰는 쪽이 `<fieldset><legend>`.
  - `AdminSidebar(props: AdminSidebarProps)`:
    ```ts
    type AdminSidebarItem = { value: string; label: string; href: string; icon: LucideIcon; count?: number };
    interface AdminSidebarProps {
      items: ({ group: string } | AdminSidebarItem)[];
      active?: string;
      linkComponent?: ElementType; // next/link를 넘긴다. 기본 "a"
      logoSrc?: string;            // 기본 "/brand/heesu-mark.svg"
      academyName?: string;        // 기본 "희수영어" (명조 font-serif — README 예외)
      userName?: string;
      userRole?: string;           // 기본 "원장"
      onSignOut?: () => void;      // 있으면 하단에 ghost "로그아웃"
    }
    ```
    `<nav aria-label="관리 메뉴">`, 그룹 제목은 `text-caption text-text-subtle`, 항목은 `h-10 rounded-md`, active는 `bg-primary-soft text-text-brand` + `aria-current="page"`, count는 `Badge tone="count"` + `<span className="sr-only">건</span>`. 너비 `w-16 lg:w-(--sidebar)`, `lg` 미만에서 라벨·그룹 제목·학원 이름·사용자 이름은 `max-lg:sr-only`(접어도 접근성 이름 유지), 아이콘 20px `aria-hidden`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - Modal: `open={false}` → dialog 없음; `open` → `getByRole("dialog", { name: "퇴원 처리할까요?" })`; 포커스가 대화상자 안; Esc → `onClose` 1회; scrim 클릭 → 1회, 대화상자 안쪽 클릭 → 0회; `닫기` → 1회; footer 버튼 두 개에서 마지막에서 Tab → 첫 포커스 대상으로; 열기 버튼으로 열었다가 `open=false`로 rerender → 포커스가 열기 버튼으로 돌아옴(`waitFor`).
  - Tabs: 항목 `재원 3 / 휴원 / 퇴원` → 탭 3개, 첫 탭 `aria-selected="true"`; 두 번째 클릭 → `onChange("paused")`, 비제어면 선택이 옮겨감; 첫 탭에서 `{ArrowLeft}` → 마지막 탭 선택·포커스; `{End}`/`{Home}`; 제어 모드에서 `onChange`만 부르고 `value`가 안 바뀌면 선택 그대로; `count` 3 → 탭 이름에 `3` 포함.
  - Radio: 같은 name 두 개 — 라벨 클릭으로 선택 전환; `description` → aria-describedby 연결; `error` → `aria-invalid="true"`.
  - AdminSidebar: `getByRole("navigation", { name: "관리 메뉴" })`; 그룹 제목 `수업` 보임; `active="students"` → `getByRole("link", { name: "학생" })`에 `aria-current="page"`, 다른 링크엔 없음; `count: 3` → 링크 이름 `상담 3건`; `href` 그대로; `linkComponent`로 넘긴 컴포넌트가 쓰인다(`data-testid` 붙인 가짜 링크); `onSignOut` → `로그아웃` 버튼 클릭 1회, 없으면 버튼 없음.
- [ ] **Step 2:** `npm test -- src/design-system` → 새 테스트 FAIL.
- [ ] **Step 3: 구현** (Interfaces 그대로). `index.ts`에 `Modal, type ModalProps, Tabs, type TabsProps, Radio, type RadioProps, AdminSidebar, type AdminSidebarProps, type AdminSidebarItem` export.
- [ ] **Step 4:** 전체 검증 → PASS(디자인 시스템 lint: 허용 외 import 없음).
- [ ] **Step 5: Commit**
  ```bash
  git add -A && git commit -m "feat(design-system): Modal, Tabs, Radio and AdminSidebar"
  ```

---

### Task 6: `core/auth`와 `/login` (원장 TOTP, 학생 아이디)

**Files:**
- Create: `src/core/auth/role.ts`, `role.test.ts`, `src/core/auth/session.tsx`, `src/core/auth/RequireRole.tsx`, `RequireRole.test.tsx`, `src/core/auth/index.ts`
- Create: `src/features/auth/model/login.ts`, `login.test.ts`
- Create: `src/features/auth/data/auth.ts`
- Create: `src/features/auth/state/useLoginFlow.ts`
- Create: `src/features/auth/components/{CredentialsForm,TotpEnroll,TotpVerify}.tsx`
- Create: `src/features/auth/screen/LoginScreen.tsx`, `LoginScreen.test.tsx`, `src/features/auth/index.ts`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `supabase`, `type Session` (`@/core/supabase/client`), `classifyError` (`@/core/supabase/error`), `public.my_role()` (Task 2), `Input`·`Button`·`Card`·`useToast` (design-system).
- Produces:
  - `core/auth/role.ts`: `type Role = "admin" | "student"`; `homePathFor(role: Role): "/admin" | "/s"`; `fetchMyRole(): Promise<Role | null>`(`supabase.rpc("my_role")`, 그 밖의 값은 null, error면 throw); `authKeys = { all: ["auth"] as const, role: (userId: string) => ["auth", "role", userId] as const }`; `decideGuard(input: { session: "loading" | "signedOut" | "signedIn"; role: Role | null | undefined; required: Role }): { kind: "wait" } | { kind: "render" } | { kind: "redirect"; to: "/login" | "/admin" | "/s" }`(role `undefined` = 아직 조회 중).
  - `core/auth/session.tsx`: `useAuthSession(): { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; session: Session }` — `getSession()` + `onAuthStateChange` 구독, `INITIAL_SESSION` 외 모든 이벤트에서 `queryClient.invalidateQueries({ queryKey: authKeys.all })`. `useMyRole(session: Session | null): UseQueryResult<Role | null>`. `useSignOut(): () => Promise<void>` — `supabase.auth.signOut()` → `queryClient.clear()` → `router.replace("/login")`.
  - `core/auth/RequireRole.tsx`: `RequireRole({ role, children }: { role: Role; children: ReactNode })` — `decideGuard` 결과대로 `wait`면 `<div aria-busy="true" className="min-h-dvh" />`, `redirect`면 `router.replace(to)` 후 같은 빈 화면.
  - `features/auth/model/login.ts`:
    - `STUDENT_EMAIL_DOMAIN = "student.heesu.internal"`, `LOGIN_ID_RE = /^[a-z0-9_]{3,20}$/`.
    - `toAuthEmail(input: string): { ok: true; email: string; kind: "admin" | "student" } | { ok: false; message: string }` — trim + 소문자; `@`가 있으면 `kind: "admin"` 이메일 그대로; 아니면 `LOGIN_ID_RE` 통과 시 `<id>@student.heesu.internal`, 실패 시 `아이디는 영문 소문자·숫자·밑줄(_)로 3~20자예요. 다시 확인해 주세요.`
    - `planMfaStep(factors: { id: string; factor_type: string; status: "verified" | "unverified" }[]): { kind: "verify"; factorId: string } | { kind: "enroll"; unenrollIds: string[] }` — 확인된 totp가 있으면 그 첫 번째로 verify, 없으면 미확인 totp id를 모두 지우고 enroll.
    - `authErrorMessage(error: unknown): string` — 코드별: `invalid_credentials` → classifyError 문구, `mfa_verification_failed` → `인증 코드가 맞지 않아요. 앱에 보이는 6자리 숫자를 다시 입력해 주세요.`, `mfa_challenge_expired` → `코드 입력 시간이 지났어요. 앱의 새 숫자로 다시 입력해 주세요.`, `over_request_rate_limit`·`over_sms_send_rate_limit`·status 429 → `로그인 시도가 너무 많아요. 5분 뒤 다시 시도해 주세요.`, 그 밖 `classifyError(error).message`.
    - `totpCodeSchema = z.string().regex(/^\d{6}$/, "6자리 숫자를 입력해 주세요.")`.
  - `features/auth/data/auth.ts`: `signInWithPassword(email, password): Promise<void>`, `listTotpFactors(): Promise<Factor[]>`(`mfa.listFactors()`의 `all` 중 totp), `unenrollFactor(id)`, `enrollTotp(): Promise<{ factorId: string; qrCode: string; secret: string }>`(`friendlyName: "heesu-admin"`), `verifyTotp(factorId, code): Promise<void>`(`mfa.challengeAndVerify`), `getAssurance(): Promise<{ current: string | null; next: string | null }>`, `signOut()`. 모두 error면 그대로 throw.
  - `useLoginFlow()` 상태: `step: { kind: "checking" } | { kind: "credentials" } | { kind: "enroll"; factorId; qrCode; secret } | { kind: "verify"; factorId }`, `error: string | null`, `pending: boolean`, `submitCredentials(input, password)`, `submitCode(code)`. 흐름:
    - 마운트: 세션 없음 → credentials. 세션 있음 → `getAssurance()`가 `current aal1 · next aal2`면 verify(첫 확인된 totp), 아니면 `fetchMyRole()` → 역할이 있으면 `router.replace(homePathFor(role))`, null이면 `signOut()` 후 credentials.
    - 비밀번호 성공 뒤 `kind === "admin"` → `planMfaStep` → (unenroll → enroll) 또는 verify. `kind === "student"` → 역할 확인.
    - 역할 확인: `admin` 경로에서 `'admin'`이 아니면, 학생 경로에서 `'student'`가 아니면 `signOut()` + `로그인할 수 없는 계정이에요. 학원에 문의해 주세요.`. 맞으면 `queryClient.invalidateQueries({ queryKey: authKeys.all })` 후 이동.
  - `LoginScreen()` — `bg-bg-page` 가운데 카드(최대 400px), HS 마크 + 고정 문구. 아이디 입력에 `autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"`, 비밀번호 `autoComplete="current-password"`, 코드 `inputMode="numeric" autoComplete="one-time-code" maxLength={6}`. TOTP 등록 화면은 `<img src={qrCode} alt="인증 앱 등록용 QR 코드">`(CSP `img-src data:` 허용) + 비밀키 텍스트(`hs-num`, 복사 가능). 오류는 폼 위 `role="alert"`.
  - `features/auth/index.ts`: `LoginScreen`(Task 7이 더한다).

- [ ] **Step 1: 실패하는 테스트 작성 — `role.test.ts`, `login.test.ts`**
  ```ts
  it.each([
    ["Haneul ", { ok: true, email: "haneul@student.heesu.internal", kind: "student" }],
    ["min_jun2", { ok: true, email: "min_jun2@student.heesu.internal", kind: "student" }],
    [" Admin@Example.Test ", { ok: true, email: "admin@example.test", kind: "admin" }],
  ])("toAuthEmail(%j)", (input, out) => expect(toAuthEmail(input)).toEqual(out));
  it.each(["ab", "ha-neul", "하늘", "a".repeat(21), ""])("rejects %j", (s) =>
    expect(toAuthEmail(s)).toEqual({ ok: false, message: "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자예요. 다시 확인해 주세요." }));
  it("verifies with the first verified totp factor", () =>
    expect(planMfaStep([{ id: "u1", factor_type: "totp", status: "unverified" }, { id: "v1", factor_type: "totp", status: "verified" }]))
      .toEqual({ kind: "verify", factorId: "v1" }));
  it("clears leftover unverified totp factors before enrolling", () =>
    expect(planMfaStep([{ id: "u1", factor_type: "totp", status: "unverified" }, { id: "p1", factor_type: "phone", status: "unverified" }]))
      .toEqual({ kind: "enroll", unenrollIds: ["u1"] }));
  // authErrorMessage: { code: "mfa_verification_failed" } → 위 문구, { status: 429 } → 5분 문구, { name: "AuthApiError", status: 400, code: "invalid_credentials" } → "아이디 또는 비밀번호가 맞지 않아요. 다시 입력해 주세요."
  // decideGuard 표: loading → wait; signedIn + role undefined → wait; signedOut → redirect /login;
  //   signedIn + null → redirect /login; required admin + student → redirect /s; required student + admin → redirect /admin; 일치 → render
  ```
- [ ] **Step 2: 실패하는 테스트 작성 — `LoginScreen.test.tsx`** (`vi.mock("../data/auth")`, `vi.mock("@/core/auth", …fetchMyRole…)`, `next/navigation`의 `useRouter` mock):
  - 세션 없음 → `희수영어 로그인`, `아이디 또는 이메일`·`비밀번호` 필드.
  - `ha-neul` 입력 → 제출 → 아이디 형식 문구, `signInWithPassword` 호출 0.
  - `Haneul` + 비밀번호 → `signInWithPassword("haneul@student.heesu.internal", pw)`, 역할 `student` → `router.replace("/s")`.
  - 학생 경로인데 역할 null → `signOut` 호출 + `로그인할 수 없는 계정이에요. 학원에 문의해 주세요.`
  - 이메일 + factor 없음 → `enrollTotp` → QR `img`(alt) 보임 → `12345` 입력 → `6자리 숫자를 입력해 주세요.`, `verifyTotp` 0회 → `123456` → `verifyTotp(factorId, "123456")` → 역할 `admin` → `router.replace("/admin")`.
  - 미확인 factor `u1`만 있음 → `unenrollFactor("u1")` 후 `enrollTotp`.
  - `verifyTotp`가 `{ code: "mfa_verification_failed" }` reject → 코드 오류 문구, 단계 유지.
  - 이메일 경로 aal2 뒤 역할 `student`(학생이 내부 이메일로 들어온 경우) → `signOut` + 로그인 불가 문구.
  - 마운트 시 세션 있음 + `getAssurance` `{ current: "aal1", next: "aal2" }` → 바로 `인증 앱에 보이는 6자리 숫자를 입력해 주세요.`
  - 마운트 시 세션 있음 + aal2 + 역할 admin → `router.replace("/admin")`, 폼 안 보임.
  - pending 중 `로그인` 두 번 클릭 → `signInWithPassword` 1회.
- [ ] **Step 3: 실패하는 테스트 작성 — `RequireRole.test.tsx`**: `useAuthSession`·`useMyRole`을 mock해 role 불일치 → `router.replace("/s")` 호출, children 안 보임; 일치 → children 보임.
- [ ] **Step 4:** `npm test -- src/core/auth src/features/auth` → FAIL.
- [ ] **Step 5: 구현** (Interfaces 그대로). `src/app/login/page.tsx`는 `LoginScreen` 하나만 렌더(`metadata.title = "로그인"`, `robots: { index: false }`).
- [ ] **Step 6:** 전체 검증 → PASS.
- [ ] **Step 7: 로컬 확인** — `supabase db reset` → `npm run dev` → `/login`에서 `admin@example.test` / `local-admin-pass-1234` → QR 화면 → 표시된 비밀키로 `oathtool --totp -b <secret>`(없으면 인증 앱) 코드 입력 → `/admin`으로 이동(아직 셸 없음 — 404면 정상, 이동 주소만 확인). 새로고침 후 `/login` 재진입 → 바로 `/admin`. `haneul` / `student-pass-1` → `/s` 이동.
- [ ] **Step 8: Commit**
  ```bash
  git add -A && git commit -m "feat(auth): login with admin TOTP enroll/verify, student id login and role guard"
  ```

---

### Task 7: 학생 첫 로그인 비밀번호 변경과 `/s` 자리 화면

**Files:**
- Create: `src/features/auth/model/password.ts`, `password.test.ts`
- Create: `src/features/auth/data/student.ts`
- Create: `src/features/auth/state/useMyStudent.ts`, `src/features/auth/state/useChangeFirstPassword.ts`, `useChangeFirstPassword.test.tsx`
- Create: `src/features/auth/components/StudentGate.tsx`
- Create: `src/features/auth/screen/FirstLoginPasswordScreen.tsx`, `FirstLoginPasswordScreen.test.tsx`, `src/features/auth/screen/StudentPlaceholderScreen.tsx`
- Modify: `src/features/auth/index.ts`
- Create: `src/app/s/layout.tsx`, `src/app/s/page.tsx`

**Interfaces:**
- Consumes: `RequireRole`, `useSignOut`, `authKeys` (Task 6); `public.password_changed()`, `students` 본인 행 (Task 2).
- Produces:
  - `passwordSchema: z.ZodString` (단일 필드, Task 10도 쓴다)와 `newPasswordSchema = z.object({ password: passwordSchema, confirm })` — password: 8자 이상(`비밀번호는 8자 이상으로 입력해 주세요.`), UTF-8 72바이트 이하(`비밀번호가 너무 길어요. 영문 기준 72자 이하로 줄여 주세요.`); confirm 불일치 → `confirm` 경로에 `두 비밀번호가 달라요. 같은 비밀번호를 한 번 더 입력해 주세요.`
  - `passwordErrorMessage(error: unknown): string` — `same_password` → `지금 비밀번호와 다른 비밀번호를 입력해 주세요.`, `weak_password` → `너무 쉬운 비밀번호예요. 숫자와 영문을 섞어 8자 이상으로 바꿔 주세요.`, 그 밖 `classifyError`.
  - `getMyStudent(userId: string): Promise<{ id: string; name: string; mustChangePassword: boolean } | null>` — `from("students").select("id, name, must_change_password").eq("user_id", userId).maybeSingle()`.
  - `updateMyPassword(password: string): Promise<void>`(`auth.updateUser`), `markPasswordChanged(): Promise<void>`(`rpc("password_changed")`).
  - `studentKeys = { me: (userId: string) => ["auth", "student", userId] as const }` (authKeys.all 아래라 세션 이벤트 때 함께 무효화).
  - `useMyStudent(): UseQueryResult<MyStudent | null>`.
  - `useChangeFirstPassword(): UseMutationResult<void, unknown, string>` — `updated` ref: 아직이면 `updateMyPassword` → `updated = true`; 그다음 `markPasswordChanged`. 성공 시 `studentKeys.me` invalidate.
  - `StudentGate({ children })` — 로딩 빈 화면; `mustChangePassword` true → `FirstLoginPasswordScreen`; 아니면 children.
  - `StudentPlaceholderScreen()` — `bg-bg-page`, 문구 `{이름}, 반가워요.` / `학생 화면은 곧 열려요. 조금만 기다려 주세요.`, ghost `로그아웃`(`useSignOut`). 계획 4가 `/s/page.tsx`를 바꾼다.
  - `features/auth/index.ts`: `LoginScreen, StudentGate, StudentPlaceholderScreen, LOGIN_ID_RE, passwordSchema`.
  - `src/app/s/layout.tsx`: `<RequireRole role="student"><StudentGate>{children}</StudentGate></RequireRole>`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `password.test.ts`: `"1234567"` → 8자 문구; `"가".repeat(25)` → 72바이트 문구; `"a".repeat(72)` 통과; confirm 다름 → confirm 문구; `passwordErrorMessage({ code: "same_password" })` → 문구.
  - `useChangeFirstPassword.test.tsx`(data mock): 정상 → `updateMyPassword` 1회 → `markPasswordChanged` 1회; `markPasswordChanged`가 첫 번째 reject → mutation error → 같은 값으로 다시 `mutate` → `updateMyPassword`는 여전히 1회, `markPasswordChanged` 2회, 성공.
  - `FirstLoginPasswordScreen.test.tsx`: 제목·본문 고정 문구; 짧은 비밀번호 → 오류, 호출 0; 일치하는 8자 이상 → mutation 호출, 성공 토스트 `비밀번호를 바꿨어요.`; `same_password` reject → 문구가 `role="alert"`로.
- [ ] **Step 2:** `npm test -- src/features/auth` → FAIL.
- [ ] **Step 3: 구현** (Interfaces 그대로). 폼은 react-hook-form + `zodResolver(newPasswordSchema)`, 입력 `autoComplete="new-password"`, `size="lg"`(학생 폰 48px).
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: 로컬 확인** — `haneul` 로그인 → 비밀번호 변경 화면만 보임 → 변경 → `김하늘, 반가워요.` → 로그아웃 → 새 비밀번호로 로그인 → 바로 자리 화면. psql로 `select must_change_password from public.students where login_id='haneul'` = `f`.
- [ ] **Step 6: Commit**
  ```bash
  git add -A && git commit -m "feat(auth): force first-login password change for students and add /s placeholder"
  ```

---

### Task 8: 원장 셸 — 사이드바, 준비 중 화면, 상담 새 신청 수

**Files:**
- Create: `src/features/admin-shell/model/menu.ts`, `menu.test.ts`
- Create: `src/features/admin-shell/components/AdminShell.tsx`, `AdminShell.test.tsx`
- Create: `src/features/admin-shell/screen/ComingSoonScreen.tsx`, `src/features/admin-shell/index.ts`
- Create: `src/features/consultations/data/countNewConsultations.ts`, `src/features/consultations/state/useNewConsultationCount.ts`; Modify: `src/features/consultations/index.ts`
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, 그리고 `page.tsx` 하나씩: `src/app/admin/{attendance,sessions,videos,questions,consultations,points,payments,site,settings}/page.tsx`

**Interfaces:**
- Consumes: `AdminSidebar` (Task 5), `RequireRole`·`useSignOut`·`useAuthSession` (Task 6), `consultations` 테이블(원장 select).
- Produces:
  - `ADMIN_MENU: ({ group: string } | { value: MenuValue; label: string; href: string; icon: LucideIcon })[]` — 순서 고정(spec §4):
    - `{ group: "수업" }` 오늘 `today` `/admin` (House) · 출결·숙제 `attendance` `/admin/attendance` (ClipboardCheck) · 수업일지 `sessions` `/admin/sessions` (BookOpen) · 학생 `students` `/admin/students` (Users) · 반 `classes` `/admin/classes` (CalendarDays) · 영상 `videos` `/admin/videos` (Video) · 질문 `questions` `/admin/questions` (MessageCircle)
    - `{ group: "학부모" }` 상담 `consultations` `/admin/consultations` (Phone) · 포인트 `points` `/admin/points` (Trophy) · 결제 `payments` `/admin/payments` (Receipt)
    - `{ group: "운영" }` 랜딩 관리 `site` `/admin/site` (PanelsTopLeft) · 설정 `settings` `/admin/settings` (Settings)
  - `activeMenuFor(pathname: string): MenuValue` — 가장 긴 접두사 일치(`/admin` 정확 일치만 `today`), 끝 `/` 무시.
  - `AdminShell({ children })` — `flex min-h-dvh bg-bg-admin`: 왼쪽 sticky `AdminSidebar`(`linkComponent={Link}`, `active={activeMenuFor(usePathname())}`, `userName` = 세션 이메일의 `@` 앞, `onSignOut={useSignOut()}`, 상담 `count` = `useNewConsultationCount().data`가 1 이상일 때만), 오른쪽 `<main className="min-w-0 flex-1 p-6">`.
  - `ComingSoonScreen({ title }: { title: string })` — `h1` 제목 + 고정 문구 `{title} 화면은 준비 중이에요. 다음 업데이트에서 열려요.`
  - `countNewConsultations(): Promise<number>` — `from("consultations").select("id", { count: "exact", head: true }).eq("status", "new")`. `useNewConsultationCount()` — 쿼리 키 `["consultations", "newCount"]`, `staleTime 60_000`. `features/consultations/index.ts`에서 export(그리고 Task 10이 쓰는 `GRADES`, `type Grade`, `formatPhoneInput`도 이때 export).
  - `src/app/admin/layout.tsx`: `<RequireRole role="admin"><AdminShell>{children}</AdminShell></RequireRole>`, `metadata.robots = { index: false }`. 준비 중 페이지 10개(오늘 포함)는 각각 `<ComingSoonScreen title="…" />`(메뉴 라벨 그대로). 계획 3·5·6이 이 파일들을 바꾼다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `menu.test.ts`: 항목 라벨 순서 = `["오늘","출결·숙제","수업일지","학생","반","영상","질문","상담","포인트","결제","랜딩 관리","설정"]`; 그룹 순서 `["수업","학부모","운영"]`; `activeMenuFor` 표: `/admin`→today, `/admin/`→today, `/admin/students`→students, `/admin/students/detail`→students, `/admin/classes/edit`→classes, `/admin/site`→site.
  - `AdminShell.test.tsx`(`usePathname` → `/admin/students/detail`, 훅 mock): 학생 링크 `aria-current="page"`, href `/admin/students`; 새 상담 2 → 링크 이름 `상담 2건`; 0 → 이름 `상담`; `로그아웃` → signOut mock 1회; children이 `main` 안.
- [ ] **Step 2:** `npm test -- src/features/admin-shell` → FAIL.
- [ ] **Step 3: 구현** (Interfaces 그대로).
- [ ] **Step 4:** 전체 검증 → PASS(`out/admin/attendance/index.html` 등 10개 페이지가 빌드에 있다).
- [ ] **Step 5: 로컬 확인** — 원장 로그인 → 사이드바 12개 메뉴, 화면 폭 1000px에서 64px 아이콘만, 학생으로 `/admin` 접근 → `/s`로 이동, 원장으로 `/s` → `/admin`.
- [ ] **Step 6: Commit**
  ```bash
  git add -A && git commit -m "feat(admin): admin shell with sidebar menu, coming-soon pages and new consultation badge"
  ```

---

### Task 9: 반 화면 — 목록·추가·수정과 시간표 편집

**Files:**
- Create: `src/features/classes/model/classes.ts`, `classes.test.ts`
- Create: `src/features/classes/data/classes.ts`, `classes.test.ts`
- Create: `src/features/classes/state/useClasses.ts`
- Create: `src/features/classes/components/ScheduleEditor.tsx`, `ScheduleEditor.test.tsx`, `ClassForm.tsx`
- Create: `src/features/classes/screen/ClassListScreen.tsx`, `ClassFormScreen.tsx`, `ClassFormScreen.test.tsx`, `src/features/classes/index.ts`
- Create: `src/app/admin/classes/page.tsx`, `src/app/admin/classes/new/page.tsx`, `src/app/admin/classes/edit/page.tsx`

**Interfaces:**
- Consumes: `classes`·`class_members` (Task 3), `Tabs`·`Radio`·`Input`·`Select`·`Button`·`Card`·`useToast` (design-system), `classifyError`.
- Produces:
  - model: `DAY_LABELS = ["월","화","수","목","금","토","일"] as const`(index 0 = day 1); `LEVEL_LABELS = { middle: "중등", high: "고등" }`; `scheduleSlotSchema`(`day` 1~7 정수, `start`·`end` `^([01]\d|2[0-3]):[0-5]\d$` → `시각은 17:00처럼 적어 주세요.`, `start < end` → `end` 경로에 `끝나는 시각을 시작보다 늦게 적어 주세요.`); `classFormSchema = { name: trim 1~30 (`반 이름을 1~30자로 입력해 주세요.`), level, schedule: slot 배열 최대 14 + 같은 요일 시간 겹침 금지(`같은 요일에 겹치는 시간이 있어요. 시간을 고쳐 주세요.`), capacity: 빈 문자열 → null, 1~50 정수(`정원은 1~50명으로 입력해 주세요.`) }`; `type ClassSummary = { id: string; name: string; level: "middle" | "high"; schedule: ScheduleSlot[]; capacity: number | null; memberCount: number }`; `formatSchedule(slots: ScheduleSlot[]): string` — 요일 순 정렬, `"월 17:00–19:00 · 수 17:00–19:00"`, 빈 배열 `"시간표 없음"`; `parseClassRow(row: unknown): ClassSummary` (schedule이 모양이 틀리면 빈 배열로 — DB 트리거가 막지만 화면은 깨지지 않게).
  - data: `listClasses(): Promise<ClassSummary[]>`(`select("id, name, level, schedule, capacity, class_members(count)")`, 이름순), `getClass(id): Promise<ClassSummary | null>`, `createClass(input: ClassFormOutput): Promise<string>`, `updateClass(id, input): Promise<void>`.
  - state: `classKeys = { all: ["classes"] as const, detail: (id: string) => ["classes", id] as const }`, `useClasses()`, `useClass(id: string | null)`(`enabled: id !== null`), `useSaveClass()`(성공 시 `classKeys.all` invalidate).
  - `ScheduleEditor({ value, onChange, errors? }: { value: ScheduleSlot[]; onChange: (v: ScheduleSlot[]) => void; errors?: (Partial<Record<"day" | "start" | "end", string>> | undefined)[] })` — 행마다 요일 `Select`(size md), 시작·끝 `Input type="time"`(size md), `삭제` ghost 버튼(`aria-label="{n}번째 시간 삭제"`); 아래 secondary `시간 추가`(기본값 `{ day: 1, start: "17:00", end: "19:00" }`, 14개면 비활성).
  - `ClassFormScreen({ mode }: { mode: "new" | "edit" })` — edit은 `useSearchParams().get("id")`가 uuid일 때만 조회, 아니면 바로 `반을 찾을 수 없어요. 목록에서 다시 골라 주세요.` 카드 + `반 목록으로` 링크. 저장 성공 → 토스트 `반을 저장했어요.` → `/admin/classes`. DB P0001·23505 → `classifyError` 문구(23505는 `이미 같은 이름의 반이 있어요. 다른 이름을 입력해 주세요.`로 화면에서 바꿔 보여 준다).
  - `ClassListScreen` — 머리 `반` + primary `반 추가`(→ `/admin/classes/new`); 표 열 `반 이름 · 구분 · 시간표 · 정원 · 학생 수`, 행 클릭·Enter → `/admin/classes/edit?id=…`; 비었으면 `아직 반이 없어요. 반 추가를 눌러 첫 반을 만들어 주세요.`
  - `features/classes/index.ts`: `useClasses`, `type ClassSummary`, `formatSchedule`, `LEVEL_LABELS`, `classKeys`.
  - 페이지: edit은 `<Suspense><ClassFormScreen mode="edit" /></Suspense>`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `model/classes.test.ts`: `formatSchedule([{day:3,start:"17:00",end:"19:00"},{day:1,start:"17:00",end:"19:00"}])` = `"월 17:00–19:00 · 수 17:00–19:00"`; `[]` → `"시간표 없음"`; slot `end` `"16:00"` → end 문구; `"7:00"` → 시각 문구; 같은 요일 `17:00–19:00`과 `18:30–20:00` → 겹침 문구, 이어 붙는 `19:00–21:00`은 통과; capacity `""` → null, `"0"`·`"51"`·`"3.5"` → 정원 문구; `parseClassRow`에 schedule `"x"` → `schedule: []`, `class_members: [{ count: 3 }]` → `memberCount: 3`.
  - `data/classes.test.ts`(supabase mock): `createClass`가 `capacity: null`, 이름 trim으로 insert payload를 만든다.
  - `ScheduleEditor.test.tsx`: `시간 추가` → onChange에 기본 슬롯이 붙음; `2번째 시간 삭제` → 그 슬롯만 빠짐; 요일 select 변경 → day 숫자로 반영; 14개면 `시간 추가` disabled.
  - `ClassFormScreen.test.tsx`: edit + id 없음/`"abc"` → 안내 카드, `getClass` 호출 0; edit + uuid + null → 안내 카드; new 저장 → `createClass` 1회 + 토스트 + `router.push("/admin/classes")`; `createClass`가 `{ code: "23505" }` reject → 같은 이름 문구.
- [ ] **Step 2:** `npm test -- src/features/classes` → FAIL.
- [ ] **Step 3: 구현** (Interfaces 그대로).
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: 로컬 확인** — 원장으로 반 추가(월·수 두 칸) → 목록에 `월 17:00–19:00 · 수 17:00–19:00`; 수정에서 끝 시각을 시작보다 앞으로 → 저장 전 오류 문구; `/admin/classes/edit?id=zzz` → 안내 카드.
- [ ] **Step 6: Commit**
  ```bash
  git add -A && git commit -m "feat(classes): admin class list, create and edit with schedule editor"
  ```

---

### Task 10: 학생 화면 — 목록·추가·수정

**Files:**
- Create: `src/features/students/model/students.ts`, `students.test.ts`
- Create: `src/features/students/data/students.ts`, `src/features/students/data/functions.ts`, `functions.test.ts`
- Create: `src/features/students/state/useStudents.ts`
- Create: `src/features/students/components/StudentTable.tsx`
- Create: `src/features/students/screen/StudentListScreen.tsx`, `StudentListScreen.test.tsx`, `StudentNewScreen.tsx`, `StudentNewScreen.test.tsx`, `StudentEditScreen.tsx`, `StudentEditScreen.test.tsx`, `src/features/students/index.ts`
- Create: `src/app/admin/students/page.tsx`, `src/app/admin/students/new/page.tsx`, `src/app/admin/students/edit/page.tsx`

**Interfaces:**
- Consumes: Edge Function 계약 (Task 4), `students`·`student_private`·`class_members` (Task 2·3), `GRADES`·`type Grade` (`@/features/consultations`, Task 8), `LOGIN_ID_RE`·`passwordSchema` (`@/features/auth`, Task 7), `useClasses`·`type ClassSummary` (`@/features/classes`), `Tabs`·`Modal`·`Radio`·`Select`·`Input`·`Button`·`Card`·`useToast`.
- Produces:
  - model: `STATUS_LABELS = { active: "재원", paused: "휴원", left: "퇴원" }`; `studentCreateSchema = { loginId: trim·소문자 후 `LOGIN_ID_RE` (`아이디는 영문 소문자·숫자·밑줄(_)로 3~20자로 입력해 주세요.`), password: `passwordSchema`, name: trim 1~20 (`이름을 1~20자로 입력해 주세요.`), grade: GRADES (`학년을 골라 주세요.`), joinedAt: `YYYY-MM-DD`(기본 오늘, 로컬 날짜) }`; `studentEditSchema = { name, grade, status, joinedAt }`; `type StudentSummary = { id: string; loginId: string; name: string; grade: Grade; status: "active" | "paused" | "left"; joinedAt: string; school: string | null; classes: { id: string; name: string }[] }`; `parseStudentRow(row: unknown): StudentSummary`; `filterStudents(list: StudentSummary[], status: StudentStatus | "all", query: string): StudentSummary[]`(이름·아이디 부분 일치, 공백 무시) ; `class StudentFunctionError extends Error { code: StudentFunctionCode; message: string }`, `type StudentFunctionCode = "unauthorized" | "forbidden" | "invalid" | "login_taken" | "not_found" | "student_left" | "server"`.
  - data `students.ts`: `listStudents(): Promise<StudentSummary[]>`(`select("id, login_id, name, grade, status, joined_at, student_private(school), class_members(classes(id, name))")`, 이름순), `getStudent(id): Promise<StudentSummary | null>`, `updateStudent(id, input: StudentEditOutput): Promise<void>`(name·grade·status·joined_at만 — 컬럼 grant와 같게).
  - data `functions.ts`: `createStudent(input: StudentCreateOutput): Promise<string>`(`functions.invoke("create-student", { body: { loginId, password, name, grade, joinedAt } })` → `{ id }`), `resetStudentPassword(studentId: string, password: string): Promise<void>`. `FunctionsHttpError`면 본문 `{ error, message }`를 읽어 `StudentFunctionError(code, message)`(모르는 code·읽기 실패 → `server` + `잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.`), 그 밖 오류는 그대로 throw(→ 화면은 `classifyError`).
  - state: `studentKeys = { all: ["students"] as const, detail: (id: string) => ["students", id] as const }`; `useStudents()`, `useStudent(id: string | null)`, `useCreateStudent()`, `useUpdateStudent()`, `useResetStudentPassword()`; 변경 성공 시 `studentKeys.all` invalidate.
  - `StudentListScreen` — 머리 `학생` + primary `학생 추가`; `Tabs` 항목 `재원 n · 휴원 n · 퇴원 n · 전체 n`(기본 재원, `ariaLabel="상태별 보기"`); 검색 `Input`(`이름이나 아이디로 찾기`); `StudentTable` 열 `이름 · 아이디 · 학년 · 학교 · 반 · 상태 · 등록일`(반은 이름을 `, `로, 없으면 `미배정`; 상태는 `Badge`), 행 클릭·Enter → `/admin/students/detail?id=…`. 포인트 열은 계획 3이 더한다. 결과 0 → `조건에 맞는 학생이 없어요.`, 전체 0 → `아직 학생이 없어요. 학생 추가를 눌러 첫 학생을 등록해 주세요.`
  - `StudentNewScreen` — 아이디·초기 비밀번호(`autoComplete="off"`, 보기 토글)·이름·학년·등록일. 성공 → 토스트 `학생을 추가했어요. 아이디와 초기 비밀번호를 학생에게 알려 주세요.` → `/admin/students/detail?id=<새 id>`(반 배정·보호자 정보는 상세에서). `login_taken` → 아이디 필드 오류로, `invalid` → 서버 문구를 폼 위 alert로, `unauthorized`·`forbidden` → 토스트(danger).
  - `StudentEditScreen` — `?id=` 규칙은 ClassFormScreen과 같음(`학생을 찾을 수 없어요. 목록에서 다시 골라 주세요.` + `학생 목록으로`). 이름·학년·상태(`Radio` fieldset `상태`)·등록일. 상태를 `left`로 바꿔 저장하면 먼저 `Modal` `퇴원 처리할까요?` / 본문 `퇴원 처리하면 이 학생은 로그인해도 아무 정보도 볼 수 없어요. 다시 재원으로 바꾸면 돌아와요.` / [취소] [퇴원 처리](danger). 성공 → 토스트 `학생 정보를 저장했어요.` → 상세로.
  - `features/students/index.ts`: `STATUS_LABELS`, `type StudentSummary`(계획 3·6용).

- [ ] **Step 1: 실패하는 테스트 작성**
  - `model/students.test.ts`: `studentCreateSchema`에 `" Haneul "` → `"haneul"`; `"ha-neul"`·`"ab"` → 아이디 문구; 비밀번호 7자 → 문구; `parseStudentRow`가 `student_private: null`·`[]` → `school: null`, `class_members: [{ classes: { id, name } }]` → `classes`; `filterStudents`: 상태 `left`만, `"하 늘"`·`"HANEUL"` 검색이 `김하늘`(`haneul`)을 찾는다.
  - `data/functions.test.ts`(`supabase.functions.invoke` mock): 성공 `{ data: { id: "s1" } }` → `"s1"`; `FunctionsHttpError`(context `Response` 409 `{ error: "login_taken", message: "이미 …" }`) → `StudentFunctionError` code `login_taken`·message 그대로; 본문이 JSON 아님 → code `server`; 네트워크 `FunctionsFetchError` → 그대로 throw.
  - `StudentListScreen.test.tsx`: 재원 2·퇴원 1 → 처음엔 2행, 탭 이름 `재원 2`; `퇴원` 탭 → 1행; 검색 `minjun` → 1행; 행 Enter → `router.push("/admin/students/detail?id=…")`; 반 없음 → `미배정`.
  - `StudentNewScreen.test.tsx`: 빈 제출 → 문구들, 호출 0; 정상 → `createStudent` payload `{ loginId: "haneul", … }`; **pending 중 두 번 클릭 → 1회**; `login_taken` reject → 아이디 필드에 문구; 성공 → `router.push("/admin/students/detail?id=s1")` + 토스트.
  - `StudentEditScreen.test.tsx`: id 없음·`"x"` → 안내 카드, `getStudent` 0회; 상태 `퇴원` 선택 후 저장 → 모달 열림, `updateStudent` 0회 → `퇴원 처리` → 1회(status `left`); 모달 `취소` → 0회 유지.
- [ ] **Step 2:** `npm test -- src/features/students` → FAIL.
- [ ] **Step 3: 구현** (Interfaces 그대로). ESLint `ADMIN_UI_FILES`에 이미 `src/features/students/**`가 있다.
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: 로컬 확인(edge-runtime 필요)** — `supabase start`(전체) + `supabase functions serve` + `npm run dev` → 원장(aal2)으로 학생 `jiwoo` 추가 → 상세 주소로 이동; 같은 아이디로 다시 추가 → `이미 쓰고 있는 아이디예요…`; 새 학생으로 로그인 → 비밀번호 변경 화면. psql: `select count(*) from auth.users where email = 'jiwoo@student.heesu.internal'` = 1.
- [ ] **Step 6: Commit**
  ```bash
  git add -A && git commit -m "feat(students): admin student list, create via edge function and edit with leave confirm"
  ```

---

### Task 11: 학생 상세 — 반 배정, 보호자 정보, 보호자 동의, 비밀번호 초기화

**Files:**
- Create: `src/features/students/model/detail.ts`, `detail.test.ts`
- Create: `src/features/students/data/detail.ts`, `detail.test.ts`
- Create: `src/features/students/state/useStudentDetail.ts`
- Create: `src/features/students/components/{StudentInfoCard,ClassAssignCard,GuardianCard,ConsentCard,PasswordResetCard}.tsx`
- Create: `src/features/students/screen/StudentDetailScreen.tsx`, `StudentDetailScreen.test.tsx`
- Create: `src/app/admin/students/detail/page.tsx`
- Modify: `docs/superpowers/plans/foundation-followups.md`

**Interfaces:**
- Consumes: `useStudent`·`useResetStudentPassword`·`StudentFunctionError` (Task 10), `useClasses`·`classKeys` (`@/features/classes`), `formatPhoneInput` (`@/features/consultations`), `student_private`·`class_members`·`consents` (Task 2·3), `Modal`·`Radio`·`Checkbox`·`Input`·`Button`·`Card`·`useToast`.
- Produces:
  - model: `diffClassIds(current: string[], next: string[]): { add: string[]; remove: string[] }`(정렬된 결과); `guardianSchema = { school: trim ≤40 → 빈 값 null (`학교 이름은 40자까지 쓸 수 있어요.`), guardianName: ≤20 → null, guardianPhone: 빈 값 null 또는 `^010-\d{4}-\d{4}$` (`010-0000-0000 형식으로 입력해 주세요.`), memo: ≤2000 → null (`메모는 2000자까지 쓸 수 있어요.`) }`; `CONSENT_METHOD_LABELS = { written: "서면", phone: "전화", kakao: "카톡" }`; `consentSchema = { guardianName: trim 1~20 (`보호자 이름을 1~20자로 입력해 주세요.`), method (`동의 방법을 골라 주세요.`), version: trim 1~40 (`동의서 버전을 입력해 주세요. 예: 2026-11`), consentedAt: `datetime-local` 값 필수, 미래 금지(`동의 일시는 지금보다 앞이어야 해요.`) → ISO 문자열 }`; `type ConsentRecord = { id; guardianName; method; version; consentedAt: string }`.
  - data: `getStudentPrivate(id): Promise<GuardianOutput | null>`, `saveStudentPrivate(id, input): Promise<void>`(`upsert(…, { onConflict: "student_id" })`), `setStudentClasses(id, current: string[], next: string[]): Promise<void>`(`diffClassIds` → remove는 `delete().eq("student_id", id).in("class_id", remove)`, add는 insert; 둘 다 비면 요청 없음), `listConsents(id): Promise<ConsentRecord[]>`(최신순), `addConsent(id, input): Promise<void>`.
  - state: `studentKeys` 아래 `["students", id, "private"]`, `["students", id, "consents"]`; 반 배정 성공 시 `studentKeys.all`·`classKeys.all` invalidate(학생 수 열 갱신).
  - `StudentDetailScreen` — `?id=` 규칙은 Task 10과 같음. 머리: 이름 + 상태 Badge + secondary `정보 수정`(→ edit). 카드 순서:
    1. `StudentInfoCard` 아이디·학년·등록일·상태(읽기 전용).
    2. `ClassAssignCard` 제목 `반 배정` — 모든 반 `Checkbox`(라벨 `반 이름`, 설명 `formatSchedule`), 바뀐 게 있을 때만 `저장` 활성 → 토스트 `반 배정을 저장했어요.`. 반이 없으면 `먼저 반을 만들어 주세요.` + `/admin/classes/new` 링크.
    3. `GuardianCard` 제목 `학교·보호자` — 학교, 보호자 이름, 보호자 연락처(`formatPhoneInput`으로 입력 중 하이픈), 메모(multiline) + `저장` → `보호자 정보를 저장했어요.`
    4. `ConsentCard` 제목 `보호자 동의` — 기록 표(일시 `yyyy.MM.dd HH:mm`(date-fns) · 보호자 · 방법 · 버전), 비었으면 `아직 동의 기록이 없어요. 만 14세 미만 학생은 보호자 동의를 받아 기록해 주세요.`; 추가 폼: 보호자 이름, `fieldset`/`legend` `동의 방법` + `Radio` 3개(기본 `서면`), 동의서 버전, 동의 일시(`datetime-local`, 기본 지금) + `기록 추가` → `동의 기록을 추가했어요.` 기록은 고치거나 지울 수 없다는 안내 caption `동의 기록은 고치거나 지울 수 없어요. 잘못 적었다면 새 기록을 추가해 주세요.`
    5. `PasswordResetCard` 제목 `비밀번호 초기화` — 설명 `학생이 비밀번호를 잊었을 때 새 초기 비밀번호를 정해요. 학생은 다음 로그인 때 비밀번호를 바꾸게 돼요.` + secondary `비밀번호 초기화` → `Modal` `비밀번호를 초기화할까요?`(본문에 새 비밀번호 `Input`) [취소] [초기화](primary) → 성공 토스트 `비밀번호를 초기화했어요. 새 비밀번호를 학생에게 알려 주세요.`, `student_left` 등은 서버 문구를 모달 안 alert로. 퇴원생이면 버튼 비활성 + caption `퇴원한 학생은 초기화할 수 없어요.`
    (학부모 링크·최근 출결·포인트·결제 카드는 계획 3·6이 이 화면에 더한다.)
  - 페이지: `<Suspense><StudentDetailScreen /></Suspense>`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `model/detail.test.ts`: `diffClassIds(["a","b"],["b","c"])` = `{ add: ["c"], remove: ["a"] }`, 같은 집합 → 둘 다 `[]`; `guardianSchema`에 `guardianPhone: ""` → null, `"010-12-3"` → 형식 문구, 공백뿐인 school → null; `consentSchema` 미래 일시 → 문구, 버전 `"  "` → 문구, method 없음 → 문구.
  - `data/detail.test.ts`(supabase mock): `setStudentClasses("s", ["a"], ["a"])` → `from` 호출 0; `(["a","b"], ["b","c"])` → delete `in("class_id", ["a"])` 1회, insert `[{ student_id: "s", class_id: "c" }]` 1회; `saveStudentPrivate`가 `onConflict: "student_id"`로 upsert.
  - `StudentDetailScreen.test.tsx`(훅 mock): id 없음 → 안내 카드; 반 배정 체크 변경 전 `저장` disabled → 체크 → enabled → 클릭 → `setStudentClasses` 1회; 연락처에 `01012345678` 입력 → 값 `010-1234-5678`; 동의 추가 기본 방법 `서면` checked, 미래 일시 → 문구; 비밀번호 초기화 모달에서 7자 → 문구·호출 0, 8자 → `resetStudentPassword(id, pw)` 1회 + 토스트; 퇴원생 → 초기화 버튼 disabled.
- [ ] **Step 2:** `npm test -- src/features/students` → FAIL.
- [ ] **Step 3: 구현** (Interfaces 그대로).
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: 끝까지 확인(로컬, edge-runtime 포함)** — `supabase db reset` → 전체 `supabase start` + `supabase functions serve` + `npm run dev`:
  1. 원장 로그인(TOTP) → 학생 추가 → 상세에서 반 2개 배정 → 반 목록 학생 수 증가.
  2. 학교·보호자 저장 → 새로고침 후 값 유지. 동의 기록 추가 → 표에 보임.
  3. 비밀번호 초기화 → 학생으로 새 비밀번호 로그인 → 비밀번호 변경 화면 → 변경 → 자리 화면.
  4. 정보 수정에서 퇴원 처리 → 그 학생 로그인 → `로그인할 수 없는 계정이에요. 학원에 문의해 주세요.`
  5. psql `select table_name, op, count(*) from private.audit_log group by 1,2 order by 1,2` → `public.students`·`public.student_private`·`public.consents` 행이 있다.
  6. 학생 세션의 access token으로 `curl 'http://127.0.0.1:56321/rest/v1/student_private?select=*' -H "apikey: …" -H "authorization: Bearer <학생 토큰>"` → `[]`.
- [ ] **Step 6: 후속 문서** — `foundation-followups.md`의 "Admin plan must include" 항목을 이 계획에서 닫은 것으로 표시(어느 Task인지 한 줄씩). 새로 생긴 클라우드 체크리스트 항목을 "Cloud checklist"에 더한다: 대시보드 Auth Redirect URLs = 정확히 3개 주소; `create-student`·`reset-student-password` 배포 시 `--no-verify-jwt`(config와 같게); 원장 계정을 만든 뒤 `private.admins`에 넣고 첫 로그인 때 TOTP 등록; 원장 비밀번호 12자 이상.
- [ ] **Step 7:** 전체 검증 → PASS.
- [ ] **Step 8: Commit**
  ```bash
  git add -A && git commit -m "feat(students): student detail with class assignment, guardian info, consents and password reset"
  ```
