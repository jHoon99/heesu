# 학부모·기록(guardian-records) 구현 계획 — v1 계획 6/7

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬에서 끝까지 동작하는 학부모·기록 기능: 학부모 링크(`guardian_tokens` + 발급 RPC + anon `guardian_view` RPC, `/g#t=…` 화면, 학생 상세의 발급·재발급·복사 카드, 퇴원 시 즉시 폐기), 원장 상담 목록(새 신청 먼저, 상태·메모), 등록 안 된 상담 6개월 뒤 `pg_cron` 삭제, 랜딩 관리(`site_content` 쓰기, `points_goal` 포함), 결제 월별 표(학생 × 월 수기 입력, 학생 상세 결제 기록), S12 감사 트리거 6개 테이블 전부 연결, guardian-records 후속 항목.

**Architecture:** 권한은 전부 DB가 막는다. 학부모 토큰은 DB가 만든다: 원장(aal2)만 부를 수 있는 `security definer` RPC `issue_guardian_token`이 32바이트 난수를 base64url 원문으로 한 번만 돌려주고, 테이블에는 SHA-256 해시만 남기며, 같은 학생의 이전 토큰을 같은 트랜잭션에서 폐기한다(S7). 브라우저(anon)는 테이블을 읽지 못하고 `volatile security definer` RPC `guardian_view(p_token)` 하나만 POST로 부르며, 함수는 형식·해시·만료·폐기·퇴원을 한곳에서 검사하고 실패 원인을 구분하지 않는 한 문구로 거절한다. Edge Function은 쓰지 않는다(service_role이 필요 없다). 프론트는 아키텍처 §4 기능 목록대로 `features/guardian`(학부모 화면 + 원장 링크 카드)·`features/payments`를 새로 만들고, 상담 관리는 `features/consultations`, 랜딩 관리는 `features/site-content`에 원장 전용 폴더(`components/admin/**`, `screen/Admin*`)로 더한다. 학생 상세는 `@/features/guardian`·`@/features/payments`의 index에서 카드만 가져온다(역방향 import 없음 — 순환 금지).

**Tech Stack:** Next.js 16.4.4 (static export) · React 19.3 · Tailwind v4 · TanStack Query 5 · react-hook-form 7 + zod 4 · supabase-js 2.118 · date-fns · Supabase CLI 2.121 (Postgres 17, `pgcrypto`는 `extensions` 스키마, `pg_cron` 1.6.4 사용 가능·preload됨) · pgTAP · Vitest · Playwright(scratch, Google Chrome 채널). **새 npm 의존성 없음.**

**Spec:** `docs/superpowers/specs/2026-11-04-heesu-v1-features-design.md` (§2 `/g`, §4 학생 상세·상담·결제·랜딩 관리, §6 학부모 화면, §7 `student_private`·`consultations`·`payments`·`guardian_tokens`·`site_content`·`consents`·감사 로그, §10 항목 6, §11 보상 목표·빼는 순서·퇴원·법정대리인 동의·미등록 상담 삭제) · 구조·보안 `docs/superpowers/specs/2026-11-03-heesu-architecture-design.md` (§4 폴더·의존 규칙, §6 학부모 링크, §7 `pg_cron`, §10 TDD 대상 "학부모 토큰 RPC", §13 S1·S2·S3·S6·S7·S9·S10·S12·S14) · 규칙 `AGENTS.md` · 형식 `docs/superpowers/plans/2026-11-07-videos-questions.md`, 원장 화면 패턴 `docs/superpowers/plans/2026-11-06-class-ops.md` · 후속 항목 `docs/superpowers/plans/v1-followups.md`("guardian-records" 세 묶음), `docs/superpowers/plans/foundation-followups.md`("Guardian / storage plans", Cloud checklist의 pg_cron 줄)

## Global Constraints

- 정적 내보내기: Route Handler·Server Action·middleware·`next/image` 최적화 금지. 새 주소는 `src/app/g/page.tsx` 하나. `/admin/consultations`·`/admin/payments`·`/admin/site`는 이미 있는 page의 `ComingSoonScreen`을 바꾼다. `useSearchParams`를 쓰는 화면은 page에서 `<Suspense>`.
- 의존 규칙: `app → features → core, design-system`; `features/A`는 `features/B/index.ts`로만, 순환 금지(`guardian`·`payments`는 `students`를 import하지 않는다 — 학생 이름이 필요하면 자기 `data/`에서 `students`를 읽는다). `@supabase/supabase-js`는 `src/core/supabase/**`, `src/features/*/data/**`에서만. ESLint `ADMIN_UI_FILES`에 새 원장 UI 경로를 더한다: `src/features/guardian/components/admin/**`, `src/features/consultations/components/admin/**`, `src/features/consultations/screen/Admin*`, `src/features/site-content/components/admin/**`, `src/features/site-content/screen/Admin*`, `src/features/payments/**`.
- 원장 화면: 등장 모션 없음, `bg-bg-admin`, 컨트롤 40px(`size="md"`), 제목 `font-serif text-h2`, 카드 `Card tone="raised"`, 표 행 `h-10 text-table`, primary 버튼은 화면에 하나(카드마다 저장은 `secondary`; Modal 안의 확정 버튼은 primary 허용), 꿀색(`points`) 금지. 학부모 화면 `/g`: 390px 기준, `bg-bg-page`, 본문 `text-body`, 명조는 제목 하나만(`font-serif text-h2`), 모션 없음, 버튼 `size="lg"`. 토큰만(`src/test/no-raw-colors.test.ts`), 이모지 금지.
- 고정 값:
  - 토큰 원문 = `extensions.gen_random_bytes(32)`의 base64url, 패딩 없음 → 43자, `GUARDIAN_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/`(SQL `'^[A-Za-z0-9_-]{43}$'`). 저장 = `token_hash bytea = pg_catalog.sha256(convert_to(token, 'UTF8'))`, 원문은 어디에도 저장·로그하지 않는다. 만료 `now() + interval '90 days'`. 학생당 살아 있는(`revoked_at is null`) 토큰은 최대 1개.
  - 링크 = `${window.location.origin}/g#t=${token}`(fragment만. 쿼리·경로 금지). 원장이 보는 환경의 주소를 쓴다(미리보기 DB와 링크 주소가 어긋나지 않게).
  - 실패 문구(없음·틀림·만료·폐기·퇴원·형식 오류 모두 같음, DB `raise`와 화면 상수 둘 다): `링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.`
  - `guardian_view` 기간(서울 기준 `today := (now() at time zone 'Asia/Seoul')::date`): 출결·숙제 기록 = `today - 27` ~ `today`(오늘 포함 28일), 날짜 내림차순. 이번 주 = `date_trunc('week', today)::date`(월요일) ~ `today`, 날짜 오름차순. 미래 날짜 수업은 넣지 않는다. 반에 배정된 날(`class_members.created_at`의 서울 날짜)보다 앞선 수업은 그 학생의 출결·숙제 행이 있을 때만 넣는다.
  - 상담 삭제: `pg_cron` 작업 이름 `purge-stale-consultations`, 일정 `'0 18 * * *'`(UTC = 매일 03:00 KST), 대상 `status <> 'enrolled' and created_at < now() - interval '6 months'`(`/privacy` 문구 "등록으로 이어지지 않으면 신청일로부터 6개월 뒤 파기"와 같게).
  - 상담 상태 글자: `new` 새 신청 · `contacted` 연락함 · `enrolled` 등록 · `on_hold` 보류. 메모 ≤ 2000자(DB 기존 check).
  - `site_content` 키 = `notice, classes, tuition, contact, legal, points_goal`(모양은 `20261105000000_site_content.sql` 머리 주석 그대로: DB는 snake_case, TS는 camelCase). `points_goal` = JSON 정수 1~10000(기본 30). 반·시간표 표시 목록 ≤ 10개, 정원 빈칸 또는 1~50. 전화번호 `^0\d{1,2}-\d{3,4}-\d{4}$`. 값 하나의 JSON 텍스트 ≤ 8192바이트.
  - 결제: `month` 텍스트 `YYYY-MM`(`^[0-9]{4}-(0[1-9]|1[0-2])$`), `amount` 정수 0~10,000,000(원), `paid_at date` 빈칸 = 미납, `memo` ≤ 200자 한 줄, `(student_id, month)` 하나. 표 = 끝 달(기본 이번 달, 브라우저 로컬) 포함 6개월.
  - 날짜 표시: 날짜 `formatShortDate` + `dayLabelOf`(`@/features/sessions`) → `11/4(화)`, 일시 `yyyy.MM.dd HH:mm`, 금액 `toLocaleString("ko-KR")` + `원`.
- DB: 새 정책은 `to authenticated` + `(select private.is_admin())`. 새 함수는 `revoke all … from public, anon, authenticated, service_role` 후 필요한 것만 grant, `set search_path = ''`, 객체는 `schema.name`으로, `00_meta.test.sql` 허용 목록 갱신. 테이블마다 `revoke all … from anon, authenticated, service_role` 후 명시 grant(컬럼 단위 우선). 클라이언트에 보이는 `raise exception`은 "-해요" + 고치는 방법. 감사 대상(spec §7: `students`, `student_private`, `guardian_tokens`, `consultations`, `consents`, `payments`)은 `after insert or update or delete … for each row execute function private.audit(…)`. pgTAP 파일은 세는 테이블을 먼저 `delete from`하고 시드에 없는 uuid(파일 번호 접미사 `…013`·`…014`·`…015`·`…016`)를 쓴다. 이미 적용된 마이그레이션 파일은 고치지 않는다(주석 포함) — 새 파일로만.
- 저장 규칙: update·upsert·delete는 `.select(...)`를 붙여 0행이면 `SaveNotAppliedError`, 화면 문구는 `saveErrorMessage(e)`. 수정 화면·모달의 원본 조회는 `refetchOnMount: "always"` + `isFetchedAfterMount` 뒤 렌더. 전체 오류 화면은 `isError && data === undefined`일 때만. 비밀 값을 돌려받는 mutation(`issue_guardian_token`)은 `gcTime: 0`, 성공 직후 `reset()`, 원문 링크는 그 카드의 `useState`에만(ref·쿼리 캐시·storage·로그 금지). 사용자 글(상담 내용·메모·랜딩 문구)은 일반 텍스트로만(`whitespace-pre-line break-words`, 부모 `min-w-0`).
- 로컬: API `http://127.0.0.1:56321`, DB `postgresql://postgres:postgres@127.0.0.1:56322/postgres`, 셸마다 `export PATH="$HOME/.orbstack/bin:$PATH"`. 마이그레이션 `supabase db reset`, 타입 `npm run db:types`로만. 개발 서버 `:3000`(막혀 있으면 `npm run dev -- -p 3001`). Edge Function은 이 계획에서 부르지 않는다.
- 클라우드에는 아무것도 적용·배포하지 않는다(계획 7).
- 각 Task 끝 전체 검증: `npm run typecheck && npm run lint && npm test && npm run fn:check && npm run db:test && npm run build`. 커밋은 Conventional Commits, push 금지. **`git add -A` 대신 그 Task의 Files 목록만 `git add`한다.**
- 빼는 순서(spec §11): 시간이 모자라면 Task 10 → 9(결제) → 8 → 7(랜딩 관리, 시드로 대신) 순으로 뺀다. Task 1~3(학부모 링크)은 반드시. 뺀 Task는 Task 11 Step 5에서 후속 문서에 적는다.

