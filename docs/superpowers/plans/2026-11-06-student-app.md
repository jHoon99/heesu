# 학생 앱(student-app) 구현 계획 — v1 계획 4/7

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 화면 `/s`를 로컬에서 끝까지 동작하게 만든다: 하단 탭바 셸(홈·숙제·영상·질문·내 정보, 영상·질문은 "곧 열려요"), 홈(인사·오늘 숙제·`PointsProgress`·새 영상 자리), 숙제(수업별 목록, `submit_homework` 낙관적 제출, 원장 판정 칩), 내 정보(이름·반·포인트 내역·비밀번호 변경·로그아웃·홈 화면에 추가 안내), DB `my_rank()`, PWA(manifest·아이콘·최소 서비스 워커).

**Architecture:** 순위는 DB만 계산한다: security definer `public.my_rank()`가 호출한 학생의 `{rank, total}` 두 정수만 돌려주고, 다른 학생의 이름·점수는 어떤 경로로도 학생에게 가지 않는다(학생의 `student_point_totals`·`points`는 기존 RLS로 본인 1행·본인 행만). 프론트는 기능 폴더 `student-shell`(탭·셸·프로필·SW 등록)·`homework`(숙제 목록·제출)·`student-home`(홈·순위·축하)·`my-info`(내 정보)로 나누고, 비밀번호 변경 폼은 기존 `auth` 기능에 둔다. 화면 → TanStack Query 훅 → data 함수 → Supabase(RLS). PWA는 `public/`의 정적 파일(manifest, `sw.js`)이고, 서비스 워커는 `/s` 셸에서만 등록되며 같은 출처의 GET 중 `/s` 화면 HTML과 정적 자산만 다루고 Supabase(교차 출처)·POST는 절대 가로채지 않는다.

**Tech Stack:** Next.js 16.4.4 (static export) · React 19.3 · Tailwind v4 · TanStack Query 5 · react-hook-form 7 + zod 4 · date-fns 4 · supabase-js 2.118 · motion 14 + canvas-confetti · lucide-react · Supabase CLI 2.121 · pgTAP · Vitest

**Spec:** `docs/superpowers/specs/2026-11-04-heesu-v1-features-design.md` (§2 학생 행, §5 학생 화면 홈·숙제·내 정보(영상·질문은 계획 5), §7 `homework_checks`·`points`·순위 문단, §10 항목 4, §11 보상 목표·순위 `my_rank()`) · 구조·보안 `docs/superpowers/specs/2026-11-03-heesu-architecture-design.md` (§4 폴더, §5·§6 학생 쓰기, §13 S1·S2·S3) · 디자인 `docs/design-system/README.md`(학생 웹앱 행, 포인트 색, 모션), `docs/design-system/motion.md`, `docs/design-system/components/{StudentHomeScreen,StudentTabBar,PointsProgress,PointsBurst,Confetti,Card,Badge}/{README.md,preview.html}`, `docs/design-system/components/index.d.ts` · 형식·기존 코드 `docs/superpowers/plans/2026-11-06-class-ops.md` · 후속 항목 `docs/superpowers/plans/v1-followups.md`("student-app" 항목이 있으면 이 계획이 닫는다)

## Global Constraints

- 정적 내보내기: Route Handler·Server Action·middleware·`next/image` 최적화 금지. 새 주소는 `src/app/s/{homework,videos,questions,me}/page.tsx`, page는 기능 화면 하나만 그린다.
- 의존 규칙: `app → features → core, design-system`; `features/A`는 `features/B/index.ts`로만; `design-system`은 `react, motion, canvas-confetti, lucide-react, class-variance-authority, clsx, tailwind-merge`만(`next/link`·날짜 계산 불가 — 링크는 `linkComponent` prop); `@supabase/supabase-js`·`supabase` 클라이언트는 `src/core/supabase/**`, `src/features/*/data/**`에서만. **새 npm 의존성 없음.** PNG 아이콘은 저장소 밖 scratch(`/private/tmp/claude-502/-Users-jh-orca-projects-heesu/4cb5871e-009e-4d1f-b076-7635ccd7f4c8/scratchpad/crop`, `@resvg/resvg-js` 설치돼 있음)에서 만들고 결과 파일만 커밋한다.
- 학생 화면(디자인 README "학생 웹앱"): 폰 390px 기준, 배경 `bg-bg-page`, 카드 `Card`(기본 `bg-bg-surface`), 큰 학생 카드는 `rounded-xl`, 좌우 여백 `px-4`, 터치 컨트롤 48px(`size="lg"`), 본문 최대 폭 `max-w-[480px] mx-auto`. 명조(`font-serif`) 금지. 꿀색(`points*` 토큰, `Badge tone="points"`)은 포인트 표시에만. primary 버튼은 화면에 하나(목록 안 버튼은 `secondary`). 이모지 금지, 아이콘은 `lucide-react`. 토큰만(`src/features`·`src/app`에 hex·`rgb()` 금지 — `src/test/no-raw-colors.test.ts`; 색 상수가 필요하면 `src/core/pwa`에 둔다).
- 모션: 학생 기능 폴더는 ESLint `ADMIN_UI_FILES` 밖이라 `CountUp`·`ProgressFill`·`celebrate`를 쓸 수 있다. 모두 `prefers-reduced-motion`에서 꺼지고, 모션 없이도 숫자·문구는 다 보인다. `celebrate()`는 **보상 목표 달성 때만, 목표마다 한 번**.
- 고정 값:
  - 탭(순서·글자·주소·아이콘): 홈 `/s` `House` · 숙제 `/s/homework` `BookOpen` · 영상 `/s/videos` `CirclePlay` · 질문 `/s/questions` `MessageCircleQuestionMark` · 내 정보 `/s/me` `User`.
  - 인사: `{부름말}, 오늘도 한 문장씩!` — 부름말 규칙은 Task 6 `callName`.
  - 포인트 단위는 화면 어디서나 `점`(원장 화면과 같게; 시안의 `P`는 쓰지 않는다).
  - 보상 목표: `site_content` 키 `points_goal`, 값은 jsonb 정수 1~10000, 없거나 틀리면 `DEFAULT_POINTS_GOAL = 30`.
  - 순위: `my_rank()` = `status = 'active'` 학생만, 누적 포인트 내림차순, 동점 같은 순위(1, 2, 2, 4), `{ rank, total }`(total = 재원 학생 수). 문구 `전체 {total}명 중 {rank}등`. 호출자가 재원 학생이 아니면(휴원·퇴원·원장·아무나) 0행 → 순위 줄을 숨긴다.
  - 숙제 판정 칩은 `StatusChip`(`done` 완료 · `missing` 미완료). `none`이면 칩 없음.
  - 날짜는 학원(서울) 날짜 `toLocalDateKey(new Date())`(`@/features/sessions`), 짧은 날짜 `formatShortDate` + `dayLabelOf` → `11/4(화)`.
  - 오류 문구: DB `P0001` 문구는 `classifyError(e).message`로 그대로 보인다(`submit_homework`의 세 문구). 그 밖은 `classifyError`.
- 저장 규칙: RPC 결과가 비면 `SaveNotAppliedError`(`src/core/supabase/saveNotApplied.ts`). 비밀번호 mutation은 `gcTime: 0` + 시도마다 `reset()`, 비밀번호 문자열을 ref·state에 두지 않는다(AGENTS.md).
- 조회 실패: 전체 오류 화면은 `isError && data === undefined`일 때만, 백그라운드 재조회 실패는 내용을 유지한다.
- RLS·DB: 새 함수는 `revoke all … from public, anon, authenticated, service_role` 후 `grant execute … to authenticated`, `set search_path = ''`, `00_meta.test.sql` 허용 목록 갱신. pgTAP 파일은 시드 테이블을 먼저 `delete from`하고 시드에 없는 이름·uuid(접미사 `…009`)를 쓴다. 클라이언트 노출 `raise exception`이 생기면 "-해요" 한국어.
- 로컬: Supabase API `http://127.0.0.1:56321`, DB `postgresql://postgres:postgres@127.0.0.1:56322/postgres`. 셸마다 `export PATH="$HOME/.orbstack/bin:$PATH"`. 마이그레이션 적용 `supabase db reset`, 타입은 `npm run db:types`로만. 개발 서버 `:3000`(막혀 있으면 `npm run dev -- -p 3001`; 이때 Edge Function 호출은 안 되지만 이 계획은 Edge Function을 부르지 않는다). 시드 학생 `haneul`·`minjun` / `student-pass-1`은 `must_change_password = true`라 브라우저 확인 전에 psql로 false로 바꾼다.
- 클라우드에는 아무것도 적용·배포하지 않는다(계획 7).
- 각 Task 끝 전체 검증: `npm run typecheck && npm run lint && npm test && npm run fn:check && npm run db:test && npm run build`. 커밋은 Conventional Commits, push 금지. **같은 작업 트리에 다른 작업자가 있을 수 있으니 `git add -A` 대신 그 Task의 Files 목록만 `git add`한다.**

## Review Focus

1. **"제출했어요"를 눌렀는데 저장이 실패하는 경우**(느린 망·오프라인·남의 반 수업·숙제 없는 수업) → 버튼이 다시 나타나고(가짜 "제출함" 상태가 남지 않음), DB 문구 그대로 토스트가 뜨며, 기다리는 동안 두 번 눌러도 요청은 한 번. → Task 5 `useSubmitHomework` 테스트 "P0001 거절 → 되돌림 + 문구 그대로", "pending 중 두 번 → rpc 1회".
2. **학생이 반에서 빠졌거나, 숙제 칸이 공백뿐이거나, 원장이 미래 날짜 수업을 미리 만든 경우** → 그 숙제는 목록에 안 나오고(세션을 못 읽는 `missing` 판정 행도 무시), 화면이 깨지지 않는다. → Task 5 `buildHomeworkItems` 테스트.
3. **순위의 경계**: 동점, 포인트 행이 없는 재원생(0점), 휴원·퇴원생·원장·아무나의 호출, 마이너스 합계 → 1,2,2,4 / 0점도 순위에 포함 / 비재원 호출은 0행 / 다른 학생 정보는 응답에 없음. → Task 1 pgTAP.
4. **축하가 반복되거나 너무 일찍 터지는 경우**: 새로고침, StrictMode 이중 effect, 탭 이동 후 복귀, 원장이 목표를 30→50으로 바꿈, `site_content`를 아직 못 받은 순간(기본값 30으로 오판), Safari 사생활 모드처럼 `localStorage`가 던지는 경우 → 목표마다 정확히 한 번, 저장이 안 되면 축하하지 않음, 목표값을 받기 전에는 판단하지 않음. → Task 6 `useGoalCelebration`·`PointsCard` 테스트.
5. **서비스 워커가 데이터나 낡은 화면을 내보내는 경우**: Supabase 응답(교차 출처)·POST·랜딩·`/login`·`/admin`·`/g`·`/sitemap.xml`을 가로채거나, 배포 뒤에도 옛 HTML을 계속 주거나, 리다이렉트 응답을 캐시하는 경우 → 이것들은 `respondWith` 없이 그대로 통과, `/s` HTML은 네트워크 우선, 오프라인이면 캐시 또는 안내 문구. → Task 3 `src/test/sw.test.ts`.

---

### Task 1: DB — `my_rank()`, 보상 목표 시드

**Files:**
- Create: `supabase/migrations/20261108000000_my_rank.sql`
- Create: `supabase/tests/09_my_rank.test.sql`
- Modify: `supabase/tests/00_meta.test.sql`, `supabase/seed.sql`, `src/core/supabase/database.types.ts` (`npm run db:types`)

**Interfaces:**
- Consumes: `private.my_student_id()`(퇴원생은 null), `public.students`(status `active|paused|left`), `public.points`.
- Produces (DB):
  - `public.my_rank() returns table (rank int, total int)` — `language sql stable security definer set search_path = ''`. 재원 학생마다 `coalesce(sum(points.amount), 0)`(포인트 행 없는 학생도 0점으로 포함)을 구해 `rank() over (order by 합계 desc)`(= 1,2,2,4)와 `count(*) over ()`를 매기고, `id = (select private.my_student_id())`인 한 행만 돌려준다(내부 열 별칭은 `rank`·`total`과 겹치지 않게 `rnk`·`cnt`). 호출자가 재원 학생이 아니면 0행. 반환 열은 이 두 정수뿐.
  - 권한: `revoke all on function public.my_rank() from public, anon, authenticated, service_role; grant execute … to authenticated`.
  - 머리 주석(형식은 `20261107000200_points.sql`과 같게): 공개 저장소 전제, 검사 파일, "security definer인 이유: 학생은 RLS로 자기 합계만 읽을 수 있어 순위를 못 구한다. 이 함수는 숫자 두 개만 내보낸다(spec §7·§11).", "`site_content` 키 `points_goal`: jsonb 정수 1~10000(학생 홈 보상 목표, 없으면 30).", 감사 대상 아님.
- Produces (시드): `site_content` insert에 `('points_goal', '30')` 한 줄.
- Produces (TS 타입): `Database["public"]["Functions"]["my_rank"]["Returns"]` = `{ rank: number; total: number }[]`(`npm run db:types` 생성 결과 그대로, 손으로 고치지 않는다).

- [ ] **Step 1: 실패하는 테스트 작성 — `09_my_rank.test.sql`** (postgres로 준비, 머리에서 `delete from public.points; delete from public.sessions; delete from public.class_members; delete from public.classes; delete from public.students;`. auth.users: 원장 `…a009`(admins), 재원 A `…c009`·B `…d009`·C `…e009`·D `…f009`, 휴원 P `…1009`, 퇴원 L `…2009`, 아무나 `…b009`. 수동 포인트(postgres로 insert): A +5, B +4 −1(합 3), C +3, D 없음, P +10, L +9.)
  - 함수 모양: `has_function('public','my_rank', ARRAY[]::text[])`, `is_definer('public','my_rank', ARRAY[]::text[])`; `function_privs_are('public','my_rank', ARRAY[]::text[], 'anon', ARRAY[]::text[])`, 같은 식으로 service_role `'{}'`, authenticated `ARRAY['EXECUTE']`.
  - 각 학생(`set local role authenticated` + `request.jwt.claims` sub, aal1): A → `results_eq('select rank, total from public.my_rank()', $$values (1, 4)$$)`; B → `(2, 4)`; C → `(2, 4)`; D → `(4, 4)`(0점도 포함).
  - 반환 모양: postgres로 `is(pg_get_function_result('public.my_rank()'::regprocedure), 'TABLE(rank integer, total integer)')`(다른 학생 정보가 끼어들 열이 없다); A로 `select count(*)::int from public.my_rank()` = 1.
  - P(휴원)·L(퇴원)·원장 aal2·아무나 → `is_empty('select * from public.my_rank()')`.
  - anon → `throws_ok('select * from public.my_rank()', '42501')`.
  - 마이너스: postgres로 D에 −2 추가 → D로 `(4, 4)` 그대로, A·B·C 순위 그대로. postgres로 B 상태를 `paused`로 → A `(1, 3)`, C `(2, 3)`, B 0행.
  - 비공개 확인(회귀): A로 `select count(*) from public.student_point_totals` = 1, `select count(*) from public.points where student_id <> A` = 0.
- [ ] **Step 2: 실패하는 테스트 작성 — `00_meta.test.sql`** public·authenticated 허용 목록을 `'{my_rank,my_role,password_changed,submit_homework}'::text[]`로.
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 09·00 FAIL.
- [ ] **Step 4: 구현 — `20261108000000_my_rank.sql`** (Interfaces 그대로) + `seed.sql`의 `site_content` insert에 `points_goal`.
- [ ] **Step 5:** `supabase db reset && npm run db:test` → PASS. psql `select value from public.site_content where key = 'points_goal'` = `30`. `npm run db:types` 후 `database.types.ts`에 `my_rank` 보임.
- [ ] **Step 6:** 전체 검증 → PASS.
- [ ] **Step 7: Commit**
  ```bash
  git add supabase/migrations/20261108000000_my_rank.sql supabase/tests/09_my_rank.test.sql supabase/tests/00_meta.test.sql supabase/seed.sql src/core/supabase/database.types.ts
  git commit -m "feat(db): my_rank rpc returning only rank and active total, points_goal seed"
  ```