## Review Focus

1. **카톡 인앱 브라우저에서 링크를 열고, 새로고침하고, 주소를 복사해 남에게 넘기는 경우** → 토큰은 fragment로만 오가고(요청 URL·Referer에 없음), 화면이 뜨면 주소창에서 바로 지워지며, 같은 탭 새로고침은 그대로 보이고, 지워진 주소(`/g`)를 넘겨받은 사람은 실패 문구만 본다. → Task 2 `useGuardianToken` 테스트, Task 11 Step 2 요청 URL 검사.
2. **토큰이 틀리거나 만료·폐기·퇴원이거나 형식이 이상한 경우**(빈 값, 42·44자, `%20`이 붙음, 한 글자 바꿈, 1만 자) → 원인과 상관없이 같은 문구, 서버는 해시 계산 전에 형식부터 거절, GET으로는 못 부른다. → Task 1 pgTAP 실패 표, Task 2 `readTokenFromHash` 표, Task 11 GET 4xx.
3. **원장이 "링크 만들기"를 두 번 누르거나 두 탭에서 동시에 재발급하는 경우** → 살아 있는 토큰은 정확히 하나이고 마지막으로 받은 링크만 열린다, 요청은 한 번. → Task 1 pgTAP(연속 발급 → 활성 1행, partial unique index + advisory lock), Task 3 `GuardianLinkCard` 대기 중 두 번 클릭 테스트.
4. **날짜 경계**(서울 자정 직후, 월요일, 28일째·29일째 수업, 미래 수업, 반 배정 전 수업) → 서울 날짜로 자르고 `today-27`은 넣고 `today-28`·미래는 뺀다, 배정 전 수업은 행이 있을 때만. → Task 1 pgTAP 기간 표, Task 6 숙제 배정일 테스트.
5. **원장의 입력 실수·긴 글**(공백 없는 500자 공지, 빈 반 이름, `010-1234`, 목표 `0`·`1.5`, 금액 `250,000`·`-1`·`1e7`, 제어 문자) → zod와 DB가 같은 규칙으로 거부하고, 저장된 긴 글은 랜딩 390px·원장 1024px에서 가로로 넘치지 않는다. → Task 7·9 pgTAP, Task 8·10 폼 테스트, Task 8 `break-words` 테스트, Task 11 `scrollWidth`.

---

### Task 1: DB — `guardian_tokens`, `issue_guardian_token`, `guardian_view`, 퇴원 시 폐기, 감사 목록 메타 테스트

**Files:**
- Create: `supabase/migrations/20261110000000_guardian.sql`, `supabase/tests/13_guardian.test.sql`
- Modify: `supabase/tests/00_meta.test.sql`, `src/core/supabase/database.types.ts` (`npm run db:types`)

**Interfaces:**
- Consumes: `private.is_admin()`, `private.audit()`, `public.students`(status), `public.class_members`(created_at), `public.sessions`, `public.attendance`, `public.homework_checks`, `public.points`, `public.classes`, `extensions.gen_random_bytes`.
- Produces (DB):
  - `public.guardian_tokens (id uuid pk default gen_random_uuid(), student_id uuid not null references public.students on delete cascade, token_hash bytea not null unique check (octet_length(token_hash) = 32), created_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz, check (expires_at > created_at))` + `create unique index guardian_tokens_one_active on public.guardian_tokens (student_id) where revoked_at is null`.
  - 권한: 테이블 전부 회수 뒤 `grant select (id, student_id, created_at, expires_at, revoked_at) on public.guardian_tokens to authenticated`(`token_hash`는 아무에게도 안 보임, 쓰기 권한 없음 — 쓰기는 아래 함수만). 정책 `guardian_tokens_admin_select`(`(select private.is_admin())`).
  - 감사: `guardian_tokens_audit` → `private.audit()`.
  - `public.issue_guardian_token(p_student_id uuid) returns text` — plpgsql `security definer set search_path = ''`. 순서: 원장 아님 → `'원장 계정으로 다시 로그인해 주세요.'`; `pg_advisory_xact_lock(hashtext('guardian:' || p_student_id))`; 학생 없음 → `'학생을 찾을 수 없어요. 목록에서 다시 골라 주세요.'`; `status = 'left'` → `'퇴원한 학생은 학부모 링크를 만들 수 없어요. 학생 상태를 먼저 바꿔 주세요.'`; 살아 있는 토큰 `revoked_at = now()`; 새 원문 `rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=')`, 해시 insert(`expires_at = now() + interval '90 days'`); 원문 반환. `grant execute … to authenticated`.
  - `public.guardian_view(p_token text) returns jsonb` — plpgsql **volatile**(PostgREST가 GET을 받지 않게) `security definer set search_path = ''`. `p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$'` → 실패 문구; 해시가 같고 `revoked_at is null and expires_at > now()`이고 학생 `status <> 'left'`인 행이 없으면 → 같은 실패 문구. 반환(키는 이것뿐):
    ```json
    { "name": "김하늘", "today": "2026-11-04", "total_points": 12,
      "records": [{ "date": "2026-11-04", "class_name": "중등 기초반", "attendance": "present", "homework": "done" }],
      "week": [{ "date": "2026-11-03", "class_name": "중등 기초반", "summary": "…", "homework": "…", "homework_due": "2026-11-06" }] }
    ```
    기록 대상 수업 = (지금 소속 반의 수업 중 `date >= 배정 서울 날짜`) ∪ (그 학생의 `attendance`나 `homework_checks` 행이 있는 수업), 기간은 Global Constraints. 행이 없는 칸은 `"none"`. `records`·`week`는 비면 `[]`. `total_points = coalesce(sum(points.amount), 0)`. `grant execute … to anon, authenticated`(원장이 같은 브라우저에서 열어도 되게).
  - 퇴원 폐기: `private.revoke_guardian_tokens_on_leave()` security definer 트리거 함수(`update public.guardian_tokens set revoked_at = now() where student_id = new.id and revoked_at is null`), `create trigger students_revoke_guardian_tokens after update of status on public.students for each row when (new.status = 'left' and old.status <> 'left') execute function …`. 회수: `revoke all … from public, anon, authenticated, service_role`.
  - 머리 주석: 공개 저장소 전제, 검사 파일, "security definer인 이유: 원장도 guardian_tokens에 직접 쓰지 못한다(원문이 클라이언트 쓰기 경로에 끼지 않게). 발급·폐기와 학부모 조회 검사(형식·해시·만료·폐기·퇴원)를 이 함수들이 한곳에서 지킨다.", "속도 제한 없음: 토큰은 256비트 난수라 추측할 수 없고, 반복 호출은 Supabase 사용량 알림(S14)으로 본다."
- Produces (TS 타입): `guardian_tokens` Row, `Functions.issue_guardian_token`, `Functions.guardian_view`.

- [ ] **Step 0: 전제 확인** — `supabase db reset` 후 psql: `select extensions.gen_random_bytes(1)`, `select pg_catalog.sha256('x'::bytea)`가 동작하는지. 안 되면 멈추고 보고한다.
- [ ] **Step 1: 실패하는 테스트 작성 — `13_guardian.test.sql`** (postgres로 준비: `delete from public.guardian_tokens; delete from public.points; delete from public.attendance; delete from public.homework_checks; delete from public.sessions; delete from public.class_members; delete from public.classes; delete from public.students;`. auth.users 원장 `…a013`(admins), 학생 A `…c013`, B `…d013`, 아무나 `…b013`. 반 X `20000000-0000-4000-8000-00000000a013`(A·B 배정, `created_at = now() - interval '60 days'`), 반 Y `…b013`(A 배정 `created_at = now()`). `t := (now() at time zone 'Asia/Seoul')::date`. X 수업: `t`(summary `'(가짜) 현재완료'`, homework `'(가짜) 단어 20개'`), `t-10`, `t-27`, `t-28`, `t+1`. Y 수업: `t-5`(A 행 없음). A 출결·숙제: `t` present/done, `t-10` late/missing; B: `t` absent. 수동 포인트 A +2(`'(가짜) 발표'`). 원문은 `set_config('test.tok1', public.issue_guardian_token(A), true)`로 받아 `current_setting('test.tok1')`로 쓴다.)
  - 권한 표: `table_privs_are` anon·service_role·authenticated 모두 `'{}'`; `column_privs_are('public','guardian_tokens','token_hash','authenticated','{}')`, `expires_at` `{SELECT}`. 원장 aal2 `select token_hash …` → `42501`; insert·update·delete → `42501`.
  - 발급: 원장 aal2 → 원문 `~ '^[A-Za-z0-9_-]{43}$'`; postgres로 `token_hash = sha256(convert_to(tok1,'UTF8'))`인 행 1개, `expires_at`이 `now() + 89 days`와 `now() + 91 days` 사이. 다시 발급(tok2) → tok1 행 `revoked_at is not null`, `revoked_at is null` 행 1개. 원장 select → 2행(해시 제외 컬럼).
  - 발급 거절: A·아무나·원장 aal1 → `P0001` `'원장 계정으로 다시 로그인해 주세요.'`; anon → `42501`; 없는 uuid → `'학생을 찾을 수 없어요. 목록에서 다시 골라 주세요.'`.
  - 조회(anon, tok2): 키 집합 `{name,records,today,total_points,week}`; `name` A 이름; `total_points` = 3(자동 1 + 수동 2); `records` 날짜 = `[t, t-10, t-27]`(내림차순, `t-28`·`t+1`·Y `t-5` 없음); `records[0]` attendance `present`·homework `done`, `t-27` 칸 `none`/`none`; 어떤 칸에도 `absent` 없음(B 값 안 섞임); `week` = `[t]` 하나, summary·homework 글자 그대로. 학교·연락처 키 없음.
  - 조회 실패(모두 `P0001`, 같은 문구 `'링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.'`): tok1(폐기), `null`, `''`, 42자, 44자, tok2 || `'%20'`, tok2의 첫 글자만 바꾼 값, `repeat('a', 10000)`; postgres로 tok2 `expires_at = now() - interval '1 second'` → 실패, 되돌림.
  - authenticated(B)로 tok2 → 성공(토큰만으로 판단).
  - 퇴원: 원장 aal2 `update public.students set status = 'left' where id = A` → postgres로 A의 활성 토큰 0개, tok2 → 실패 문구; 발급 → `'퇴원한 학생은 학부모 링크를 만들 수 없어요. 학생 상태를 먼저 바꿔 주세요.'`.
  - 감사: `private.audit_log`에 `public.guardian_tokens` INSERT 2·UPDATE ≥ 2행, actor = 원장(발급), 퇴원 폐기 UPDATE도 남는다.
  - 함수 모양: `is_definer` 둘 다; `select provolatile from pg_proc where proname = 'guardian_view'` = `'v'`; `function_privs_are` guardian_view anon `{EXECUTE}`·authenticated `{EXECUTE}`·service_role `'{}'`, issue_guardian_token anon·service_role `'{}'`·authenticated `{EXECUTE}`.