---

### Task 2: 디자인 시스템 — `StudentTabBar`, `PointsProgress`

**Files:**
- Create: `src/design-system/components/StudentTabBar/StudentTabBar.tsx`, `StudentTabBar.test.tsx`
- Create: `src/design-system/components/PointsProgress/PointsProgress.tsx`, `PointsProgress.test.tsx`
- Modify: `src/design-system/index.ts`, `docs/design-system/components/index.d.ts` (두 Props 줄을 코드와 같게)

**Interfaces:**
- Consumes: `cn`, `Badge`, `CountUp`·`ProgressFill`(`../../motion/motion`), `lucide-react`(`Coins`, `Trophy`, `type LucideIcon`).
- Produces:
  - `type StudentTabItem = { value: string; label: string; href: string; icon: LucideIcon; dot?: boolean }`; `interface StudentTabBarProps { items: StudentTabItem[]; active?: string; linkComponent?: ElementType /* 기본 "a" */; className?: string }`; `StudentTabBar(props)`. (`AdminSidebar`처럼 `href` + `linkComponent`; 시안의 `onNavigate`/`IconName`은 쓰지 않는다.)
    - 모양: `<nav aria-label="학생 메뉴">`가 `fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-surface shadow-sm pb-[env(safe-area-inset-bottom)]`, 안쪽 `mx-auto flex h-16 max-w-[480px]`, 탭마다 `flex-1` 세로 정렬(아이콘 24px `aria-hidden` + `text-caption` 글자), 활성 `text-text-brand font-semibold` + `aria-current="page"`, 비활성 `text-text-muted`, `focus-visible` 링. `dot`이면 아이콘 오른쪽 위 `size-2 rounded-full bg-danger-500`(aria-hidden) + `<span className="sr-only">, 새 소식</span>`. 항목은 **앞 5개만** 그린다(README "5개를 넘기지 않는다").
  - `interface PointsProgressProps { points: number; goal: number; goalLabel?: string /* 기본 "보상" */; rank?: number; rankTotal?: number; rankScope?: string /* 기본 "전체" */; delta?: number; label?: string /* 기본 "내 포인트" */; compact?: boolean; className?: string }`; `PointsProgress(props)`.
  - `pointsRemaining(points: number, goal: number): number` = `max(0, goal - points)`; `progressPercent(points: number, goal: number): number` = 0~100으로 자른 `points / goal * 100`(goal ≤ 0이면 100, points < 0이면 0).
    - 모양(README PointsProgress): `rounded-xl bg-points-soft p-5` + 오른쪽 위 장식 원 두 개(`bg-points/20`, aria-hidden, `overflow-hidden`), `Coins` 아이콘 + label(`text-label text-points-ink`), 숫자 `<CountUp value={points} className="text-number-xl text-text" />` + `점`, 진행 바 `role="progressbar"` `aria-valuemin={0}` `aria-valuemax={goal}` `aria-valuenow={min(max(points,0), goal)}` `aria-label="{goalLabel}까지 진행"`(트랙 `bg-bg-surface`, 채움 `ProgressFill` `bg-points`), 아래 문구 남음>0 → `{goalLabel}까지 {n}점 남았어요`, 아니면 `{goalLabel} 목표를 달성했어요! 원장님께 말씀해 주세요.`. `rank`와 `rankTotal`이 둘 다 있을 때만 `{rankScope} {rankTotal}명 중 {rank}등`(rank ≤ 3이면 `Trophy` 아이콘 + `Badge tone="points"`로 감싸 강조, 그 밖은 `text-body-sm text-text-muted` — 하위 순위를 꾸미지 않는다). `delta > 0`이면 `Badge tone="points"` `+{delta}점`. `compact`: 장식 원·순위 숨김, 숫자 `text-h1`, 패딩 `p-4`.
  - index.ts: `StudentTabBar`, `type StudentTabBarProps`, `type StudentTabItem`, `PointsProgress`, `pointsRemaining`, `progressPercent`, `type PointsProgressProps`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `StudentTabBar.test.tsx`: 5개 항목(House·BookOpen·…) → `getByRole("navigation", { name: "학생 메뉴" })` 안 링크 5개, 이름 `홈`…`내 정보`, `href` 그대로; `active="homework"` → `숙제` 링크만 `aria-current="page"`; `dot: true` 항목 링크 이름에 `새 소식` 포함, 다른 링크엔 없음; 6개 주면 링크 5개; `linkComponent`로 준 컴포넌트가 `href`를 받는다(테스트용 `({href, ...p}) => <a data-testid="custom" href={href} {...p} />`).
  - `PointsProgress.test.tsx`: `pointsRemaining(12, 30)` 18, `(30, 30)` 0, `(40, 30)` 0; `progressPercent(12, 30)` 40, `(-3, 30)` 0, `(45, 30)` 100, `(5, 0)` 100. 렌더 `points={12} goal={30} rank={2} rankTotal={8}` → `getByLabelText("12")`(CountUp 접근 이름), 글자 `보상까지 18점 남았어요`, `전체 8명 중 2등`, progressbar `aria-valuenow="12"` `aria-valuemax="30"`; `points={30}` → `보상 목표를 달성했어요! 원장님께 말씀해 주세요.`; `rank` 없음 → `명 중` 없음; `rank={2}`만(rankTotal 없음) → `명 중` 없음; `compact` → 순위 글자 없음; `delta={1}` → `+1점`.