- [ ] **Step 2: 실패하는 테스트 작성 — `00_meta.test.sql`**: anon public 목록 `'{guardian_view}'`; authenticated public 목록 `'{guardian_view,issue_guardian_token,my_rank,my_role,password_changed,save_video_progress,submit_homework}'`; 새 검사 하나(`plan(20)`) — S12 감사 트리거가 달린 public 테이블 = `'{consents,consultations,guardian_tokens,student_private,students}'::text[]`(`pg_trigger` ⋈ `pg_proc` where `proname = 'audit'` and 함수 스키마 `private`, `not tgisinternal`, `array_agg(distinct relname order by relname)`). 머리 주석의 "(예: guardian_view 추가 시 …)" 줄은 지운다.
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 13·00 FAIL.
- [ ] **Step 4: 구현** — Interfaces 그대로.
- [ ] **Step 5:** `supabase db reset && npm run db:test` → PASS. `npm run db:types` 후 `grep -c "guardian_view" src/core/supabase/database.types.ts` ≥ 1.
- [ ] **Step 6:** 전체 검증 → PASS.
- [ ] **Step 7: Commit**
  ```bash
  git add supabase/migrations/20261110000000_guardian.sql supabase/tests/13_guardian.test.sql supabase/tests/00_meta.test.sql src/core/supabase/database.types.ts
  git commit -m "feat(db): hashed guardian tokens with admin-only issue rpc, anon guardian_view and revoke on leave"
  ```

---

### Task 2: 학부모 화면 `/g` — fragment 토큰, 주소창 지우기, 4주 기록

**Files:**
- Create: `src/features/guardian/model/guardian.ts`, `model/guardian.test.ts`, `data/guardian.ts`, `data/guardian.test.ts`, `state/useGuardian.ts`, `state/useGuardianToken.ts`, `state/useGuardianToken.test.tsx`, `components/GuardianRecordView.tsx`, `screen/GuardianScreen.tsx`, `screen/GuardianScreen.test.tsx`, `index.ts`, `src/app/g/page.tsx`, `src/test/guardian-page.test.ts`

**Interfaces:**
- Consumes: Task 1 RPC `guardian_view`, `supabase`(`@/core/supabase/client`), `classifyError`, `formatShortDate`·`dayLabelOf`(`@/features/sessions`), `StatusChip`·`Card`·`Button`(`@/design-system`), 타입 `Attendance`·`Homework`(design-system).
- Produces:
  - model: `GUARDIAN_TOKEN_RE`; `GUARDIAN_LINK_ERROR = "링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요."`; `readTokenFromHash(hash: string): string | null`(`new URLSearchParams(hash.replace(/^#/, "")).get("t")`가 `GUARDIAN_TOKEN_RE`에 맞을 때만); `guardianUrl(origin: string, token: string): string`; `type GuardianRecord = { date: string; className: string; attendance: Attendance; homework: Homework }`; `type GuardianWeekSession = { date: string; className: string; summary: string | null; homework: string | null; homeworkDue: string | null }`; `type GuardianView = { name: string; today: string; totalPoints: number; records: GuardianRecord[]; week: GuardianWeekSession[] }`; `parseGuardianView(raw: unknown): GuardianView`(zod, snake → camel, 모양이 다르면 throw); `isGuardianLinkError(e: unknown): boolean`(`code === "P0001"`).
  - data: `getGuardianView(token: string): Promise<GuardianView>` — `supabase.rpc("guardian_view", { p_token: token })`(기본 POST, `{ get: true }` 쓰지 않음).
  - state: `guardianKeys = { all: ["guardian"] as const, view: ["guardian", "view"] as const, status: (studentId: string) => ["guardian", "status", studentId] as const }`(키에 토큰을 넣지 않는다); `useGuardianView(token: string | null)` — `enabled: token !== null`, `retry: (n, e) => !isGuardianLinkError(e) && n < 2`, `refetchOnWindowFocus: false`.
  - `useGuardianToken(): { token: string | null; ready: boolean; forget: () => void }` — 마운트 때 한 번: `readTokenFromHash(location.hash)`가 있으면 `sessionStorage["hs-guardian-token"]`에 넣고 `history.replaceState(history.state, "", location.pathname + location.search)`로 fragment를 지운다(fragment가 있으면 형식이 틀려도 지운다); 없으면 `sessionStorage` 값(형식 검사)을 쓴다. `forget()`은 storage 값을 지우고 token을 null로.
  - `GuardianRecordView({ view }: { view: GuardianView })` — h1 `{name} 학생의 학습 기록`(`font-serif text-h2`), 아래 `{formatShortDate(today)}({dayLabelOf(today)}) 기준`; `Card` `누적 포인트` → `{n}점`(`text-number-xl`); `Card` `이번 주 수업` → 수업마다 `{11/4(화)} · {반}`, `수업 내용`·`숙제` 라벨과 글(없으면 그 줄 생략), `마감 {11/6(목)}`; 0개 `이번 주에는 아직 수업 기록이 없어요.`; `Card` `최근 4주 출결·숙제` → 행마다 날짜·반 + `StatusChip`(출결, `ariaLabel="출결"`) + `StatusChip`(숙제, `ariaLabel="숙제"`); 0개 `최근 4주 동안 수업 기록이 없어요.`; 아래 `text-caption text-text-muted` 두 줄 `이 링크를 가진 사람은 누구나 이 화면을 볼 수 있어요. 다른 사람에게 보내지 말아 주세요.`, `궁금한 점은 학원에 문의해 주세요.`. 모든 글 부모 `min-w-0`, 글 `whitespace-pre-line break-words`.
  - `GuardianScreen()` — `ready` 전: 빈 화면(`aria-busy`); 토큰 없음 → `GUARDIAN_LINK_ERROR`(`role="alert"`); 로딩 `불러오는 중이에요.`; `isGuardianLinkError` → `forget()` 후 `GUARDIAN_LINK_ERROR`; 그 밖 오류(데이터 없을 때) → `classifyError(e).message` + `Button size="lg" variant="secondary"` `다시 불러오기`(refetch); 성공 → `GuardianRecordView`. 화면 틀 `mx-auto min-h-dvh max-w-[480px] bg-bg-page px-5 py-8`.
  - `src/app/g/page.tsx`: `export const metadata: Metadata = { title: "학습 기록", robots: { index: false, follow: false }, referrer: "no-referrer" }`, `<GuardianScreen />`. (`public/_headers`의 `/g` 블록·`robots.txt`는 이미 있다 — 고치지 않는다.)
  - index: `GuardianScreen`, `guardianKeys`(Task 3이 `GuardianLinkCard`를 더한다).

- [ ] **Step 1: 실패하는 테스트 작성**
  - `guardian.test.ts`: `readTokenFromHash` 표 — `#t=<43자>` → 그 값; `#x=1&t=<43자>` → 그 값; `""`·`#`·`#t=`·`#t=<42자>`·`#t=<44자>`·`#t=<43자>%20`·`#t=<43자 중 하나 '*'>` → null. `guardianUrl("https://heesu.pages.dev", tok)` = `https://heesu.pages.dev/g#t=<tok>`(쿼리 없음). `parseGuardianView` snake→camel, `homework_due: null` 유지, `attendance: "weird"` → throw. `isGuardianLinkError({ code: "P0001" })` true, `{ code: "42501" }`·`TypeError` false.
  - `guardian.test.ts`(data): `getGuardianView("tok")` → `rpc` 인자 `("guardian_view", { p_token: "tok" })`, 세 번째 인자 없음.
  - `useGuardianToken.test.tsx`: `history.replaceState(null, "", "/g#t=<tok>")` 뒤 마운트 → token = tok, `location.hash === ""`, `location.pathname === "/g"`, `sessionStorage["hs-guardian-token"] === tok`; 그다음 fragment 없이 다시 마운트(새로고침) → token = tok; `forget()` → storage 비고 token null; `/g#t=bad` → token null, hash 지워짐; storage에 형식 틀린 값 → null.
  - `GuardianScreen.test.tsx`(hook mock): 토큰 없음 → 실패 문구; rpc reject `{ code: "P0001", message: "…" }` → 실패 문구 + `forget` 1회 호출; `TypeError("Failed to fetch")` → `네트워크 상태를 확인해 주세요.` + `다시 불러오기` 클릭 시 refetch; 성공 → `김하늘 학생의 학습 기록`, `12점`, `이번 주` 0개 문구, 기록 행 `출결 출석`·`숙제 완료` 접근 이름, 공백 없는 2000자 summary 요소에 `break-words` 클래스.
  - `src/test/guardian-page.test.ts`: `import { metadata } from "@/app/g/page"` → `robots`가 `{ index: false, follow: false }`, `referrer === "no-referrer"`.