- [ ] **Step 2:** `npm test -- src/design-system/components/StudentTabBar src/design-system/components/PointsProgress` → FAIL.
- [ ] **Step 3: 구현** (Interfaces 그대로) + index.ts export + `index.d.ts`의 `StudentTabBarProps`·`PointsProgressProps` 줄을 위 타입으로 고친다.
- [ ] **Step 4:** 같은 명령 → PASS. 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/design-system/components/StudentTabBar src/design-system/components/PointsProgress src/design-system/index.ts docs/design-system/components/index.d.ts
  git commit -m "feat(design-system): StudentTabBar with safe-area and PointsProgress with goal bar and rank line"
  ```

---

### Task 3: PWA — manifest, 아이콘, 서비스 워커, 등록 함수, CSP

**Files:**
- Create: `public/manifest.webmanifest`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `public/apple-touch-icon.png`
- Create: `src/core/pwa/index.ts`, `src/core/pwa/constants.ts`, `src/core/pwa/registerServiceWorker.ts`, `src/core/pwa/standalone.ts`, `src/core/pwa/pwa.test.ts`
- Create: `src/test/pwa.test.ts`, `src/test/sw.test.ts`
- Modify: `public/_headers`, `src/test/headers.test.ts`

**Interfaces:**
- Consumes: `public/brand/hs_beige.svg`(정사각 3775, 베이지 바탕 사각형 포함, 글자는 가운데 약 52% 안 — maskable 안전 영역 80% 안에 든다), `globals.css`의 `--beige: #f2eadc`.
- Produces:
  - `src/core/pwa/constants.ts`: `PWA_THEME_COLOR = "#f2eadc"`, `PWA_BACKGROUND_COLOR = "#f2eadc"`(= `--beige`), `SW_URL = "/sw.js"`, `SW_SCOPE = "/s"`.
  - `registerServiceWorker(opts?: { enabled?: boolean }): Promise<void>` — `enabled` 기본 `process.env.NODE_ENV === "production"`(개발 서버에서는 등록하지 않아 낡은 캐시로 헷갈리지 않게). 꺼져 있거나 `"serviceWorker" in navigator`가 아니면 바로 끝. `navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })`, 실패는 삼킨다(화면은 SW 없이도 돈다).
  - `isStandalone(): boolean` — `window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true`; `window`가 없으면 false.
  - `index.ts`: 위 네 상수·두 함수 export.
  - `manifest.webmanifest`(JSON): `{"id": "/s", "name": "희수영어", "short_name": "희수영어", "description": "희수영어 학생 화면", "lang": "ko", "start_url": "/s", "scope": "/", "display": "standalone", "orientation": "portrait", "background_color": "#f2eadc", "theme_color": "#f2eadc", "icons": [{"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"}, {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"}, {"src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}`. (manifest `scope`는 `/`: 로그아웃·세션 만료로 `/login`에 가도 앱 창 안에 머문다. SW scope는 따로 `/s`.)
  - 아이콘: scratch `crop` 폴더에서 `new Resvg(fs.readFileSync("<repo>/public/brand/hs_beige.svg"), { fitTo: { mode: "width", value: N } }).render().asPng()` — N = 192 → `icons/icon-192.png`, 512 → `icons/icon-512.png`·`icons/icon-maskable-512.png`(같은 그림), 180 → `apple-touch-icon.png`(불투명 베이지, iOS용). 경로·색은 건드리지 않는다(로고 규칙).
  - `public/sw.js`(번들 없음, 일반 스크립트, `self`·`caches`·`fetch`·`Response`·`URL`만 사용):
    - `const CACHE = "hs-shell-v1"`. `install`: `caches.open(CACHE)` 후 `addAll(["/s", "/manifest.webmanifest", "/icons/icon-192.png"])`, `self.skipWaiting()`. `activate`: 이름이 `hs-shell-`로 시작하고 `CACHE`가 아닌 캐시를 지우고 `self.clients.claim()`.
    - `fetch` 결정(이 순서, 해당 없으면 **`respondWith`를 부르지 않고** 그냥 return):
      1. `method !== "GET"` 또는 `new URL(request.url).origin !== self.location.origin` → 통과(Supabase REST·Auth·Realtime·Storage는 모두 교차 출처라 여기서 빠진다).
      2. `request.mode === "navigate"`이고 pathname이 `/s` 또는 `/s/`로 시작 → 네트워크 우선: `fetch(request)`가 `ok && !redirected`이면 캐시에 `put(request, res.clone())` 후 반환; 실패하면 `caches.match(request)`, 그것도 없으면 `OFFLINE_RESPONSE()`(`new Response(<인라인 HTML>, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } })`, 본문 문구 `인터넷에 연결되지 않았어요. 연결되면 다시 열어 주세요.`).
      3. pathname이 `/_next/static/`·`/icons/`·`/brand/`로 시작하거나 `/manifest.webmanifest` → 캐시 우선: `caches.match` 있으면 반환, 없으면 `fetch` 후 `ok && type === "basic"`일 때만 `put`.
      4. 그 밖(`/`, `/login`, `/admin*`, `/g`, `/privacy`, `/sitemap.xml`, `/robots.txt` …) → 통과.
  - `public/_headers`: `/*` CSP 끝에 `; worker-src 'self'; manifest-src 'self'`를 더한다(지금도 `default-src`·`script-src`로 허용되지만 명시해서 나중에 `script-src`를 좁혀도 깨지지 않게). 새 블록 `/sw.js` + `  Cache-Control: no-cache`.

- [ ] **Step 1: 실패하는 테스트 작성 — `src/test/sw.test.ts`** — `vm.runInNewContext(readFileSync("public/sw.js","utf8"), ctx)`; `ctx = { self: { location: { origin: "https://heesu.pages.dev" }, addEventListener: (t, fn) => (handlers[t] = fn), skipWaiting: vi.fn(), clients: { claim: vi.fn() } }, caches: fakeCaches, fetch: vi.fn(), Response, URL }`(`fakeCaches`: `open`·`match`·`keys`·`delete`를 가진 Map 기반 가짜). 이벤트 = `{ request: { url, method, mode }, respondWith: vi.fn(), waitUntil: vi.fn() }`.
  - 통과(= `respondWith` 0회): `GET https://pudxtxzcftehxicfthmf.supabase.co/rest/v1/points`, `GET http://127.0.0.1:56321/auth/v1/user`, `POST https://heesu.pages.dev/s`(navigate), navigate `/`·`/login`·`/admin`·`/g`·`/sitemap.xml`, `GET /favicon.ico`(no-cors).
  - navigate `/s/homework`: fetch가 `new Response("ok", {status: 200})` → 응답 본문 `ok`, 캐시에 저장됨; fetch가 reject + 캐시 있음 → 캐시 본문; reject + 캐시 없음 → status 503, 본문에 `인터넷에 연결되지 않았어요`; fetch 결과 `redirected: true` → 반환은 하되 캐시에 저장 안 됨.
  - `GET /_next/static/chunks/a.js`: 첫 요청 fetch 1회 + 저장, 두 번째 요청 fetch 추가 호출 없이 캐시 본문.
  - `activate`: 캐시 `hs-shell-v0`·`other` 중 `hs-shell-v0`만 지움, `clients.claim` 호출.
- [ ] **Step 2: 실패하는 테스트 작성 — `src/test/pwa.test.ts`·`src/core/pwa/pwa.test.ts`·`headers.test.ts`**
  - `src/test/pwa.test.ts`: manifest JSON의 `name`·`short_name` `희수영어`, `start_url` `/s`, `scope` `/`, `display` `standalone`, `theme_color`·`background_color` = `PWA_THEME_COLOR` = `globals.css`의 `--beige:` 값(정규식으로 읽어 소문자 비교); `icons`에 `purpose: "maskable"` 하나 이상; 각 아이콘 파일이 `public/`에 있고 PNG 시그니처 + IHDR 크기가 `sizes`와 같다(`seo.test.ts`의 og.png 검사 방식); `public/apple-touch-icon.png` 180×180.
  - `src/core/pwa/pwa.test.ts`: `registerServiceWorker({ enabled: true })` + `navigator.serviceWorker.register` mock → `("/sw.js", { scope: "/s" })`로 1회; `register`가 reject → 오류 없이 resolve; `enabled: false` → 호출 없음; `navigator.serviceWorker` 없음 → 오류 없음. `isStandalone`: matchMedia mock `matches: true` → true; false + `navigator.standalone = true` → true; 둘 다 아님 → false.
  - `headers.test.ts`: 지시어 목록에 `"worker-src 'self'"`, `"manifest-src 'self'"` 추가; 새 describe `/sw.js` → `Cache-Control: no-cache`.
- [ ] **Step 3:** `npm test -- src/test/sw.test.ts src/test/pwa.test.ts src/core/pwa src/test/headers.test.ts` → FAIL.
- [ ] **Step 4: 구현** — 아이콘 생성(scratch), manifest, `sw.js`, `src/core/pwa/*`, `_headers`.
- [ ] **Step 5:** 같은 명령 → PASS. `npm run build` 후 `out/sw.js`, `out/manifest.webmanifest`, `out/icons/icon-512.png`, `out/apple-touch-icon.png` 존재. 전체 검증 → PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add public/manifest.webmanifest public/sw.js public/icons public/apple-touch-icon.png public/_headers src/core/pwa src/test/sw.test.ts src/test/pwa.test.ts src/test/headers.test.ts
  git commit -m "feat(pwa): manifest, icons and a shell-only service worker that never touches api requests"
  ```

---

### Task 4: 학생 셸 — 탭바, `/s` 레이아웃, 프로필, 준비 중 탭

**Files:**
- Create: `src/features/student-shell/index.ts`, `model/tabs.ts`, `model/tabs.test.ts`, `components/StudentShell.tsx`, `components/StudentShell.test.tsx`, `screen/ComingSoonTabScreen.tsx`, `data/profile.ts`, `data/profile.test.ts`, `state/useMyProfile.ts`
- Create: `src/app/s/videos/page.tsx`, `src/app/s/questions/page.tsx`
- Modify: `src/app/s/layout.tsx`, `src/features/auth/index.ts`(`useMyStudent`, `type MyStudent` export), `src/test/pwa.test.ts`(레이아웃 메타데이터 검사 추가)

**Interfaces:**
- Consumes: `StudentTabBar`(Task 2), `registerServiceWorker`·`PWA_THEME_COLOR`(Task 3, `@/core/pwa`), `RequireRole`·`authKeys`·`useAuthSession`(`@/core/auth`), `StudentGate`·`useMyStudent`(`@/features/auth`).
- Produces:
  - `type StudentTab = "home" | "homework" | "videos" | "questions" | "me"`; `STUDENT_TABS: (StudentTabItem & { value: StudentTab })[]`(Global Constraints의 탭 표 그대로); `activeTabFor(pathname: string): StudentTab` — 끝 `/`를 떼고 `/s` → home, `/s/homework…` → homework, `/s/videos…` → videos, `/s/questions…` → questions, `/s/me…` → me, 그 밖 → home.
  - `type MyProfile = { id: string; name: string; grade: string; loginId: string; classes: { id: string; name: string }[] }`; `getMyProfile(userId: string): Promise<MyProfile | null>` — `students.select("id, name, grade, login_id, class_members(classes(id, name))").eq("user_id", userId).maybeSingle()`, 반은 이름순(`localeCompare(…, "ko")`), `classes`가 null인 연결은 버린다.
  - `useMyProfile(): UseQueryResult<MyProfile | null>` — 키 `[...authKeys.all, "student-profile", userId]`(세션 이벤트 때 함께 무효화), signedIn일 때만.
  - `StudentShell({ children }: { children: ReactNode })` — 마운트 때 `void registerServiceWorker()` 1회; `<div className="min-h-dvh bg-bg-page"><main className="mx-auto max-w-[480px] px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main><StudentTabBar items={STUDENT_TABS} active={activeTabFor(usePathname())} linkComponent={Link} /></div>`.
  - `ComingSoonTabScreen({ title, message }: { title: string; message: string })` — `<h1 className="text-h1 text-text">{title}</h1>` + `Card`에 message(`text-body text-text-muted`).
  - 페이지: `/s/videos` → `title="영상"`, `message="영상 수업은 곧 열려요. 조금만 기다려 주세요."`; `/s/questions` → `title="질문"`, `message="질문하기는 곧 열려요. 조금만 기다려 주세요."`(계획 5가 바꾼다).
  - `src/app/s/layout.tsx`: `<RequireRole role="student"><StudentGate><StudentShell>{children}</StudentShell></StudentGate></RequireRole>`(첫 로그인 비밀번호 화면은 셸 없이 그대로). `metadata = { robots: { index: false }, manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "희수영어", statusBarStyle: "default" }, icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" } }`; `viewport: Viewport = { themeColor: PWA_THEME_COLOR, viewportFit: "cover" }`(`env(safe-area-inset-bottom)`이 0이 아니게). 중첩 layout의 `viewport` export 규칙은 `node_modules/next/dist/docs/`에서 확인한다.
  - `/s/page.tsx`는 이 Task에서 그대로 둔다(Task 6이 홈으로 바꾼다).
  - `student-shell/index.ts`: `StudentShell`, `ComingSoonTabScreen`, `useMyProfile`, `type MyProfile`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `tabs.test.ts`: `activeTabFor("/s")` home, `"/s/"` home, `"/s/homework"` homework, `"/s/me/"` me, `"/s/videos"` videos, `"/s/questions"` questions, `"/s/unknown"` home; `STUDENT_TABS.map(t => t.label)` = `["홈","숙제","영상","질문","내 정보"]`, href = `["/s","/s/homework","/s/videos","/s/questions","/s/me"]`.
  - `profile.test.ts`(supabase mock): 행 `{ id, name: "김하늘", grade: "중2", login_id: "haneul", class_members: [{ classes: { id: "c2", name: "중등 심화반" } }, { classes: null }, { classes: { id: "c1", name: "고등 독해반" } }] }` → `classes` = 고등 독해반, 중등 심화반 순(null 버림); 행 없음 → null; error → throw.
  - `StudentShell.test.tsx`(`next/navigation` `usePathname` mock `"/s/homework"`, `@/core/pwa` mock): `숙제` 링크 `aria-current="page"`; children 보임; `registerServiceWorker` 1회.
  - `src/test/pwa.test.ts`에 추가: `import { metadata, viewport } from "@/app/s/layout"` → `metadata.manifest` `/manifest.webmanifest`, `metadata.robots` `{ index: false }`, `viewport.themeColor` = `PWA_THEME_COLOR`, `viewport.viewportFit` `cover`.