- [ ] **Step 2:** `npm test -- src/features/guardian src/test/guardian-page.test.ts` → FAIL → 구현 → PASS.
- [ ] **Step 3:** `npm run build` 후 `ls out/g.html` 존재, `grep -c 'noindex' out/g.html` ≥ 1, `grep -c 'no-referrer' out/g.html` ≥ 1. 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/guardian src/app/g src/test/guardian-page.test.ts
  git commit -m "feat(guardian): /g page reads the token from the fragment only, clears it and shows four weeks of records"
  ```

---

### Task 3: 학생 상세 — 학부모 링크 만들기·다시 만들기·복사, 퇴원 시 숨김

**Files:**
- Create: `src/features/guardian/components/admin/GuardianLinkCard.tsx`, `components/admin/GuardianLinkCard.test.tsx`
- Modify: `src/features/guardian/data/guardian.ts`, `data/guardian.test.ts`, `state/useGuardian.ts`, `src/features/guardian/index.ts`, `src/features/students/screen/StudentDetailScreen.tsx`, `src/features/students/screen/StudentDetailScreen.test.tsx`, `src/features/students/state/useStudents.ts`, `src/features/students/state/invalidation.test.tsx`, `eslint.config.mjs`(`ADMIN_UI_FILES`에 `src/features/guardian/components/admin/**`)

**Interfaces:**
- Consumes: Task 1 RPC `issue_guardian_token`·`guardian_tokens` 컬럼 select, Task 2 `guardianKeys`·`guardianUrl`, `SaveNotAppliedError`, `classifyError`, `Card`·`Button`·`Input`·`Modal`·`useToast`, date-fns `format`.
- Produces:
  - data: `issueGuardianToken(studentId: string): Promise<string>`(`rpc("issue_guardian_token", { p_student_id })`, 결과가 문자열이 아니면 `SaveNotAppliedError`); `getGuardianLinkStatus(studentId: string): Promise<{ createdAt: string; expiresAt: string } | null>`(`from("guardian_tokens").select("created_at, expires_at").eq("student_id", id).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle()`).
  - state: `useGuardianLinkStatus(studentId)`(`refetchOnMount: "always"`), `useIssueGuardianToken(studentId)` — `gcTime: 0`, `onSettled`에서 `guardianKeys.status(studentId)` invalidate. 카드는 `mutateAsync` 결과로 URL을 `useState`에 넣고 곧바로 `mutation.reset()`.
  - `GuardianLinkCard({ studentId, left }: { studentId: string; left: boolean })` — `Card tone="raised" title="학부모 링크"`:
    - 상태 줄: 활성 → `{yyyy.MM.dd} 만듦 · {yyyy.MM.dd}까지 열려요.`; 없음 → `아직 만든 링크가 없어요. 링크를 만들어 학부모님께 카톡으로 보내 주세요.`; `left` → `퇴원한 학생은 학부모 링크를 만들 수 없어요.`(버튼 없음).
    - 버튼(`secondary`, `size="md"`): 없음 → `링크 만들기`(바로 발급); 활성 → `새 링크 만들기` → `Modal title="새 링크를 만들까요?"` 본문 `새 링크를 만들면 지금 보낸 링크는 바로 열리지 않아요.`, footer `취소`·`새 링크 만들기`(primary). 대기 중 버튼 `disabled`, 두 번 눌러도 요청 1번.
    - 발급 뒤: `Input size="md" label="학부모 링크" readOnly value={url}`(focus 시 전체 선택) + `Button` `링크 복사` → `navigator.clipboard.writeText(url)` 성공 토스트 `링크를 복사했어요. 카톡으로 보내 주세요.`, 실패 토스트(danger) `복사하지 못했어요. 링크 칸을 눌러 직접 복사해 주세요.`; 안내 `text-caption text-text-muted` `이 링크는 지금만 보여요. 화면을 떠나면 다시 볼 수 없으니, 잃어버리면 새 링크를 만들어 주세요.`
    - 발급 실패 → 토스트 `classifyError(e).message`(P0001 문구 그대로).
  - `StudentDetailScreen`: `GuardianCard` 바로 아래 `<GuardianLinkCard studentId={id} left={student.status === "left"} />`.
  - `invalidateStudentViews`(students state)는 `["guardian"]`도 invalidate(글자로 — 순환 금지, 퇴원으로 바뀐 토큰 상태를 다시 읽는다).
  - index: `GuardianLinkCard` 추가.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `guardian.test.ts`: `issueGuardianToken` rpc 인자 `{ p_student_id: "s1" }`, `data: null` → `SaveNotAppliedError`; `getGuardianLinkStatus`가 `revoked_at` is null·`expires_at` gt 필터를 건다, 행 없음 → null.
  - `GuardianLinkCard.test.tsx`(data mock, `navigator.clipboard` stub): 상태 없음 → 없음 문구·`링크 만들기`; 클릭 → `Input` 값이 `${location.origin}/g#t=<tok>`; 대기 중 두 번 클릭 → rpc 1회; `링크 복사` → `writeText` 인자 = URL, 성공 토스트; `writeText` reject → 실패 토스트; 활성 상태 → `2026.11.04 만듦 · 2027.02.02까지 열려요.`, `새 링크 만들기` → Modal 문구, `취소` → rpc 0회, 확정 → 1회; `left` → 퇴원 문구, 버튼 없음; reject `{ code: "P0001", message: "퇴원한 학생은 …" }` → 그 문구 토스트; 발급 뒤 쿼리 캐시(`queryClient.getMutationCache().getAll()`)에 원문이 남지 않는다.
  - `StudentDetailScreen.test.tsx`: `학부모 링크` 카드가 그려진다(퇴원 학생이면 퇴원 문구).
  - `invalidation.test.tsx`: 학생 수정 성공 → `["guardian"]` invalidate.
- [ ] **Step 2:** `npm test -- src/features/guardian src/features/students` → FAIL → 구현 → PASS.
- [ ] **Step 3:** 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/guardian src/features/students/screen/StudentDetailScreen.tsx src/features/students/screen/StudentDetailScreen.test.tsx src/features/students/state/useStudents.ts src/features/students/state/invalidation.test.tsx eslint.config.mjs
  git commit -m "feat(guardian): issue, reissue and copy the guardian link from the student detail"
  ```

---

### Task 4: DB — 미등록 상담 6개월 삭제(`pg_cron`), 상담·반 권한 좁히기, 로컬 시드 상담

**Files:**
- Create: `supabase/migrations/20261110000100_consultations_retention.sql`, `supabase/tests/14_consultations_retention.test.sql`
- Modify: `supabase/seed.sql`, `supabase/tests/03_consultations.test.sql`(권한 표만), `supabase/tests/05_classes.test.sql`(권한 표만), `src/core/supabase/database.types.ts`

**Interfaces:**
- Consumes: `public.consultations`, `consultations_audit` 트리거, `public.classes`.
- Produces (DB):
  - `create extension if not exists pg_cron;`(Step 0 결과에 따라 `with schema pg_catalog` 여부를 정한다).
  - `private.purge_stale_consultations() returns int` — sql/plpgsql invoker, `delete from public.consultations where status <> 'enrolled' and created_at < now() - interval '6 months'`, 지운 행 수 반환. `revoke all … from public, anon, authenticated, service_role`(소유자 postgres와 cron만 부른다).
  - `select cron.schedule('purge-stale-consultations', '0 18 * * *', $$select private.purge_stale_consultations()$$);`(이름이 같으면 덮어써서 다시 적용해도 하나).
  - 권한: `revoke update on public.consultations from authenticated; grant update (status, memo) on public.consultations to authenticated;` · `revoke insert on public.classes from authenticated; grant insert (name, level, schedule, capacity) on public.classes to authenticated;`(앱 `createClass` payload와 같다).
  - 머리 주석: `/privacy` 약속, 감사 로그에 actor null DELETE로 남는다는 것, 클라우드 Free에서도 `pg_cron`이 켜지는지 계획 7에서 확인.
  - 시드: `consultations` 가짜 2건 — `('(가짜) 박보호', '010-0000-0091', '중2', '(예시) 주말반이 있나요?', 'new', now() - interval '1 day')`, `('(가짜) 최보호', '010-0000-0092', '고1', null, 'contacted', now() - interval '7 months')`(로컬에서 삭제 함수를 눈으로 확인하는 용도), `consent_version '2026-11-05'`, `consented_at = created_at`.

- [ ] **Step 0: 전제 확인** — `supabase db reset` 뒤 psql로 `create extension if not exists pg_cron;`이 postgres 역할로 되는지, 생긴 `cron` 함수 소유자(`select distinct pg_get_userbyid(proowner) from pg_proc where pronamespace = 'cron'::regnamespace`)를 기록하고 `npm run db:test`의 `00_meta` security definer 검사가 그대로 통과하는지 본다(실패하면 cron 스키마를 그 검사에서 제외하는 이유를 주석으로 달고 고친다). 확장을 만들 수 없으면 멈추고 보고한다.
- [ ] **Step 1: 실패하는 테스트 작성 — `14_consultations_retention.test.sql`** (postgres로 `delete from public.consultations;` 뒤 6건: new·contacted·on_hold 각각 `now() - interval '7 months'`, enrolled `now() - interval '2 years'`, new `now() - interval '6 months' + interval '1 day'`, new `now()`.)
  - `select private.purge_stale_consultations()` = 3; 남은 3건이 enrolled·6개월 안 2건; 다시 부르면 0.
  - `private.audit_log`에 `public.consultations` DELETE 3행, actor null.
  - `cron.job`: `jobname = 'purge-stale-consultations'` 1행, `schedule = '0 18 * * *'`, `command` = `select private.purge_stale_consultations()`, `active`.
  - anon·authenticated·service_role 각각 `function_privs_are('private', 'purge_stale_consultations', ARRAY[]::text[], <role>, ARRAY[]::text[])`.
  - 원장 aal2: `update public.consultations set status = 'contacted', memo = '(가짜) 통화함'` 성공; `update … set phone = '010-0000-0000'` → `42501`; `set created_at = now()` → `42501`.
- [ ] **Step 2: 실패하는 테스트 고치기** — `03_consultations`의 authenticated 권한 표를 `column_privs_are`로(`status`·`memo` `{SELECT,UPDATE}`, `phone` `{SELECT}`), `05_classes`의 insert를 컬럼 단위로(`name` `{INSERT,SELECT,UPDATE}`, `id`·`created_at` `{SELECT}`).
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 14·03·05 FAIL.
- [ ] **Step 4: 구현** — Interfaces 그대로.
- [ ] **Step 5:** `supabase db reset && npm run db:test` → PASS. `npm run db:types`(바뀐 것 없어도 실행).
- [ ] **Step 6:** 전체 검증 → PASS.
- [ ] **Step 7: Commit**
  ```bash
  git add supabase/migrations/20261110000100_consultations_retention.sql supabase/tests/14_consultations_retention.test.sql supabase/tests/03_consultations.test.sql supabase/tests/05_classes.test.sql supabase/seed.sql src/core/supabase/database.types.ts
  git commit -m "feat(db): purge unenrolled consultations after six months with pg_cron; column grants for consultations update and classes insert"
  ```

---

### Task 5: 원장 상담 화면 — 새 신청 먼저, 상태·메모

**Files:**
- Create: `src/features/consultations/model/adminConsultation.ts`, `model/adminConsultation.test.ts`, `data/adminConsultations.ts`, `data/adminConsultations.test.ts`, `state/useAdminConsultations.ts`, `components/admin/ConsultationTable.tsx`, `components/admin/ConsultationEditModal.tsx`, `components/admin/ConsultationEditModal.test.tsx`, `screen/AdminConsultationsScreen.tsx`, `screen/AdminConsultationsScreen.test.tsx`
- Modify: `src/features/consultations/index.ts`, `src/features/consultations/state/useNewConsultationCount.ts`(키를 `consultationKeys.newCount`로), `src/app/admin/consultations/page.tsx`, `eslint.config.mjs`

**Interfaces:**
- Consumes: Task 4 컬럼 권한, `Grade`·`GRADES`(같은 기능 model), `hasControlChars`·`CONTROL_CHAR_MESSAGE`, `SaveNotAppliedError`·`saveErrorMessage`, `Card`·`Badge`·`Modal`·`Select`·`Input`·`Button`·`useToast`, date-fns `format`.
- Produces:
  - model: `CONSULTATION_STATUSES = ["new", "contacted", "enrolled", "on_hold"] as const`, `type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number]`; `CONSULTATION_STATUS_LABELS`(Global Constraints 글자); `CONSULTATION_STATUS_TONE = { new: "new", contacted: "brand", enrolled: "solid", on_hold: "neutral" }`(Badge tone); `type ConsultationRecord = { id: string; parentName: string; phone: string; grade: Grade; message: string | null; status: ConsultationStatus; memo: string | null; createdAt: string }`; `sortConsultations(list): ConsultationRecord[]`(`new` 먼저, 그 안과 나머지는 `createdAt` 내림차순); `consultationEditSchema`(status enum; memo trim, ≤ 2000자 `메모는 2000자까지 쓸 수 있어요.`, `hasControlChars(v, { multiline: true })` → `CONTROL_CHAR_MESSAGE`, `""` → null); `phoneHref(phone: string): string`(`tel:` + 숫자만).
  - data: `listConsultations(): Promise<ConsultationRecord[]>`(`select("id, parent_name, phone, grade, message, status, memo, created_at").order("created_at", { ascending: false })`); `updateConsultation(id: string, input: { status: ConsultationStatus; memo: string | null }): Promise<void>`(`.update({ status, memo }).eq("id", id).select("id")`, 0행 → `SaveNotAppliedError`).
  - state: `consultationKeys = { all: ["consultations"] as const, list: ["consultations", "list"] as const, newCount: ["consultations", "newCount"] as const }`; `useConsultations()`(`refetchOnMount: "always"`); `useUpdateConsultation()` — 성공 시 `consultationKeys.all` invalidate(사이드바 배지·오늘 화면 숫자 포함).
  - `ConsultationTable({ rows, onOpen })` — 열 `신청일`(`yyyy.MM.dd HH:mm`) · `학부모` · `연락처`(`<a href={phoneHref}>`) · `학년` · `상태`(Badge) · `궁금한 점`(한 줄 `truncate`, 없으면 `—`); 행마다 `Button variant="ghost" size="md"` `보기`(aria-label `{학부모} 상담 보기`).
  - `ConsultationEditModal({ record, open, onClose })` — 제목 `{학부모} · {학년}`, 본문 `신청일`·`연락처`·`궁금한 점` 전체(`whitespace-pre-line break-words`, 없으면 `적은 내용이 없어요.`), `Select` `상태`, `Input multiline` `메모`(hint `{n}/2000`), footer `취소`·`저장`(primary). 저장 성공 → 토스트 `상담 기록을 저장했어요.` + 닫기; 실패 → 모달 안 `role="alert"` `saveErrorMessage(e)`; 대기 중 두 번 → 1회.
  - `AdminConsultationsScreen()` — h1 `상담`, 안내 `text-body-sm text-text-muted` `등록하지 않은 신청은 신청일로부터 6개월이 지나면 자동으로 지워져요.`; 0건 `아직 상담 신청이 없어요. 랜딩의 상담 신청 폼으로 들어온 신청이 여기에 보여요.`; 로딩·오류 규칙(Global Constraints); 모달은 `isFetchedAfterMount` 뒤 최신 행으로 연다.
  - index: `AdminConsultationsScreen` 추가(기존 export 유지, `CONSENT_VERSION`·`TURNSTILE_SITE_KEY`는 계속 내보내지 않는다).
  - page: `<AdminConsultationsScreen />`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `adminConsultation.test.ts`: `sortConsultations` — `[contacted 11/3, new 11/1, new 11/2, on_hold 11/4]` → `[new 11/2, new 11/1, on_hold 11/4, contacted 11/3]`; 스키마 memo `"  "` → null, 2001자 → 문구, `"a\u0007"` → `CONTROL_CHAR_MESSAGE`, 줄바꿈 허용; `phoneHref("010-0000-0091")` = `tel:01000000091`.
  - `adminConsultations.test.ts`: `updateConsultation` 인자 `{ status: "contacted", memo: null }`만(다른 키 없음), `.select("id")` 0행 → `SaveNotAppliedError`.
  - `ConsultationEditModal.test.tsx`: 상태 `연락함` + 메모 저장 → mutate 인자, 성공 토스트; reject → alert 문구; 두 번 클릭 → 1회; 공백 없는 1000자 message 요소 `break-words`.
  - `AdminConsultationsScreen.test.tsx`: 새 신청이 위, Badge 글자, `tel:` href, 0건 문구, 안내 문구.
- [ ] **Step 2:** `npm test -- src/features/consultations src/features/admin-shell src/features/today` → FAIL → 구현 → PASS.
- [ ] **Step 3:** 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/consultations src/app/admin/consultations eslint.config.mjs
  git commit -m "feat(consultations): admin list with new requests first, status and memo editing"
  ```

---

### Task 6: guardian-records 후속 정리 — 숙제 배정일, 사유 안내, 시청 기록 문구, 녹화 동의 안내, 동의 버전 교차 확인

**Files:**
- Modify: `src/features/homework/data/homework.ts`, `src/features/homework/model/homework.ts`, `src/features/homework/model/homework.test.ts`, `src/features/homework/data/homework.test.ts`, `src/features/points/components/ManualPointForm.tsx`, `src/features/points/screen/PointsScreen.test.tsx`, `src/features/videos/screen/AdminVideoDetailScreen.tsx`, `src/features/videos/screen/AdminVideoDetailScreen.test.tsx`, `src/features/students/components/ConsentCard.tsx`, `src/features/students/screen/StudentDetailScreen.test.tsx`, `src/features/consultations/model/consultation.test.ts`

**Interfaces:**
- Consumes: `class_members` 본인 행 select(RLS `class_members_self_select`), `toLocalDateKey`.
- Produces:
  - `buildHomeworkItems(sessions, checks, today, joinedOn: ReadonlyMap<string, string>)` — 네 번째 인자 = 반 id → 배정 날짜(`toLocalDateKey(new Date(created_at))`). 수업 `date < joinedOn.get(class_id)`이고 그 수업의 `homework_checks` 행이 없으면 뺀다(배정 정보가 없는 반은 빼지 않는다 — 반에서 빠진 뒤 남은 미완료 숙제를 지우지 않게). `listMyHomework`는 `from("class_members").select("class_id, created_at").eq("student_id", studentId)`를 함께 읽는다.
  - `ManualPointForm` `사유` 입력 hint: `학생 화면에도 보여요. 학생이 봐도 괜찮은 말로 적어 주세요.`
  - `AdminVideoDetailScreen` `시청 현황` 제목 아래 `text-body-sm text-text-muted`: `시청 기록은 학생 기기가 보낸 값이라 참고용이에요.`
  - `ConsentCard` 폼 안내(기존 "고치거나 지울 수 없어요" 줄 위): `등록 동의서에 수업 녹화·영상 게시 동의 항목이 들어 있는지 확인한 뒤 기록해 주세요.`
  - 동의 버전 교차 확인: `consultation.test.ts`가 `supabase/functions/submit-consultation/handler.ts`를 `fs.readFileSync`로 읽어 `ACCEPTED_CONSENT_VERSIONS` 배열 글자를 정규식으로 꺼내고 `CONSENT_VERSION`이 들어 있는지 확인(`src/test/headers.test.ts`처럼 저장소 파일을 읽는 방식).

- [ ] **Step 1: 실패하는 테스트 작성**
  - `homework.test.ts`(model): 배정일 `2026-11-04`인 반의 `2026-11-03` 수업, 체크 없음 → 빠짐; 같은 수업에 `missing` 체크 → 남음; `2026-11-04` 수업 → 남음; 배정 정보 없는 반 → 남음.
  - `homework.test.ts`(data): `class_members` select가 `student_id` 필터로 불린다.
  - `PointsScreen.test.tsx`: 수동 가감 폼의 `사유` 입력 설명(`aria-describedby`)에 hint 글자.
  - AdminVideoDetailScreen: 안내 문구.
  - StudentDetailScreen(ConsentCard): 녹화 동의 안내 문구.
  - consultation.test.ts: `handler.ts`의 허용 목록에 `CONSENT_VERSION`이 있다(지금 값 `2026-11-05`로 통과해야 한다 — 먼저 `CONSENT_VERSION`을 임시로 바꿔 실패를 확인하고 되돌린다).
- [ ] **Step 2:** `npm test -- src/features/homework src/features/points src/features/videos src/features/students src/features/consultations` → FAIL → 구현 → PASS.
- [ ] **Step 3:** 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/homework src/features/points/components/ManualPointForm.tsx src/features/points/screen/PointsScreen.test.tsx src/features/videos/screen/AdminVideoDetailScreen.tsx src/features/videos/screen/AdminVideoDetailScreen.test.tsx src/features/students/components/ConsentCard.tsx src/features/students/screen/StudentDetailScreen.test.tsx src/features/consultations/model/consultation.test.ts
  git commit -m "fix: hide homework from before a class join, point reason and watch-record hints, recording consent note, consent version cross-check"
  ```

---

### Task 7: DB — `site_content` 쓰기 모양 검사·권한, `points_goal` 문서화

**Files:**
- Create: `supabase/migrations/20261110000200_site_content_write.sql`, `supabase/tests/15_site_content_write.test.sql`
- Modify: `supabase/tests/02_site_content.test.sql`(권한 표만), `src/core/supabase/database.types.ts`

**Interfaces:**
- Consumes: `public.site_content`, 정책 `site_content_admin_insert/update`.
- Produces (DB):
  - `alter table public.site_content add constraint site_content_key_known check (key in ('notice', 'classes', 'tuition', 'contact', 'legal', 'points_goal'));`
  - `private.check_site_content()` BEFORE INSERT OR UPDATE 트리거 함수(invoker). 어기면 `raise exception '랜딩 내용 형식이 맞지 않아요. 새로고침한 뒤 다시 저장해 주세요.'`:
    - 공통: `octet_length(new.value::text) <= 8192`; 값 안의 모든 문자열(`jsonb_path_query(new.value, 'strict $.** ? (@.type() == "string")') #>> '{}'`)이 `!~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'`.
    - `notice`: 객체, 키 ⊆ `{title, body, visible}`, title·body는 문자열 또는 null, visible은 boolean.
    - `classes`: 배열, 길이 ≤ 10, 각 칸 객체·키 ⊆ `{name, grades, schedule, capacity}`, name·grades·schedule 문자열 또는 null, capacity null 또는 정수 1~50.
    - `tuition` 키 ⊆ `{monthly, textbook, note}` · `contact` 키 ⊆ `{phone, address}`, phone은 null 또는 `^0[0-9]{1,2}-[0-9]{3,4}-[0-9]{4}$` · `legal` 키 ⊆ `{academy_name, registration_no, subjects, tuition_notice}` — 값은 문자열 또는 null.
    - `points_goal`: `jsonb_typeof = 'number'`, 정수, 1~10000.
  - 권한: `revoke insert, update, delete on public.site_content from authenticated; grant insert (key, value), update (key, value) on public.site_content to authenticated;`(upsert가 key·value를 set에 넣는다. delete는 화면이 쓰지 않는다 — 공지는 `visible: false`로 숨긴다).
  - 머리 주석: 키별 모양(기존 주석 + `points_goal` 정수 1~10000, 기본 30, 학생 홈 `PointsProgress` 목표, 바꾸면 새 목표에서 한 번 더 축하), "원본 주석이 있는 20261105000000 파일은 이미 적용돼 고치지 않는다".

- [ ] **Step 1: 실패하는 테스트 작성 — `15_site_content_write.test.sql`** (시드 행은 그대로 둔다 — `db reset`이 이미 새 검사를 통과한다는 증거.)
  - 원장 aal2 upsert 성공: 키 6개 각각 정상 값(공지 `visible: false`, 반 10칸, 정원 null, 전화 `063-000-0000`, 목표 `30`·`1`·`10000`).
  - `P0001` 문구: `notice` `{"visible": "yes"}`·`{"title": 1}`·`{"extra": "x"}`; `classes` 11칸·`capacity: 0`·`capacity: 51`·`capacity: 1.5`·배열 아닌 값; `contact` phone `'010-1234'`; `points_goal` `0`·`10001`·`1.5`·`'"30"'`·`null`(jsonb null); 문자열에 `\u0007`; 9000바이트 문자열.
  - 모르는 키 `'banner'` → `23514`.
  - 원장 aal2 `delete from public.site_content` → `42501`; `update … set updated_at = now()` → `42501`.
  - A(학생)·아무나·원장 aal1 upsert → `42501` 또는 RLS 위반(`42501`); anon select → 6행(공개 읽기 그대로).
- [ ] **Step 2: 실패하는 테스트 고치기** — `02_site_content`의 authenticated 권한 표를 컬럼 단위로(`key`·`value` `{INSERT,SELECT,UPDATE}`, `updated_at` `{SELECT}`), `table_privs_are` authenticated `ARRAY['SELECT']`(delete 없음).
- [ ] **Step 3:** `supabase db reset && npm run db:test` → 15·02 FAIL → 구현 → `supabase db reset && npm run db:test` PASS. `npm run db:types`.
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add supabase/migrations/20261110000200_site_content_write.sql supabase/tests/15_site_content_write.test.sql supabase/tests/02_site_content.test.sql src/core/supabase/database.types.ts
  git commit -m "feat(db): validate site_content value shapes per key and narrow writes to key and value"
  ```

---

### Task 8: 랜딩 관리 화면 — 공지·반 시간표·수강료·연락처·법정 표시·보상 목표, 랜딩 긴 글 처리

**Files:**
- Create: `src/features/site-content/model/siteContentWrite.ts`, `model/siteContentWrite.test.ts`, `data/saveSiteContent.ts`, `data/saveSiteContent.test.ts`, `state/useSiteContentEditor.ts`, `components/admin/{NoticeEditor,ClassesEditor,TuitionEditor,ContactEditor,LegalEditor,PointsGoalEditor}.tsx`, `components/admin/editors.test.tsx`, `screen/AdminSiteContentScreen.tsx`, `screen/AdminSiteContentScreen.test.tsx`
- Modify: `src/features/site-content/state/useSiteContent.test.tsx`, `src/features/site-content/index.ts`, `src/app/admin/site/page.tsx`, `src/features/landing/components/{NoticeBand,ClassesSection,TuitionSection,LocationSection,SiteFooter}.tsx`, `src/features/landing/components/sections.test.tsx`, `eslint.config.mjs`

**Interfaces:**
- Consumes: Task 7 DB 검사, `getSiteContent`(raw rows), `parseSiteContent`·`DEFAULT_POINTS_GOAL`, `hasControlChars`·`CONTROL_CHAR_MESSAGE`, `SaveNotAppliedError`·`saveErrorMessage`, `Card`·`Input`·`Checkbox`·`Button`·`useToast`, react-hook-form `useFieldArray`, lucide `ArrowUp`·`ArrowDown`·`Trash2`.
- Produces:
  - model `siteContentWrite.ts`: `SITE_CONTENT_KEYS = ["notice", "classes", "tuition", "contact", "legal", "points_goal"] as const`, `type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number]`; `type EditableSiteContent = { notice: { title: string; body: string; visible: boolean }; classes: { name: string; grades: string; schedule: string; capacity: string }[]; tuition: { monthly: string; textbook: string; note: string }; contact: { phone: string; address: string }; legal: { academyName: string; registrationNo: string; subjects: string; tuitionNotice: string }; pointsGoal: string }`(폼 값, 모두 문자열); `readEditable(rows: { key: string; value: unknown }[]): EditableSiteContent`(raw 값을 그대로 읽는다 — `visible: false` 공지도 제목·본문을 보존, 모양이 틀린 값은 빈칸); 키별 zod 쓰기 스키마 `noticeWriteSchema`, `classesWriteSchema`, `tuitionWriteSchema`, `contactWriteSchema`, `legalWriteSchema`, `pointsGoalWriteSchema` — 출력은 DB jsonb 모양 그대로(빈칸 → `null`, legal은 snake_case, capacity `""` → null, 목표는 number). 길이: 공지 제목 ≤ 40·본문 ≤ 500, 반 이름 1~30(필수 `반 이름을 입력해 주세요.`)·학년 ≤ 30·요일·시간 ≤ 60, 정원 `정원은 1~50 사이 숫자로 입력해 주세요.`, 수강료·교재비 ≤ 100·안내 ≤ 500, 주소 ≤ 100, 학원 명칭·등록번호·교습과목 ≤ 40·교습비 게시 ≤ 500, 넘으면 `{n}자까지 쓸 수 있어요.`; 전화 `전화번호는 063-000-0000처럼 숫자와 -로 입력해 주세요.`; 목표 `목표는 1~10000 사이 숫자로 입력해 주세요.`; 공지 `visible`인데 제목 없음 → `공지를 보이려면 제목을 입력해 주세요.`; 한 줄 칸은 `hasControlChars(v)`, 본문·안내·게시 칸은 `{ multiline: true }` → `CONTROL_CHAR_MESSAGE`.
  - data: `saveSiteContent(key: SiteContentKey, value: Json): Promise<void>`(`Json`은 `@/core/supabase/database.types`의 생성 타입) — `.upsert({ key, value }, { onConflict: "key" }).select("key")`, 0행 → `SaveNotAppliedError`.
  - state: `useSiteContentRows()` — `queryKey: ["site-content"]`(랜딩 `useSiteContent`와 같은 키·같은 `getSiteContent`, select 없이 raw), `refetchOnMount: "always"`; `useSaveSiteContent()` — 성공 시 `["site-content"]` invalidate.
  - 편집 카드 6개(`Card tone="raised"`, 각자 `useForm` + 저장 `Button variant="secondary" size="md"`, 대기 중 disabled; 성공 토스트 `랜딩에 반영했어요.`, 실패 카드 안 `role="alert"` `saveErrorMessage(e)`): 제목·라벨·버튼 글자 —
    - `공지`: `제목`, `내용`(multiline), `Checkbox` `랜딩에 공지 띠 보이기`, 버튼 `공지 저장`.
    - `반·시간표`: 행마다 `반 이름`·`대상 학년`·`요일·시간`(placeholder `월·수 17:00–19:00`)·`정원`, 아이콘 버튼 aria `위로 옮기기`·`아래로 옮기기`·`이 반 지우기`; `반 추가`(10개면 disabled + hint `반은 10개까지 넣을 수 있어요.`); 안내 `여기 목록은 랜딩 표시용이에요. 실제 반은 '반' 화면에서 관리해요.`; 버튼 `반·시간표 저장`.
    - `수강료·교재비`: `월 수강료`, `교재비`, `안내 문구`(multiline), 버튼 `수강료 저장`.
    - `연락처`: `전화번호`, `주소`, 버튼 `연락처 저장`.
    - `법정 표시`: `학원 명칭`, `등록번호`, `교습과목`, `교습비 등 게시`(multiline), 안내 `학원법 제15조에 따라 랜딩 맨 아래에 보여요.`, 버튼 `법정 표시 저장`.
    - `보상 목표`: `목표 포인트`(`inputMode="numeric"`), hint `학생 홈 포인트 카드의 목표예요. 바꾸면 학생이 새 목표에 닿을 때 한 번 더 축하해요.`, 버튼 `목표 저장`.
  - `AdminSiteContentScreen()` — h1 `랜딩 관리`, 안내 `저장하면 랜딩에 바로 반영돼요. 비워 둔 칸은 랜딩에 점선 자리표시로 보여요.`, `useSiteContentRows`가 `isFetchedAfterMount`일 때 `readEditable` 결과로 카드들을 그린다. 
  - 랜딩 DB 글 컨테이너(NoticeBand 제목·본문, ClassesSection 각 칸, TuitionSection 세 값, LocationSection 주소, SiteFooter 법정 표시 4개)에 `min-w-0 break-words`(본문은 `whitespace-pre-line`도).
  - index: `AdminSiteContentScreen` 추가. page: `<AdminSiteContentScreen />`. ESLint `ADMIN_UI_FILES`에 site-content admin 경로.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `siteContentWrite.test.ts`: `readEditable` — 시드 모양 rows → 폼 값, `visible: false` 공지 제목 보존, `points_goal` `30` → `"30"`, 모양 틀린 `classes: {}` → `[]`; 쓰기 스키마 왕복 — legal 폼 → `{ academy_name, registration_no, subjects, tuition_notice }`, 다시 `parseSiteContent`에 넣으면 같은 `Legal`; 빈칸 → null; 정원 `""` → null·`"0"`·`"51"`·`"1.5"` → 문구; 전화 `"010-1234"` → 문구, `"063-000-0000"`·`""` 통과; 목표 `"0"`·`"10001"`·`"1.5"`·`"abc"` → 문구, `" 25 "` → 25; 공지 visible + 빈 제목 → 문구; 41자 제목·501자 본문 → `40자까지 쓸 수 있어요.`·`500자까지 쓸 수 있어요.`; `"a\u0007"` → `CONTROL_CHAR_MESSAGE`, 본문 줄바꿈 허용.
  - `saveSiteContent.test.ts`: upsert 인자 `({ key: "points_goal", value: 25 }, { onConflict: "key" })`, 0행 → `SaveNotAppliedError`.
  - `editors.test.tsx`: 반 3개에서 `아래로 옮기기`(첫 행) → 저장 값 순서 바뀜; 10개면 `반 추가` disabled; `이 반 지우기` → 9개; 저장 대기 중 두 번 → 1회; 실패 → alert 문구; 성공 토스트 `랜딩에 반영했어요.`.
  - `AdminSiteContentScreen.test.tsx`: 카드 6개 제목, 로딩 중 폼 없음, 오류(데이터 없음) → 오류 문구.
  - `useSiteContent.test.tsx`(후속 항목): 요청이 끝나기 전 `isLoading === true`·`content === EMPTY_SITE_CONTENT`; 모양이 틀린 행(`{ key: "tuition", value: "x" }`) → 기본값.
  - `sections.test.tsx`: 공백 없는 300자 공지 제목·반 이름·주소·법정 표시가 든 요소에 `break-words`·부모 `min-w-0`.
- [ ] **Step 2:** `npm test -- src/features/site-content src/features/landing` → FAIL → 구현 → PASS.
- [ ] **Step 3:** 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/site-content src/features/landing/components src/app/admin/site eslint.config.mjs
  git commit -m "feat(site-content): landing editor for notice, classes, tuition, contact, legal and points goal with shared write schemas"
  ```

---

### Task 9: DB — `payments`, 감사, 시드

**Files:**
- Create: `supabase/migrations/20261110000300_payments.sql`, `supabase/tests/16_payments.test.sql`
- Modify: `supabase/tests/00_meta.test.sql`(감사 목록), `supabase/seed.sql`, `src/core/supabase/database.types.ts`

**Interfaces:**
- Consumes: `private.is_admin()`, `private.audit()`, `private.set_updated_at()`, `public.students`.
- Produces (DB):
  - `public.payments (id uuid pk default gen_random_uuid(), student_id uuid not null references public.students on delete cascade, month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), amount int not null check (amount between 0 and 10000000), paid_at date, memo text check (memo is null or (char_length(memo) <= 200 and memo !~ '[[:cntrl:]]')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (student_id, month))` + 인덱스 `(month)`, `payments_set_updated_at` 트리거.
  - 권한: 전부 회수 뒤 `grant select, delete on public.payments to authenticated; grant insert (student_id, month, amount, paid_at, memo), update (student_id, month, amount, paid_at, memo) on public.payments to authenticated;`(upsert). 정책 `payments_admin_{select,insert,update,delete}` — `to authenticated`, `(select private.is_admin())`. 학생·anon·service_role 없음.
  - 감사: `payments_audit` → `private.audit()`.
  - 머리 주석: "수납 기록은 퇴원 뒤에도 보존 대상(S12) — 학생 행을 지우지 않으므로 cascade는 실제로 일어나지 않는다. 실제 결제와 연결되지 않는 수기 기록."
  - 시드: 김하늘(`…5ee0000000c1`) 이번 달·지난달(`to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM')` 기준) 각 1행 — 지난달 `250000`, `paid_at` 그 달 5일, 이번 달 `250000`, `paid_at` null, memo `'(예시) 카드'`.

- [ ] **Step 1: 실패하는 테스트 작성 — `16_payments.test.sql`** (`delete from public.payments; delete from public.students;` 뒤 원장 `…a016`, 학생 A `…c016`, 아무나 `…b016`.)
  - 권한 표: anon·service_role `'{}'`; authenticated `ARRAY['DELETE','SELECT']` + `column_privs_are` `amount` `{INSERT,SELECT,UPDATE}`, `updated_at` `{SELECT}`.
  - 원장 aal2: insert → 1행; 같은 `(student_id, month)` insert → `23505`; upsert(`on conflict (student_id, month) do update set amount = excluded.amount`) → 값 바뀜; `month` `'2026-13'`·`'2026-1'`·`'202611'` → `23514`; `amount` `-1`·`10000001` → `23514`; memo 201자·`E'a\x07'` → `23514`; delete → 0행.
  - A·아무나·원장 aal1: select 0행, insert → `42501`(RLS), update·delete 0행(postgres로 그대로); anon select → `42501`.
  - 감사: `public.payments` INSERT·UPDATE·DELETE 행, actor 원장.
- [ ] **Step 2: 실패하는 테스트 작성 — `00_meta`** 감사 목록 `'{consents,consultations,guardian_tokens,payments,student_private,students}'`.
- [ ] **Step 3:** `supabase db reset && npm run db:test` → FAIL → 구현 → PASS. `npm run db:types`.
- [ ] **Step 4:** 전체 검증 → PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add supabase/migrations/20261110000300_payments.sql supabase/tests/16_payments.test.sql supabase/tests/00_meta.test.sql supabase/seed.sql src/core/supabase/database.types.ts
  git commit -m "feat(db): admin-only payments with month, amount, paid date and memo, audited"
  ```

---

### Task 10: 결제 화면 — 학생 × 6개월 표, 칸 입력 모달, 학생 상세 결제 기록

**Files:**
- Create: `src/features/payments/model/payments.ts`, `model/payments.test.ts`, `data/payments.ts`, `data/payments.test.ts`, `state/usePayments.ts`, `components/PaymentCell.tsx`, `components/PaymentEditModal.tsx`, `components/PaymentEditModal.test.tsx`, `components/PaymentHistoryCard.tsx`, `screen/PaymentsScreen.tsx`, `screen/PaymentsScreen.test.tsx`, `index.ts`
- Modify: `src/app/admin/payments/page.tsx`, `src/features/students/screen/StudentDetailScreen.tsx`, `src/features/students/screen/StudentDetailScreen.test.tsx`, `eslint.config.mjs`

**Interfaces:**
- Consumes: Task 9 테이블, `students`(id, name, status) select, `SaveNotAppliedError`·`saveErrorMessage`, `hasControlChars`, `Card`·`Badge`·`Modal`·`Input`·`Button`·`useToast`.
- Produces:
  - model: `monthKeyOf(d: Date): string`(로컬 `yyyy-MM`); `shiftMonth(key: string, n: number): string`; `monthWindow(end: string, size = 6): string[]`(오래된 달부터); `monthLabel(key: string): string`(`11월`, 1월만 `2027년 1월`); `rangeLabel(months): string`(`2026년 6월 ~ 11월`, 해가 다르면 `2026년 9월 ~ 2027년 2월`); `formatWon(n: number): string`(`250,000원`); `type PaymentRecord = { id: string; studentId: string; month: string; amount: number; paidAt: string | null; memo: string | null }`; `type PayableStudent = { id: string; name: string; status: "active" | "paused" | "left" }`; `buildPaymentRows(students, payments, months): { student: PayableStudent; cells: (PaymentRecord | null)[] }[]` — active·paused 전부 + 그 기간에 기록이 있는 left, 이름순(`localeCompare(…, "ko")`); `paymentFormSchema` — amount 문자열에서 `,`·공백을 지우고 `^\d+$` 정수 0~10,000,000(`금액은 0~10,000,000원 사이 숫자로 입력해 주세요.`), paidAt `""` → null 또는 `yyyy-MM-dd`, memo trim ≤ 200(`메모는 200자까지 쓸 수 있어요.`)·`hasControlChars` → `CONTROL_CHAR_MESSAGE`·`""` → null.
  - data: `listPayableStudents(): Promise<PayableStudent[]>`(`from("students").select("id, name, status")`); `listPayments(from: string, to: string): Promise<PaymentRecord[]>`(`gte/lte("month")`); `listStudentPayments(studentId: string): Promise<PaymentRecord[]>`(`order("month", { ascending: false }).limit(12)`); `savePayment(input: { studentId: string; month: string; amount: number; paidAt: string | null; memo: string | null }): Promise<void>`(upsert `onConflict: "student_id,month"`, `.select("id")`, 0행 → `SaveNotAppliedError`); `deletePayment(id: string): Promise<void>`(`.delete().eq("id", id).select("id")`, 0행 → `SaveNotAppliedError`).
  - state: `paymentKeys = { all: ["payments"] as const, range: (from, to) => ["payments", "range", from, to] as const, student: (id) => ["payments", "student", id] as const }`; `usePayableStudents()`, `usePayments(months)`(`refetchOnMount: "always"`), `useStudentPayments(id)`, `useSavePayment()`, `useDeletePayment()` — 성공 시 `paymentKeys.all` invalidate.
  - `PaymentCell({ record, studentName, month, onOpen })` — 버튼(aria-label `{이름} {M}월 결제 {입력|수정}`): 기록 있음 → `250,000원` + 둘째 줄 `11/5 납부` 또는 `Badge tone="warning"` `미납`; 없음 → `—`(`text-text-muted`).
  - `PaymentEditModal({ open, student, month, record, onClose })` — 제목 `{이름} · {yyyy}년 {M}월`, `금액(원)`(`inputMode="numeric"`), `납부일`(`type="date"`, hint `비워 두면 미납으로 보여요.`), `메모`; footer `취소`, (기록 있을 때) `기록 지우기`(danger — 첫 클릭에 글자가 `한 번 더 누르면 지워져요`로 바뀌고 두 번째에 지움), `저장`(primary). 토스트 `결제 기록을 저장했어요.`·`결제 기록을 지웠어요.`, 실패 모달 안 alert `saveErrorMessage(e)`, 대기 중 두 번 → 1회.
  - `PaymentsScreen()` — h1 `결제`, 안내 `금액과 납부일을 직접 적는 기록이에요. 실제 결제와 연결되지 않아요.`, `이전 달`·`다음 달`(`secondary`) + `rangeLabel`, 표(열 `학생` + 6개월, 퇴원 학생 이름 옆 `Badge` `퇴원`), 학생 0명 `학생이 없어요. 학생 화면에서 먼저 추가해 주세요.`; 가로 스크롤은 표 래퍼 `overflow-x-auto`만.
  - `PaymentHistoryCard({ studentId })` — `Card tone="raised" title="결제 기록"`, 표 `월 | 금액 | 납부일 | 메모`(최근 12개월, 미납 `미납`), 0건 `아직 결제 기록이 없어요.`, 링크 `결제 화면에서 입력`(`/admin/payments`, `buttonVariants({ variant: "secondary", size: "md" })`).
  - `StudentDetailScreen`: `PasswordResetCard` 위에 `<PaymentHistoryCard studentId={id} />`.
  - index: `PaymentsScreen`, `PaymentHistoryCard`, `paymentKeys`. page: `<PaymentsScreen />`. ESLint `ADMIN_UI_FILES`에 `src/features/payments/**`.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `payments.test.ts`(model): `shiftMonth("2026-01", -1)` = `2025-12`, `("2026-12", 1)` = `2027-01`; `monthWindow("2026-11")` = `2026-06`…`2026-11`; `rangeLabel(monthWindow("2027-02"))` = `2026년 9월 ~ 2027년 2월`; `monthLabel("2027-01")` = `2027년 1월`; `buildPaymentRows` — left 학생은 기록 있을 때만, 이름순, 칸 위치 = 달; 스키마 amount `"250,000"` → 250000, `" 0 "` → 0, `"-1"`·`"10000001"`·`"1e7"`·`"2.5"`·`""` → 문구, memo 201자 → 문구.
  - `payments.test.ts`(data): `savePayment` upsert 인자 `{ student_id, month, amount, paid_at, memo }`와 `{ onConflict: "student_id,month" }`, 0행 → `SaveNotAppliedError`; `deletePayment` 0행 → `SaveNotAppliedError`.
  - `PaymentEditModal.test.tsx`: 새 칸 저장 → mutate 인자; 납부일 비움 → `paidAt: null`; `기록 지우기` 한 번 → 요청 0회·글자 바뀜, 두 번 → 1회; 실패 alert; 대기 중 두 번 저장 → 1회.
  - `PaymentsScreen.test.tsx`: `이전 달` → `usePayments` 인자가 한 달 앞 6개월; 칸 글자 `250,000원`·`미납`·`—`; 셀 aria-label; 퇴원 배지; 0명 문구.
  - `StudentDetailScreen.test.tsx`: `결제 기록` 카드.
- [ ] **Step 2:** `npm test -- src/features/payments src/features/students` → FAIL → 구현 → PASS.
- [ ] **Step 3:** 전체 검증 → PASS.
- [ ] **Step 4: Commit**
  ```bash
  git add src/features/payments src/app/admin/payments src/features/students/screen/StudentDetailScreen.tsx src/features/students/screen/StudentDetailScreen.test.tsx eslint.config.mjs
  git commit -m "feat(payments): monthly student-by-month payment table with manual entry and student payment history"
  ```

---

### Task 11: 끝까지 확인(1280·390, 실제 브라우저), 후속 문서

**Files:**
- Create (저장소 밖, 스크래치패드 `visual/`): `guardian-e2e.mjs`, `records-e2e.mjs` — 기존 `visual/e2e-lib.mjs`의 `page()`·`loginAdmin()`·`loginStudent()`·`sql()`·`check()`를 그대로 쓴다(BASE를 실제 포트로).
- Modify: `docs/superpowers/plans/v1-followups.md`, `docs/superpowers/plans/foundation-followups.md`
- Modify: 확인 중 드러난 결함이 있으면 그 Task의 파일(테스트 먼저)

**Interfaces:**
- Consumes: Task 1~10 전부. 시드 원장 `admin@example.test`(db reset 뒤 TOTP 새로 등록), 학생 `haneul`(김하늘)·`minjun`, 시드 상담 2건·결제 2건.

- [ ] **Step 1: 준비** — `supabase db reset` → psql `update public.students set must_change_password = false where login_id in ('haneul','minjun');` → `npm run dev`(`:3000`).
- [ ] **Step 2: `guardian-e2e.mjs`** — 단계마다 기대 결과 로그, 콘솔 오류 0개:
  1. 원장(1280×900) → 김하늘 상세 → `학부모 링크` 카드 없음 문구 → `링크 만들기` → 입력 칸 값 `^http://localhost:3000/g#t=[A-Za-z0-9_-]{43}$` → `링크 복사`(`clipboard-read/write` 권한) → 클립보드 = 그 값. psql `guardian_tokens` 활성 1행, `token_hash`에 원문 글자 없음.
  2. 새 컨텍스트(로그인 없음, 390×844) `page.on('request')`로 모든 요청 URL 기록 → 그 링크 열기 → `김하늘 학생의 학습 기록`, 누적 포인트, 최근 4주 기록 → `location.hash === ""`, 주소 `/g` → 새로고침해도 그대로 → 기록한 요청 URL 어디에도 토큰 글자가 없고 `guardian_view` 요청은 POST. `scrollWidth <= 390`.
  3. `curl -s -o /dev/null -w '%{http_code}' "$API/rest/v1/rpc/guardian_view?p_token=<tok>" -H "apikey: $KEY"` → 4xx(GET 거절).
  4. 토큰 한 글자 바꾼 링크 · `/g`(토큰 없음) · `/g?t=<tok>`(쿼리) → 모두 실패 문구.
  5. 원장 `새 링크 만들기` → Modal 확정 → 2의 탭 새로고침 → 실패 문구, 새 링크는 열림.
  6. psql로 새 토큰 `expires_at = now() - interval '1 second'` → 실패 문구, 되돌림. 원장이 학생 상태를 `퇴원`으로 → 링크 실패 문구, 상세 카드 퇴원 문구 → 다시 `재원`으로.
  7. 원장이 같은 브라우저(로그인된 컨텍스트)에서 링크를 열어도 보인다.
  8. `npm run build` 후 `out/g.html`에 `noindex`·`no-referrer` 메타. 스크린샷 `guardian-390.png`, `guardian-error-390.png`, `student-guardian-link-1280.png`.
- [ ] **Step 3: `records-e2e.mjs`**:
  1. 상담: `/admin/consultations` → 새 신청(박보호)이 맨 위, 사이드바 `상담` 배지 1, `/admin` 오늘 `새 상담 1` → 박보호 `보기` → 상태 `연락함`, 공백 없는 2000자 메모 저장 → 배지 사라짐, psql 값 확인, 모달 `scrollWidth` ≤ 1024. psql `select private.purge_stale_consultations()` = 1(7개월 된 최보호) → 새로고침하면 목록 1건.
  2. 랜딩 관리: `/admin/site` → 공지 제목 `(예시) 12월 개강 안내` + `보이기` 저장 → 새 탭 `/`(390) 공지 띠 보임 → 공지 본문에 공백 없는 500자 저장 → 랜딩 `scrollWidth <= 390` → 전화 `010-1234` 저장 시 문구, DB 그대로 → 보상 목표 `5` 저장 → haneul 로그인 `/s` 포인트 카드 목표 5.
  3. 결제: `/admin/payments` → 김하늘 이번 달 칸 `미납` → 열어 금액 `250,000`, 납부일 오늘 저장 → 칸 `250,000원`·`{M/d} 납부` → 김하늘 상세 `결제 기록`에 같은 값 → `이전 달` 이동 → 지난달 칸 → 이번 달 기록 지우기(두 번) → `—`. minjun 토큰으로 `/rest/v1/payments?select=id` → `[]`, anon → 4xx.
  4. 감사: psql `select table_name, op, count(*) from private.audit_log group by 1, 2` 에 `public.guardian_tokens`·`public.consultations`·`public.payments`가 있다.
  5. 스크린샷 `admin-consultations-1280.png`, `admin-site-1280.png`, `admin-payments-1280.png`, `landing-notice-390.png`.
- [ ] **Step 4: 후속 문서** — `v1-followups.md` "guardian-records" 세 묶음을 항목별로 `[x]`(한 일·Task 번호) 또는 이유와 함께 그대로 둔다(아래 "남기는 항목"). `foundation-followups.md`: "Re-check `curl -sI …/g`" 줄은 계획 7 배포 뒤 확인이라 그대로, Cloud checklist의 "pg_cron deletion … (plan 6) must ship" → `[x] (Task 4) — 클라우드에서 cron.job 확인은 계획 7`. 새 항목 "demo-deploy-qa": `- db push 뒤 클라우드에서 pg_cron 확장·cron.job 'purge-stale-consultations' 확인(Free 프로젝트도 Database → Extensions에서 켤 수 있어야 한다).`, `- 배포 미리보기에서 curl -sI /g → Referrer-Policy: no-referrer, X-Robots-Tag: noindex.`, `- QA: 카카오톡 인앱 브라우저(아이폰·안드로이드)에서 학부모 링크 열기·새로고침·링크 미리보기에 토큰이 안 보이는지.`, `- 누나 확인: 등록 동의서에 수업 녹화·영상 게시 동의 항목(S9).`, `- guardian_view 반복 호출은 DB에서 막지 않는다 — Supabase 사용량 알림(S14)을 켠다.`; 새 항목 "v2": `- service_role 쓰기(create-student 등)의 감사 actor가 null — 호출한 원장 id를 남기는 방법.`, `- PointsProgress goal 선택 prop(디자인 시스템 계약 변경, 디자인 원본과 같이).`. 빼는 순서로 건너뛴 Task가 있으면 그 Task 이름을 "demo-deploy-qa"에 적는다.
- [ ] **Step 5:** 전체 검증 → PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add docs/superpowers/plans/v1-followups.md docs/superpowers/plans/foundation-followups.md
  git commit -m "docs: guardian-records follow-ups for cloud pg_cron, /g headers, kakao in-app browser and recording consent"
  ```

---

## 후속 항목 반영표

| 출처 | 항목 | 처리 |
| --- | --- | --- |
| v1 guardian-records | `points_goal` 편집 | Task 7(DB 검사)·Task 8(보상 목표 카드) |
| v1 guardian-records | `classes` INSERT 컬럼 단위 grant | Task 4 |
| v1 guardian-records | site_content 공유 zod 쓰기 스키마, snake/camel | Task 8 `siteContentWrite.ts` |
| v1 guardian-records | useSiteContent isLoading·malformed 테스트 | Task 8 |
| v1 guardian-records | 랜딩 DB 글 `min-w-0`/`break-words` | Task 8 |
| v1 guardian-records | 전화번호 형식 검사 | Task 7(DB)·Task 8(zod) |
| v1 guardian-records | 동의 버전 중복 → 교차 확인 테스트 | Task 6 |
| v1 guardian-records | 미등록 상담 6개월 `pg_cron` | Task 4 |
| v1 guardian-records | consultations index에서 상수 내보내지 않기 / 랜딩 번들 react-query | 이미 내보내지 않는다(Task 5에서 유지). react-query는 랜딩 `useSiteContent`도 쓰므로 해당 없음 — Task 11에서 `[x]`와 이유 |
| v1 guardian-records | (선택) service_role 쓰기 감사 hint | 남김 → v2(Task 11) |
| v1 guardian-records (student-app) | 나중에 배정된 반의 지난 숙제 | Task 6(화면 필터), `guardian_view`도 같은 규칙(Task 1) |
| v1 guardian-records (student-app) | 수동 포인트 사유 안내 | Task 6 |
| v1 guardian-records (student-app) | goal 선택 `PointsProgress` | 남김 → v2(디자인 시스템 계약) |
| v1 guardian-records (student-app) | site_content 마이그레이션 주석에 `points_goal` | Task 7 새 마이그레이션 머리 주석(적용된 파일은 안 고침) |
| v1 guardian-records (videos) | 퇴원 시 Storage 정리 해당 없음 | 기록만 — Task 11 `[x]` |
| v1 guardian-records (videos) | S9 녹화·게시 동의 | Task 6(ConsentCard 안내) + Task 11(누나 확인 QA 항목) |
| v1 guardian-records (videos) | 시청 기록은 클라이언트 값 | Task 6(원장 문구), `/g`는 영상 기록을 보여 주지 않는다(Task 1) |
| v1 guardian-records (videos) | answers UPDATE 남겨 둠 | 그대로(고치기 화면 없음) — Task 11 메모 |
| foundation Guardian | `/g` 헤더 curl 확인 | 계획 7(배포 뒤) — Task 11이 항목으로 넘김, 로컬은 Task 2·11의 meta 확인 |
| foundation Guardian | staging CSP 환경별 생성 | 계획 7 이후(S13) — 그대로 |
| foundation Cloud | pg_cron 삭제가 공개 전에 있어야 함 | Task 4, 클라우드 확인은 계획 7 |