- [ ] **Step 2:** `npm test -- src/features/student-shell src/test/pwa.test.ts` → FAIL → 구현 → PASS.
- [ ] **Step 3:** `npm run build` 후 `grep -o '<link rel="manifest"[^>]*>' out/s.html`, `grep -c 'apple-touch-icon' out/s.html` ≥ 1, `grep -o 'viewport-fit=cover' out/s.html`, `grep -c 'rel="manifest"' out/index.html` = 0, `out/s/videos.html`·`out/s/questions.html` 존재. 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/student-shell src/app/s src/features/auth/index.ts src/test/pwa.test.ts
  git commit -m "feat(student): student shell with bottom tab bar, pwa metadata and coming-soon video and question tabs"
  ```

---

### Task 5: 숙제 — 목록, 낙관적 "제출했어요", 판정 칩

**Files:**
- Create: `src/features/homework/index.ts`, `model/homework.ts`, `model/homework.test.ts`, `data/homework.ts`, `data/homework.test.ts`, `state/useHomework.ts`, `state/useHomework.test.tsx`, `components/HomeworkItemRow.tsx`, `components/TodayHomeworkCard.tsx`, `screen/HomeworkScreen.tsx`, `screen/HomeworkScreen.test.tsx`
- Create: `src/app/s/homework/page.tsx`

**Interfaces:**
- Consumes: `useMyStudent`(`@/features/auth`, `data.id` = studentId), `toLocalDateKey`·`formatShortDate`·`dayLabelOf`(`@/features/sessions`), `StatusChip`·`type Homework`·`Card`·`Badge`·`Button`·`useToast`(`@/design-system`), `classifyError`, `SaveNotAppliedError`, RPC `submit_homework(p_session_id uuid) returns timestamptz`(오류 P0001 세 문구: `학생 계정으로 로그인해 주세요.` / `내 반 수업의 숙제만 제출할 수 있어요. 수업을 다시 골라 주세요.` / `숙제가 없는 수업이에요. 숙제가 있는 수업을 골라 주세요.`). RLS: 학생은 소속 반 `sessions`, 본인 `homework_checks`, 소속 반 `classes`만 읽는다.
- Produces:
  - `type HomeworkItem = { sessionId: string; classId: string; className: string; date: string; homework: string; due: string | null; status: Homework; submittedAt: string | null }`.
  - `type HomeworkSessionRow = { id: string; class_id: string; date: string; homework: string | null; homework_due: string | null; classes: { name: string } | null }`; `type HomeworkCheckRow = { session_id: string; status: Homework; submitted_at: string | null }`.
  - `HOMEWORK_SESSION_LIMIT = 40`.
  - `buildHomeworkItems(sessions: HomeworkSessionRow[], checks: HomeworkCheckRow[], today: string): HomeworkItem[]` — `homework?.trim()`이 빈 수업, `date > today`인 수업, `classes`가 null인 수업은 버린다; 판정 행이 없으면 `status "none"`, `submittedAt null`; 같은 sessionId는 한 번; 결과는 `sortHomework`.
  - `sortHomework(items): HomeworkItem[]` — `missing` 먼저(오래된 날짜 먼저 — 오래 밀린 숙제가 맨 위), 그다음 나머지 날짜 내림차순, 같은 날은 반 이름순.
  - `pickTodayHomework(items: HomeworkItem[]): HomeworkItem[]` — 반(classId)마다 가장 최근 날짜 1개 ∪ 모든 `missing`, 중복 없이 `sortHomework`.
  - `canSubmit(item): boolean` = `status !== "done" && submittedAt === null`. `homeworkProgress(items): { finished: number; total: number }` — finished = `status === "done" || submittedAt !== null`.
  - `listMyHomework(studentId: string, today: string): Promise<HomeworkItem[]>` — ① `sessions.select("id, class_id, date, homework, homework_due, classes(name)").not("homework","is",null).lte("date", today).order("date",{ascending:false}).limit(HOMEWORK_SESSION_LIMIT)` ② `homework_checks.select("session_id, status, submitted_at").eq("student_id", studentId)` ③ ②의 `missing` 중 ①에 없는 session_id가 있을 때만 같은 select로 `.in("id", ids)` → `buildHomeworkItems`.
  - `submitHomework(sessionId: string): Promise<string>` — `rpc("submit_homework", { p_session_id: sessionId })`, error면 throw, data가 문자열이 아니면 `SaveNotAppliedError`.
  - `homeworkKeys = { mine: (studentId: string) => ["homework", "mine", studentId] as const }`; `useMyHomework(studentId: string | null)` — queryFn에서 `toLocalDateKey(new Date())`; `useSubmitHomework(studentId: string)` — `onMutate`: 그 키 `cancelQueries` → 스냅샷 → 그 항목 `submittedAt = new Date().toISOString()`; `onSuccess`: 서버 시각으로 교체; `onError`: 스냅샷으로 되돌리고 `toast.show({ tone: "danger", message: classifyError(e).message })`; `onSettled`: 그 키 invalidate.
  - `HomeworkItemRow({ item, onSubmit, submitting }: { item: HomeworkItem; onSubmit: (sessionId: string) => void; submitting: boolean })` — 윗줄 `text-caption text-text-muted` `{11/4(화)} · {반 이름}`; 숙제 `text-body text-text whitespace-pre-line break-words`(긴 낱말이 390px를 넘지 않게, 부모 `min-w-0`); `due`면 `마감 {11/6(목)}`; `status !== "none"`이면 `StatusChip status={item.status} size="sm"`; `canSubmit` → `Button variant="secondary" size="lg" block` `제출했어요`(`submitting`이면 disabled·`aria-busy`); 아니고 `submittedAt`이면 `Check` 아이콘 + `제출했어요 · {M/d HH:mm}`(`text-body-sm text-text-muted`, 서울 시각).
  - `TodayHomeworkCard({ studentId }: { studentId: string })` — `Card title="오늘 숙제"` `actions={<Badge tone="brand">{finished} / {total}</Badge>}`(total 0이면 배지 없음); 행 = `pickTodayHomework`; 0건 → `지금은 할 숙제가 없어요.`; 아래 `next/link` `/s/homework` `숙제 전체 보기`; 로딩 `불러오는 중이에요.`, 오류(데이터 없음) `classifyError` 문구.
  - `HomeworkScreen()` — `h1` `숙제`, 안내 `다 했으면 '제출했어요'를 눌러 주세요. 완료·미완료는 원장님이 확인해요.`, 목록 = 전체 `HomeworkItemRow`(각 `Card`), 0건 `아직 숙제가 없어요.`; 전체 오류(데이터 없음) → 문구 + `다시 시도` 버튼.
  - `homework/index.ts`: `HomeworkScreen`, `TodayHomeworkCard`, `homeworkKeys`.

- [ ] **Step 1: 실패하는 테스트 작성 — model** (`today = "2026-11-05"`)
  - `buildHomeworkItems`: homework `"  "` 버림; date `2026-11-06` 버림; `classes: null` 버림; 판정 행만 있고 세션이 없는 `missing` 무시(Review Focus 2); 판정 없는 수업 → `none`/null.
  - `sortHomework`: [11/4 none, 10/28 missing, 11/3 done, 11/2 missing] → 10/28, 11/2, 11/4, 11/3.
  - `pickTodayHomework`: 반 A(11/4 none, 11/2 missing, 10/30 done), 반 B(11/3 done) → [11/2 A missing, 11/4 A, 11/3 B]; 반 A 최신이 missing이면 한 번만.
  - `canSubmit`: none/null true, missing/null true, missing/시각 false, done/null false. `homeworkProgress`: [done, none+제출, none, missing] → `{ finished: 2, total: 4 }`.
- [ ] **Step 2: 실패하는 테스트 작성 — data·state·screen**
  - `homework.test.ts`(supabase mock): ①에 없는 missing id가 있으면 세 번째 쿼리 `.in("id", [id])`, 없으면 두 번 호출; `submitHomework("s1")` → `rpc("submit_homework", { p_session_id: "s1" })`, 반환 문자열 그대로; data null → `SaveNotAppliedError`.
  - `useHomework.test.tsx`(data mock, QueryClient + ToastProvider): 제출 시작 직후(rpc 대기 중) 캐시 항목 `submittedAt !== null`; rpc가 `{ code: "P0001", message: "내 반 수업의 숙제만 제출할 수 있어요. 수업을 다시 골라 주세요." }`로 reject → `submittedAt` null로 복귀 + 토스트 글자 그대로(Review Focus 1); 네트워크 `TypeError("Failed to fetch")` → 복귀 + `네트워크 상태를 확인해 주세요.`
  - `HomeworkScreen.test.tsx`(`useMyStudent`·data mock): missing 항목이 첫 행이고 칩 `미완료`; done 항목 칩 `완료`, 그 행에 `제출했어요` 버튼 없음; 제출한 항목 `제출했어요 ·` 글자; `제출했어요` 클릭 → 버튼이 사라지고 rpc 1회, 대기 중 두 번 클릭해도 1회; 0건 → `아직 숙제가 없어요.`
- [ ] **Step 3:** `npm test -- src/features/homework` → FAIL → 구현(+ `src/app/s/homework/page.tsx`) → PASS.
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/features/homework src/app/s/homework
  git commit -m "feat(homework): student homework list with missing-first order, optimistic submit and judged chip"
  ```

---

### Task 6: 학생 홈 — 인사, 포인트·순위, 목표 축하, 오늘 숙제

**Files:**
- Create: `src/features/student-home/index.ts`, `model/greeting.ts`, `model/greeting.test.ts`, `model/celebration.ts`, `model/celebration.test.ts`, `data/points.ts`, `data/points.test.ts`, `state/useMyPoints.ts`, `state/useGoalCelebration.ts`, `state/useGoalCelebration.test.tsx`, `components/PointsCard.tsx`, `screen/StudentHomeScreen.tsx`, `screen/StudentHomeScreen.test.tsx`
- Modify: `src/features/site-content/model/siteContent.ts`, `src/features/site-content/model/siteContent.test.ts`(없으면 Create), `src/features/site-content/index.ts`
- Modify: `src/app/s/page.tsx`; Delete: `src/features/auth/screen/StudentPlaceholderScreen.tsx`(+ `auth/index.ts`의 export)

**Interfaces:**
- Consumes: `PointsProgress`·`celebrate`·`Card`(`@/design-system`), `useMyProfile`(`@/features/student-shell`), `useMyStudent`(`@/features/auth`), `TodayHomeworkCard`(`@/features/homework`), `useSiteContent`(`@/features/site-content`), RPC `my_rank()`(Task 1), view `student_point_totals`(학생은 본인 1행).
- Produces:
  - `givenName(name: string): string` — trim; 전부 한글 음절(`/^[가-힣]+$/`)이고 정확히 3자면 첫 글자(성)를 뗀다, 그 밖(2자·4자 이상·한글 아닌 글자 포함)은 그대로.
  - `vocative(name: string): string` — 마지막 글자가 한글 음절이면 `(code - 0xAC00) % 28 !== 0`(받침 있음) → `아`, 없으면 `야`를 붙인다; 한글이 아니면 그대로.
  - `callName(name: string): string` = `vocative(givenName(name))`; `greeting(name: string): string` = `` `${callName(name)}, 오늘도 한 문장씩!` ``(빈 이름이면 `오늘도 한 문장씩!`).
  - `formatTodayLabel(d: Date): string` — `Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "long" })` → `11월 5일 수요일`.
  - `celebrationKey(studentId: string): string` = `` `heesu:celebrated-goals:${studentId}` ``; `shouldCelebrate(stored: string | null, goal: number, points: number): boolean` — `points >= goal`이고 저장된 JSON 정수 배열(깨졌으면 `[]`)에 goal이 없을 때; `withCelebrated(stored: string | null, goal: number): string` — goal을 더한 정렬·중복 없는 JSON 배열.
  - `getMyRank(): Promise<{ rank: number; total: number } | null>` — `rpc("my_rank")`, 첫 행 또는 null. `getMyPointTotal(studentId: string): Promise<number>` — `student_point_totals.select("total").eq("student_id", studentId).maybeSingle()` → `total ?? 0`.
  - `useMyPointTotal(studentId: string | null)`, `useMyRank(studentId: string | null)` — 키 `["student-points", studentId, "total" | "rank"]`.
  - `useGoalCelebration(studentId: string, points: number | undefined, goal: number | undefined): void` — effect: 둘 중 하나라도 undefined면 아무것도 안 함; `try { const key = celebrationKey(id); const s = localStorage.getItem(key); if (shouldCelebrate(s, goal, points)) { localStorage.setItem(key, withCelebrated(s, goal)); void celebrate({ y: 0.2 }); } } catch { /* 저장소를 못 쓰면 축하하지 않는다 */ }` — **기록을 먼저, 축하는 그다음**(StrictMode 이중 실행·저장 실패 때 반복 방지).
  - `site-content`: `SiteContent`에 `pointsGoal: number`, `DEFAULT_POINTS_GOAL = 30`, `EMPTY_SITE_CONTENT.pointsGoal = 30`, `parseSiteContent`의 `case "points_goal"`: 1~10000 정수면 그 값, 아니면 30. index에서 `DEFAULT_POINTS_GOAL` export.
  - `PointsCard({ studentId }: { studentId: string })` — 합계 로딩 중 `<div aria-busy="true" className="h-[168px] rounded-xl bg-points-soft" />`; 합계 오류(데이터 없음) → `role="alert"` `classifyError` 문구; 그 밖 `PointsProgress points={total} goal={content.pointsGoal} rank={rank?.rank} rankTotal={rank?.total}`(순위 오류·0행이면 순위 없이). `useGoalCelebration(studentId, total.data, siteContent.isLoading ? undefined : content.pointsGoal)`(Review Focus 4: 목표값을 받기 전엔 판단하지 않음).
  - `StudentHomeScreen()` — 머리: `text-body-sm text-text-muted` `{formatTodayLabel(new Date())}` + 반이 있으면 ` · {반 이름들 '·'로}`; `<h1 className="text-h1 text-text">{greeting(이름)}</h1>`(이름 = profile 또는 `useMyStudent`); 그 아래 `flex flex-col gap-4`로 `PointsCard` → `TodayHomeworkCard` → `Card title="새 영상"` `영상 수업은 곧 열려요.`(계획 5가 바꾼다).
  - `student-home/index.ts`: `StudentHomeScreen`.

- [ ] **Step 1: 실패하는 테스트 작성 — model**
  - `greeting.test.ts`: `callName("김하늘")` `하늘아`, `"이민준"` `민준아`, `"박서연"` `서연아`, `"정도윤"` `도윤아`, `"김하나"` `하나야`, `"최수"`(2자) `최수야`, `"이준"` `이준아`, `"남궁민수"` `남궁민수야`, `" 김하늘 "` `하늘아`, `"Jay"` `Jay`, `"김 하늘"` `김 하늘아`; `greeting("김하늘")` = `하늘아, 오늘도 한 문장씩!`; `greeting("")` = `오늘도 한 문장씩!`; `formatTodayLabel(new Date("2026-11-04T16:00:00Z"))` = `11월 5일 목요일`(서울은 이미 다음 날).
  - `celebration.test.ts`: `shouldCelebrate(null, 30, 29)` false, `(null, 30, 30)` true, `("[30]", 30, 45)` false, `("[30]", 50, 50)` true, `("not json", 30, 30)` true; `withCelebrated("[50]", 30)` = `"[30,50]"`, `withCelebrated("[30]", 30)` = `"[30]"`.
  - `siteContent.test.ts`: `points_goal` `50` → 50; `"50"`·`0`·`10001`·`2.5`·키 없음 → 30.
- [ ] **Step 2: 실패하는 테스트 작성 — state·screen**
  - `getMyRank`: rpc data `[]` → null, `[{ rank: 2, total: 8 }]` → 그 객체, error → throw.
  - `useGoalCelebration.test.tsx`(`celebrate` mock, `localStorage` 비우고 시작): (30, 30) → 1회 + 저장값 `[30]`; 같은 값으로 rerender → 여전히 1회; unmount 후 새로 mount → 0회 추가; `<StrictMode>` 안 mount → 1회; goal 50·points 30 → 0회, points 50 → 1회; `setItem`이 throw → 0회·오류 없음; points `undefined` 또는 goal `undefined` → 0회.
  - `StudentHomeScreen.test.tsx`(프로필 `김하늘`·반 `중등 기초반`, 합계 12, 순위 `{2, 8}`, 목표 30, `TodayHomeworkCard` mock): `하늘아, 오늘도 한 문장씩!`; `중등 기초반`; `전체 8명 중 2등`; `보상까지 18점 남았어요`; 순위 rpc 오류 → 순위 글자 없고 `보상까지 18점 남았어요`는 보임; 합계 오류 → alert 문구; `새 영상` 카드 보임. (다른 학생 정보가 없다는 보장은 Task 1의 반환 모양 검사가 맡는다.)
- [ ] **Step 3:** `npm test -- src/features/student-home src/features/site-content` → FAIL → 구현(+ `/s/page.tsx` → `StudentHomeScreen`, 자리표시 화면 삭제) → PASS.
- [ ] **Step 4:** `grep -rn "StudentPlaceholderScreen" src` 결과 없음. 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/features/student-home src/features/site-content src/app/s/page.tsx src/features/auth/index.ts src/features/auth/screen/StudentPlaceholderScreen.tsx
  git commit -m "feat(student-home): greeting with vocative rule, points progress with rank and once-per-goal celebration, today homework"
  ```

---

### Task 7: 내 정보 — 이름·반, 포인트 내역, 비밀번호 변경, 로그아웃, 홈 화면에 추가 안내

**Files:**
- Create: `src/features/auth/state/useChangePassword.ts`, `src/features/auth/components/ChangePasswordCard.tsx`, `ChangePasswordCard.test.tsx`
- Modify: `src/features/auth/index.ts`(`ChangePasswordCard` export)
- Create: `src/features/my-info/index.ts`, `screen/MyInfoScreen.tsx`, `screen/MyInfoScreen.test.tsx`, `components/InstallGuideCard.tsx`, `components/InstallGuideCard.test.tsx`
- Create: `src/app/s/me/page.tsx`

**Interfaces:**
- Consumes: `updateMyPassword`(`auth/data/student.ts`), `newPasswordSchema`·`passwordErrorMessage`(`auth/model/password.ts`), `useSignOut`(`@/core/auth`), `isStandalone`(`@/core/pwa`), `useMyProfile`(`@/features/student-shell`), `PointHistoryList`(`@/features/points` — 읽기 전용, 학생은 RLS로 본인 행만), `Card`·`Input`·`Button`·`useToast`.
- Produces:
  - `useChangePassword(): UseMutationResult<void, unknown, string>` — `gcTime: 0`, `mutationFn: updateMyPassword`. **현재 비밀번호는 묻지 않는다**(첫 로그인 변경과 같은 흐름; 이미 로그인된 기기 전제).
  - `ChangePasswordCard()` — `Card title="비밀번호 변경"`, react-hook-form + `zodResolver(newPasswordSchema)`, `Input` `새 비밀번호`·`새 비밀번호 확인`(type password, `size="lg"`, `autoComplete="new-password"`, hint `8자 이상으로 입력해 주세요.`), `Button type="submit" block` `비밀번호 바꾸기`(이 화면의 유일한 primary). 성공 → 토스트 `비밀번호를 바꿨어요.` + 폼 `reset()`; 실패 → `role="alert"` `passwordErrorMessage(e)`; 시도마다 `finally { mutation.reset() }`; pending 중 재제출 무시.
  - `InstallGuideCard()` — 마운트 뒤에만 판단(정적 내보내기 프리렌더에서 `window` 없음): `isStandalone()`이면 아무것도 안 그린다. `Card title="홈 화면에 추가하기"`, 문단 셋 그대로: `아이폰: Safari 아래쪽 공유 버튼을 누르고 '홈 화면에 추가'를 골라요.` / `안드로이드: Chrome 오른쪽 위 메뉴(⋮)를 누르고 '홈 화면에 추가' 또는 '앱 설치'를 골라요.` / `카카오톡에서 열었다면 먼저 Safari나 Chrome으로 열어 주세요.` (`Share` 아이콘을 첫 문단 옆에 aria-hidden).
  - `MyInfoScreen()` — `h1` `내 정보`; `Card`: 이름 `text-h2`, `{grade} · 아이디 {loginId}`, `반` 목록(없으면 `아직 배정된 반이 없어요.`); `Card title="포인트 내역"` 안 `PointHistoryList studentId={profile.id}`; `ChangePasswordCard`; `InstallGuideCard`; `Button variant="ghost" block` `로그아웃` → `useSignOut()`. 프로필 로딩·오류는 Task 5 화면과 같은 규칙.
  - `my-info/index.ts`: `MyInfoScreen`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `ChangePasswordCard.test.tsx`(`updateMyPassword` mock): 두 칸이 다르면 `두 비밀번호가 달라요. 같은 비밀번호를 한 번 더 입력해 주세요.`, 호출 없음; 7자 → `비밀번호는 8자 이상으로 입력해 주세요.`; 성공 → `updateMyPassword("new-pass-123")` 1회, 토스트 `비밀번호를 바꿨어요.`, 두 칸 값 `""`; `{ code: "same_password" }` reject → `지금 비밀번호와 다른 비밀번호를 입력해 주세요.`; 대기 중 두 번 제출 → 1회.
  - `InstallGuideCard.test.tsx`: `matchMedia` `matches: false` → 제목 `홈 화면에 추가하기`와 세 문단; `matches: true` → 제목 없음.
  - `MyInfoScreen.test.tsx`(프로필·`PointHistoryList`·`useSignOut` mock): `김하늘`, `중2 · 아이디 haneul`, `중등 기초반`; 반 없음 → `아직 배정된 반이 없어요.`; `포인트 내역` 카드 안에 `PointHistoryList`가 `studentId`로 그려짐; `로그아웃` 클릭 → signOut 1회; primary 버튼(`비밀번호 바꾸기`)은 하나.
- [ ] **Step 2:** `npm test -- src/features/auth src/features/my-info` → FAIL → 구현(+ `src/app/s/me/page.tsx`) → PASS.
- [ ] **Step 3:** 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/auth src/features/my-info src/app/s/me
  git commit -m "feat(my-info): student profile, points history, password change, sign-out and add-to-home-screen guide"
  ```

---

### Task 8: 끝까지 확인(390px), PWA 실제 동작, 후속 문서

**Files:**
- Create (저장소 밖): `/private/tmp/claude-502/-Users-jh-orca-projects-heesu/4cb5871e-009e-4d1f-b076-7635ccd7f4c8/scratchpad/visual/student-e2e.mjs`, `…/visual/student-pwa.mjs` (기존 `login-e2e.mjs`의 `page()`·`login()` 모양 그대로, `BASE`만 바꿈)
- Modify: `docs/superpowers/plans/v1-followups.md`
- Modify: 확인 중 드러난 결함이 있으면 그 Task의 파일(테스트 먼저)

**Interfaces:**
- Consumes: Task 1~7 전부. 시드 학생 `haneul`(김하늘, 중등 기초반, 지난 3주 수업·`missing` 판정 있음)·`minjun`.

- [ ] **Step 1: 준비** — `supabase db reset` → psql `update public.students set must_change_password = false where login_id in ('haneul','minjun');` → `npm run dev`(`:3000`, 막혀 있으면 `-p 3001`).
- [ ] **Step 2: `student-e2e.mjs` (390×844)** — 각 단계 기대 결과를 로그로 남기고 콘솔 오류 0개:
  1. `haneul`/`student-pass-1` 로그인 → `/s`; 제목 `하늘아, 오늘도 한 문장씩!`; `전체 4명 중 …등`(시드 재원 4명); `보상까지 …점 남았어요`; 탭바 `홈` `aria-current`; 스크린샷 `student-home-390.png`.
  2. `숙제` 탭 → 첫 항목에 칩 `미완료`; 판정 없는 항목의 `제출했어요` 클릭 → 즉시 `제출했어요 ·` 글자; 새로고침 뒤에도 남음; 스크린샷 `student-homework-390.png`.
  3. psql로 그 반 최근 수업 `homework`를 공백 없는 300자 문자열로 바꾼 뒤 새로고침 → `document.documentElement.scrollWidth <= 390`.
  4. `영상`·`질문` 탭 → `곧 열려요` 문구.
  5. 축하: psql(postgres) `insert into public.points (student_id, amount, reason) values ('10000000-0000-4000-8000-5ee0000000c1', 30, '(예시) 보상 확인');` → `/s` 새로고침 → `localStorage['heesu:celebrated-goals:10000000-0000-4000-8000-5ee0000000c1']` = `[30]`, confetti `canvas` 생김; 다시 새로고침 → 저장값 그대로, 새 `canvas` 없음; 문구 `보상 목표를 달성했어요! 원장님께 말씀해 주세요.`
  6. `내 정보` → `김하늘`, `중등 기초반`, 포인트 내역에 `(예시) 보상 확인 +30`; 비밀번호를 `student-pass-2`로 변경 → 토스트; `로그아웃` → `/login`; 새 비밀번호로 로그인 성공; 스크린샷 `student-me-390.png`.
  7. 권한(REST, haneul 토큰): `POST /rest/v1/rpc/my_rank` → `[{"rank":n,"total":4}]`(키 두 개뿐); `GET /rest/v1/student_point_totals?select=*` → 1행; minjun 토큰 `my_rank` → 같은 `total`.
- [ ] **Step 3: `student-pwa.mjs` (프로덕션 빌드)** — 개발 서버를 끄고 `npm run build && npx serve out -l 3000`:
  1. 로그인 → `/s` → `navigator.serviceWorker.ready` 후 `(await navigator.serviceWorker.getRegistration('/s')).scope`가 `/s`로 끝남; `GET /manifest.webmanifest` 200·JSON.
  2. 페이지가 SW 통제 상태에서 Supabase 응답은 모두 `response.fromServiceWorker() === false`(Playwright `page.on('response')`로 `127.0.0.1:56321` 응답 전부 검사).
  3. `/` 랜딩 열기 → `navigator.serviceWorker.controller === null`.
  4. `/s/homework`를 한 번 연 뒤 `context.setOffline(true)` → 새로고침 → 캐시된 화면 또는 `인터넷에 연결되지 않았어요` 문구(빈 오류 페이지 아님).
  (`serve`는 `_headers`를 적용하지 않는다 — CSP 아래 SW 등록 확인은 후속 문서의 배포 미리보기 QA 항목.)
- [ ] **Step 4: 후속 문서** — `v1-followups.md`: "student-app" 절이 있으면 그 항목을 `[x]`로(`my_rank` 규칙 → Task 1, `submit_homework` 문구 그대로 → Task 5). 새 항목: "videos-questions"에 `- /s/videos·/s/questions 자리표시(ComingSoonTabScreen)와 홈 '새 영상' 카드를 실제 화면으로 바꾼다. sw.js는 교차 출처(Storage signed URL)·Range 요청을 가로채지 않음을 유지한다.`, "guardian-records"에 `- 랜딩 관리에 points_goal(jsonb 정수 1~10000) 편집을 넣는다(학생 홈 보상 목표; 바꾸면 새 목표로 한 번 더 축하).`, "demo-deploy-qa"에 `- QA: 아이폰 Safari 홈 화면 추가 → 독립 실행·하단 safe-area·아이콘, 안드로이드 Chrome 설치; 배포 미리보기에서 CSP(worker-src·manifest-src) 아래 SW 등록·오프라인 문구 확인.`, `- QA: 학생 비밀번호 변경은 현재 비밀번호를 묻지 않는다(로그인된 기기 전제) — 누나 확인.`
- [ ] **Step 5:** 전체 검증 → PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add docs/superpowers/plans/v1-followups.md
  git commit -m "docs: student-app follow-ups for videos, landing admin and device qa"
  ```
