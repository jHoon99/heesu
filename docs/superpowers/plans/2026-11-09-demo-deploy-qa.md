# 시연·배포·QA(demo-deploy-qa) 구현 계획 — v1 계획 7/7

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **이 계획은 두 부분이다.** Part A(Task 1~6)는 에이전트가 로컬에서만 하는 일이다 — 클라우드·원격(Supabase 클라우드, Cloudflare, GitHub PR 머지, `git push`)은 건드리지 않는다. Part B는 **사용자가 직접** 하는 단계 목록이다. 에이전트 Task가 아니며, 에이전트는 Part B를 실행하지 않는다.

**Goal:** 일요일(11-08) 원장(누나)에게 클라우드 프로젝트 `pudxtxzcftehxicfthmf`(Seoul, Free) 위의 v1 전체를 보여 줄 준비를 끝내고, 그 뒤 며칠 동안 사용자가 따라 할 QA 체크리스트를 넘긴다.

**Architecture:** 클라우드에 넣는 것은 세 가지뿐이다: 이미 있는 마이그레이션(`supabase db push`), 이미 있는 Edge Function 3개, 그리고 새 `supabase/seed-demo.sql`(명백한 가짜 데이터). 비밀번호·비밀 키는 저장소 어디에도 없다 — 원장 계정은 사용자가 대시보드에서 만들고, 시연용 학생 계정 2개는 배포된 원장 화면의 "학생 추가"(`create-student`)로 만든 뒤 `seed-demo.sql`이 그 두 학생에 기록을 붙인다. `seed-demo.sql`은 psql 메타 명령·트랜잭션 문 없이 써서 대시보드 SQL Editor에 그대로 붙여 넣을 수 있고, 로컬에서는 `begin … rollback`으로 감싼 psql 검사(`npm run db:demo-check`, CI에도)가 제약·트리거·RLS·`guardian_view`까지 통과하는지 본다. 클라우드 작업은 전부 `docs/deploy/2026-11-cloud-runbook.md`의 사용자 실행 단계로 적고, 화면별 수동 확인은 `docs/qa/2026-11-v1-qa.md`로 넘긴다.

**Tech Stack:** Supabase CLI 2.121 (Postgres 17, 로컬 DB `postgresql://postgres:postgres@127.0.0.1:56322/postgres`) · psql(`/opt/homebrew/opt/libpq/bin/psql`, CI ubuntu 기본 포함) · Deno 2.9.7(Edge Function 테스트) · Vitest · Next.js 16.4.4 static export · Cloudflare Pages(Git 연동, 프로젝트 `heesu`). **새 npm 의존성 없음.**

**Spec:** `docs/superpowers/specs/2026-11-04-heesu-v1-features-design.md` (§1 일정·비목표, §8 시연 환경, §9 QA 체크리스트, §10 항목 7, §11 Turnstile 테스트 키·허용 주소) · 구조·보안 `docs/superpowers/specs/2026-11-03-heesu-architecture-design.md` (§8 환경과 브랜치·마이그레이션 순서, §13 S1·S4·S5·S7·S8·S9·S10·S13·S14) · 규칙 `AGENTS.md` · 후속 항목 `docs/superpowers/plans/foundation-followups.md`(Cloud checklist, "Guardian / storage plans", "demo-deploy-qa"), `docs/superpowers/plans/v1-followups.md`("demo-deploy-qa" 네 묶음, class-ops 남은 줄) · 형식 `docs/superpowers/plans/2026-11-08-guardian-records.md`

## Global Constraints

- **Part A는 로컬만.** `supabase link`·`db push`·`functions deploy`·`secrets set`·`git push`·`gh pr merge`·Cloudflare/Supabase 대시보드 조작 금지. `supabase db reset`은 로컬 DB에만(인자 `--linked` 금지).
- **비밀 값은 git에 없다.** 런북·QA 문서에는 비밀의 **이름**만 쓴다(`TURNSTILE_SECRET_KEY`, DB 비밀번호, `sb_secret_…`, 원장 이메일·비밀번호, 학생 임시 비밀번호). 브라우저에 가는 값은 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 둘뿐. `service_role`/secret 키는 Edge Function 비밀에만. 원장 이메일은 커밋하지 않는다(S14) — SQL에는 `'<원장 이메일>'` 자리표시로 쓴다.
- **`seed-demo.sql` 규칙:** 가짜 데이터만. 사람 이름 = `"<성이름> (예시)"`(≤ 20자, 제어 문자 없음), 그 밖의 글 = `(예시)`로 시작, 전화 = `010-0000-00xx`, 학교 = `(예시) 가짜중학교`·`(예시) 가짜고등학교`. `auth.users`·`private.admins`·`guardian_tokens`·`videos`·`video_views`에는 아무것도 넣지 않는다. psql 메타 명령(`\…`)·`begin`·`commit` 금지(SQL Editor는 붙여 넣은 전체를 한 암묵 트랜잭션으로 돌린다). 날짜는 서울 기준 `(now() at time zone 'Asia/Seoul')::date`(클라우드 DB 시간대는 UTC — `current_date` 금지).
- **고정 값:**
  - 시연 학생 아이디: 원장 화면으로 만드는 2개 `demo_haneul`(김하늘 (예시), 중2), `demo_minjun`(이민준 (예시), 고1). 시드가 만드는 6개 `demo_seoyeon`(박서연, 중2)·`demo_jiwoo`(최지우, 중1)·`demo_siwoo`(윤시우, 중2)·`demo_doyun`(정도윤, 고1)·`demo_yuna`(강유나, 고2)·`demo_harin`(한하린, 고1) — 이름 뒤에 ` (예시)`.
  - 고정 uuid 접두: 학생 `de000001-0000-4000-8000-0000000000NN`(NN = 03~08), 반 `de000002-0000-4000-8000-00000000000N`(1 중등, 2 고등), 질문 `de000003-0000-4000-8000-00000000000N`. 지울 때 이 접두와 두 `demo_` 아이디로 찾는다.
  - 반: `중등 기초반 (예시)` middle 정원 8 `[{"day":1,…},{"day":3,…},{"day":5,…}]` 17:00–19:00 / `고등 독해반 (예시)` high 정원 8 `[{"day":2,"start":"19:00","end":"21:00"},{"day":4,…19:00–21:00},{"day":7,"start":"14:00","end":"16:00"}]`. 일요일 칸은 시연일(일요일) "오늘" 화면에 반이 뜨게 하려는 것(원장이 지우면 된다). 중등 = 하늘·서연·지우·시우, 고등 = 민준·도윤·유나·하린. `class_members.created_at = now() - interval '35 days'`, `students.joined_at = 서울 오늘 - 35`.
  - 수업: 서울 `오늘-28` ~ `오늘-1`의 시간표 요일마다 하나(28일 = 요일마다 정확히 4번 → 반마다 12개, 합 24). 오늘 수업은 없다("수업 시작" 시연용). `homework_due` = 그 수업 다음 날부터 7일 안의 첫 시간표 요일(`seed.sql`과 같은 식).
  - 포인트 목표 `points_goal = 30`. `demo_haneul` 누적 = **27**(자동분 + 수동 보정 한 줄, 사유 `(예시) 단어 시험 보너스`) — 시연에서 원장이 +3을 주면 학생 화면에서 축하가 한 번 뜬다.
  - 결제: 지난달 8명 모두 납부(`paid_at` = 그달 5일), 이번 달 6행(5행 납부, `demo_harin` 1행 `paid_at null`) → 14행. 금액 중등 250000, 고등 300000, 메모 `(예시) 계좌이체`. `demo_doyun`·`demo_yuna`는 이번 달 행 없음.
  - 상담 2건: `(예시) 박보호` `010-0000-0081` 중1 `new` 1일 전 / `(예시) 최보호` `010-0000-0082` 고1 `contacted` 3일 전 메모 `(예시) 다음 주 방문 상담`. `consent_version = '2026-11-05'`(`CONSENT_VERSION`).
  - 실패 문구(`raise exception`, "-해요" + 고치는 방법): 이미 넣음 → `시연 데이터가 이미 들어 있어요. 다시 넣으려면 supabase/seed-demo-clear.sql을 먼저 실행해 주세요.` / 계정 없음 → `시연용 학생 계정 demo_haneul·demo_minjun을 원장 화면 학생 추가로 먼저 만들어 주세요.`
- 문서 문구는 한국어 "-해요"체, 고치는 방법을 같이 쓴다. 기대 결과가 없는 QA 항목은 쓰지 않는다.
- 각 Task 끝 전체 검증: `npm run typecheck && npm run lint && npm test && npm run fn:check && npm run db:test && npm run db:demo-check && npm run build`(Task 1 전에는 `db:demo-check` 빼고). 셸마다 `export PATH="$HOME/.orbstack/bin:$PATH"`. 커밋은 Conventional Commits, push 금지, 그 Task의 Files만 `git add`.

## Review Focus

1. **클라우드 DB가 UTC라 서울 날짜와 하루 어긋나는 경우**(시드를 서울 00:00~09:00에 넣음) → 수업 날짜·"오늘 수업 없음"·결제 월이 서울 기준으로 맞는다. → Task 1 검사 "서울 오늘 이후 수업 0개"·"이번 달 = 서울 기준 `to_char`" 단언, 검사 안에서 `set local timezone = 'UTC'`.
2. **나중에 반에 배정된 것으로 보여 기록이 사라지는 경우**(`class_members.created_at`이 기본값 now) → 학생 숙제 화면·`guardian_view`가 지난 4주를 보여 준다. → Task 1 검사: `demo_haneul` 권한으로 `sessions` 12행, anon `guardian_view` `records` ≥ 11, 모든 `class_members.created_at <= now() - 28 days`.
3. **사용자가 SQL Editor에서 두 번 붙여 넣거나, 계정 2개를 만들기 전에 붙여 넣는 경우** → 아무 행도 바뀌지 않고 고치는 방법이 담긴 문구가 뜬다. → Task 1 검사: 두 번째 실행 실패 + 전후 행 수 같음, 계정 없는 상태 실행 실패.
4. **시드 값이 제약·트리거(이름 제어 문자, `site_content` 모양 검사, 출결 소속 검사, 자동 포인트, 질문 트리거)와 어긋나 클라우드에서 중간에 실패하는 경우** → 로컬 검사가 같은 마이그레이션 위에서 먼저 실패한다, CI가 이후 마이그레이션 변경 때도 다시 본다. → Task 1 `db:demo-check` + CI 단계.
5. **런북대로 했는데 비밀이 git·화면·로그에 남는 경우**(셸 history에 DB 비밀번호, 문서에 키 값, SQL에 원장 이메일) → 비밀은 프롬프트(`read -rs`)나 대시보드 입력으로만, 문서에는 이름만. → Task 5 검증 `rg` 패턴(키 모양 문자열 0건), Task 4 `TURNSTILE` 비밀 값 없음.

## 판단(이 계획이 정한 것)

- 시연 학생 계정 2개는 시드가 아니라 배포된 원장 화면 "학생 추가"(`create-student`)로 만든다 — 비밀번호가 저장소·SQL 어디에도 없고, 클라우드 함수 경로를 시연 전에 실제로 한 번 지난다. 그래서 "seed-demo가 `auth.users` 모양 재사용" 후속 항목은 해당 없음.
- `seed-demo.sql`은 대시보드 SQL Editor로 넣는다(로컬에 DB 비밀번호를 둘 일이 없다). 로컬 검사는 pgTAP이 아니라 psql 스크립트다 — `supabase test db` 컨테이너는 `supabase/tests` 밖 파일을 `\ir`로 읽지 못하고, 검사는 `rollback`으로 끝나 로컬 DB를 바꾸지 않는다. CI에도 넣어 이후 마이그레이션이 시드를 깨면 바로 안다.
- 시연 영상은 시드에 넣지 않는다(Storage 객체가 필요) — 원장 화면 업로드로 2개(각 50MB 미만).
- 시연일이 일요일이라 고등 반에 일요일 14:00–16:00 칸을 둔다(오늘 화면 시연). 오늘 수업은 만들지 않는다("수업 시작" 시연).
- 하늘 포인트 27/30: 원장이 +3을 주면 축하가 한 번 뜨는 장면을 보여 준다.
- Turnstile은 시연 동안 테스트 키(spec §11). 실제 키는 런북 §8(12/1 전)로 따로.
- legacy API 키는 시연 동안 켜 둔다(함수가 자동 주입 `SUPABASE_SERVICE_ROLE_KEY`를 쓴다).
- 준비용 TOTP는 시연 전날 `auth.mfa_factors`에서 지워 누나가 첫 로그인 때 자기 폰으로 등록한다(spec §8).
- 쌓인 PR은 앞 PR squash 뒤 `rebase --onto`로 옮겨 하나씩 squash, `dev → main`은 merge commit.
- 작은 코드 후속 항목 중 보안·시연에 닿는 것(Turnstile 시간 제한, 헤더·PWA 테스트 고정, CI 취소 규칙, 아이폰 다시 로그인 안내)만 Part A에 넣고, 나머지 UI·a11y·리팩터는 "시연 뒤 · 12/1 전"으로 미룬다(일요일 전 회귀 위험을 줄인다).
- 랜딩은 원장이 고치기 전까지 `(예시)` 값을 공개 주소에 보여 준다. `/privacy`는 계속 noindex.

---

# Part A — 로컬 작업(에이전트)

### Task 1: 시연 데이터 `seed-demo.sql`·지우기 스크립트·로컬 검사

**Files:**
- Create: `supabase/seed-demo.sql`, `supabase/seed-demo-clear.sql`, `scripts/seed-demo-check.sh`, `scripts/seed-demo-check.sql`
- Modify: `package.json`(scripts `"db:demo-check": "sh scripts/seed-demo-check.sh"`), `.github/workflows/ci.yml`(`npm run db:test` 다음 줄 `- run: npm run db:demo-check`)

**Interfaces:**
- Consumes: 모든 마이그레이션의 테이블·트리거(`questions_prepare`, 자동 포인트 `private.sync_session_points`, `attendance_check_member`, `private.check_site_content`), `public.guardian_view(text)`(키 `name, today, total_points, records, week`), 토큰 해시 `sha256(convert_to(token,'UTF8'))`.
- Produces: `supabase/seed-demo.sql`(전제: `students.login_id in ('demo_haneul','demo_minjun')`이고 `user_id is not null`인 행 2개), `supabase/seed-demo-clear.sql`, `npm run db:demo-check`(로컬 DB 상태를 바꾸지 않는다 — 끝에서 rollback).

- [ ] **Step 1: 검사 스크립트를 먼저 쓴다.** `scripts/seed-demo-check.sh`: `set -eu`; `DB_URL`을 `supabase status -o env`의 `DB_URL="…"` 줄에서 읽고 `postgresql://postgres:postgres@127.0.0.1:`로 시작하지 않으면 `로컬 Supabase에서만 돌려요. supabase start 뒤 다시 실행해 주세요.`로 종료 1; `psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -f scripts/seed-demo-check.sql`; 성공 시 `seed-demo check: OK`. `scripts/seed-demo-check.sql` 순서(전부 `begin; set local timezone = 'UTC';` 안, 마지막 `rollback;`):
  1. 계정 없는 상태 거절: `savepoint no_accounts;` → `\set ON_ERROR_STOP 0` → `\ir ../supabase/seed-demo.sql` → `\set no_accounts_failed :ERROR` → `\set ON_ERROR_STOP 1` → `rollback to savepoint no_accounts;` → `\if :no_accounts_failed` 아니면 `do $$ begin raise exception 'FAIL: 계정 없이 실행됐어요'; end $$;`. (이 구간의 오류 출력은 예상된 것 — 스크립트 첫 줄 주석에 적는다.)
  2. 전제 만들기(create-student 흉내, 비밀번호 없음): `auth.users (id, email)` 2행 `demo_haneul@student.heesu.internal`·`demo_minjun@…`(검사 전용 uuid `…-0000000000c7`·`…d7`), `public.students` 2행(`demo_haneul`·`demo_minjun`, 이름 `임시`, 학년 `중1`, 각 user_id).
  3. `\ir ../supabase/seed-demo.sql`.
  4. 단언(`do $$ … raise exception 'FAIL: …' $$`, 하나당 한 블록):
     - `demo_` 학생 8명, 모두 이름이 ` (예시)`로 끝남, 두 전제 학생 이름이 `김하늘 (예시)`·`이민준 (예시)`로 바뀜.
     - `de000002-%` 반 2개, 반마다 소속 4명, 모든 `class_members.created_at <= now() - interval '28 days'`.
     - 시연 반 수업 정확히 24개, `date >= 서울 오늘`인 수업 0개.
     - 시연 반 `attendance` 96행, `homework_checks` 96행.
     - `demo_haneul` 포인트 합 = 27.
     - 시연 상담 2건, 결제 14행이고 이번 달 행의 `month` = `to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM')`.
     - 시연 질문 2개, `answered_at is not null` 1개, 답변 1개.
     - `site_content` 6키, `points_goal` = `30`.
     - RLS: `set local role authenticated; set local request.jwt.claims = '{"sub":"<demo_haneul user_id>","role":"authenticated","aal":"aal1"}'` → `public.sessions` 12행, `public.students` 1행, `public.student_private`는 0행이거나 `insufficient_privilege`(42501 — DO 블록 `exception when insufficient_privilege then null`로 통과, 그 밖의 오류는 FAIL) → `reset role`.
     - 학부모: postgres로 `demo_haneul`에 토큰 `repeat('A', 43)`의 해시 행 insert(`expires_at = now() + interval '1 day'`) → `select set_config('request.method','POST',true)` → `set local role anon` → `guardian_view(repeat('A',43))`의 `name = '김하늘 (예시)'`, `jsonb_array_length(records) >= 11`, `total_points = 27` → `reset role`.
  5. 두 번째 실행 거절: `savepoint rerun;` → `ON_ERROR_STOP 0` → `\ir ../supabase/seed-demo.sql` → `\set rerun_failed :ERROR` → `ON_ERROR_STOP 1` → `rollback to savepoint rerun;` → `\if :rerun_failed` 아니면 FAIL. 이어서 학생 수가 여전히 8명.
  6. 지우기 왕복: `\ir ../supabase/seed-demo-clear.sql` → `demo_`·`de00000%` 행 0개, 시연 상담 0건, `seed.sql`의 `haneul` 학생·반은 그대로 → 2의 전제를 다시 만들고 `\ir ../supabase/seed-demo.sql`이 다시 통과(학생 8명).
- [ ] **Step 2:** `supabase db reset` → `npm run db:demo-check` → FAIL(`seed-demo.sql` 없음).
- [ ] **Step 3: `supabase/seed-demo.sql`** — 머리 주석: 목적(클라우드 시연, Pro 전환 때 지움), 넣는 법(대시보드 SQL Editor에 전체 붙여 넣기, 그 전에 원장 화면에서 `demo_haneul`·`demo_minjun` 만들기), 넣지 않는 것(계정·비밀번호·영상·학부모 토큰), 로컬 검사 명령. 본문 순서:
  1. 가드 `do $$`: 시연 반(`de000002-%`)이 있으면 "이미 들어 있어요" 문구, 두 전제 학생(`user_id is not null`)이 2명이 아니면 "계정 … 먼저 만들어 주세요" 문구.
  2. 두 전제 학생 `update`(이름·학년·`joined_at`) + 6명 insert(고정 uuid, `user_id null`, `must_change_password true`).
  3. `student_private` 8행(학교, `(예시) 보호자`, `010-0000-0011`~`0018`, 하늘만 메모 `(예시) 단어 암기가 빨라요.`), `consents` 6행(민준·하린 제외, 방법 `written`/`kakao` 번갈아, 버전 `(예시) 2026-11`, `consented_at` = 등록일).
  4. 반 2개 → `class_members` 8행(created_at 고정 값).
  5. 수업: `seed.sql`의 `generate_series` 식을 서울 오늘 기준·28일로. `summary`/`homework`는 6개짜리 배열을 반 안의 수업 순번으로 돌린다 — 예 `(예시) 현재완료 문장 만들기` / `(예시) 교과서 3과 단어 20개 외우기`(배열 값은 구현자가 정하되 모두 `(예시)`로 시작).
  6. 출결·숙제: `seed.sql`의 `(n + k) % 6`·`(n + 2k) % 5` 패턴을 쓰되 반마다 **가장 최근 수업**은 전원 `present` + 숙제 `none`(아직 판정 안 함); `demo_haneul`은 그 최근 숙제 `submitted_at = now() - interval '2 hours'`, 바로 앞 수업 숙제 `missing`(목록 위에 남는 숙제 시연).
  7. 포인트: 자동분은 트리거가 만든다. 수동 3줄 — 하늘 `27 - (그 시점 합)`(0이 아니고 −100~100 안임을 가드로 확인), 서연 `+2 (예시) 발표 참여`, 도윤 `-1 (예시) 숙제 늦게 냄`.
  8. 질문: `alter table public.questions disable trigger questions_prepare;` → 하늘 질문(고정 uuid …01, 최근 중등 수업 연결 `(예시) 현재완료랑 과거형 차이를 잘 모르겠어요.`), 민준 질문(…02, 최근 고등 수업 연결, 미답변 `(예시) 3번 문장 해석이 맞는지 궁금해요.`) → `enable trigger` → 하늘 질문에 답변 `(예시) 다음 수업 때 예문으로 같이 볼게요.`
  9. 상담 2건, 결제 14행(고정 값 그대로).
  10. `site_content` 6키 `insert … on conflict (key) do update set value = excluded.value`: `notice` `{"title":"(예시) 12월 상담 안내","body":"(예시) 원장이 실제 공지로 바꿔요.","visible":true}`, `classes` 두 반(시간표 글자와 같은 요일·시간), `tuition` `(예시)` 3칸, `contact` `{"phone":"063-000-0000","address":"(예시) 전북 전주시 OO구 OO로 00"}`, `legal` 4칸 모두 `(예시) …`(원장이 실제 값으로 바꿀 자리), `points_goal` `30`.
- [ ] **Step 4: `supabase/seed-demo-clear.sql`** — 머리 주석: 언제(Pro 전환 전, 시연 데이터 다시 넣기 전), 남는 것(대시보드에서 따로: Auth 사용자 `demo_haneul@…`·`demo_minjun@…` 삭제, Storage `videos` 버킷의 시연 영상 파일 삭제, `site_content`는 원장이 고친 값이라 건드리지 않음, `private.audit_log`는 append-only라 남음). 본문: 학생(`de000001-%` 또는 두 `demo_` 아이디) delete(cascade로 출결·숙제·포인트·질문·결제·동의·토큰·시청 기록), 반(`de000002-%`) delete(cascade로 수업·영상 행), 상담(두 번호) delete.
- [ ] **Step 5:** `npm run db:demo-check` → `seed-demo check: OK`. 이어서 `npm run db:test` → PASS(로컬 DB가 그대로인지).
- [ ] **Step 6:** `package.json` 스크립트, `ci.yml` 단계 추가 → 전체 검증 PASS.
- [ ] **Step 7: Commit**
  ```bash
  git add supabase/seed-demo.sql supabase/seed-demo-clear.sql scripts/seed-demo-check.sh scripts/seed-demo-check.sql package.json .github/workflows/ci.yml
  git commit -m "feat(demo): seed-demo data for the cloud demo, a clear script and a rollback-only local check"
  ```

### Task 2: `submit-consultation` — Turnstile 검증 5초 제한, 실패 시 닫힘

**Files:**
- Modify: `supabase/functions/submit-consultation/turnstile.ts`, `supabase/functions/submit-consultation/turnstile_test.ts`

**Interfaces:**
- Produces: `export const SITEVERIFY_TIMEOUT_MS = 5000;` `verifyTurnstile(secret, token, remoteIp, fetchFn = fetch): Promise<boolean>` 시그니처 그대로. 시간 초과·non-2xx·JSON 아님은 throw(→ handler 기존 경로 500, insert 없음 — `handler_test.ts` "Turnstile throwing is 500 server"가 이미 덮는다).

- [ ] **Step 1: 실패 테스트** (`turnstile_test.ts`에 추가):
  - `"passes an abort signal to fetch"` — 가짜 fetch가 받은 `init.signal`이 `AbortSignal`이다.
  - `"non-2xx throws"` — `new Response("x", { status: 502 })` → `assertRejects`.
  - `"non-JSON body throws"` — `new Response("<html>", { status: 200 })` → `assertRejects`.
  - `"timeout is 5 seconds"` — `assertEquals(SITEVERIFY_TIMEOUT_MS, 5000)`(실제 5초 대기 테스트는 두지 않는다).
- [ ] **Step 2:** `npm run fn:check` → 새 테스트 1개 FAIL(signal 없음).
- [ ] **Step 3:** `fetchFn(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS) })`. 머리 주석에 "시간 초과·HTTP 오류·JSON 아님은 던져서 실패로 닫힌다" 한 줄.
- [ ] **Step 4:** `npm run fn:check` → PASS. 전체 검증 PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add supabase/functions/submit-consultation/turnstile.ts supabase/functions/submit-consultation/turnstile_test.ts
  git commit -m "fix(consultations): time out Turnstile siteverify after 5s and fail closed on HTTP or JSON errors"
  ```

### Task 3: 헤더·PWA 테스트 고정, CI 취소 규칙, 아이폰 홈 화면 안내

**Files:**
- Modify: `src/test/headers.test.ts`, `src/test/pwa.test.ts`, `.github/workflows/ci.yml`, `src/features/my-info/components/InstallGuideCard.tsx`, `src/features/my-info/components/InstallGuideCard.test.tsx`

**Interfaces:**
- Consumes: `public/_headers`의 `/*` CSP(바꾸지 않는다), `isStandalone()`.

- [ ] **Step 1: 실패/새 테스트:**
  - `headers.test.ts` `"worker-src and manifest-src are exactly 'self'"` — CSP를 `;`로 나눈 지시문 중 `worker-src`로 시작하는 것 `=== "worker-src 'self'"`, `manifest-src` `=== "manifest-src 'self'"`. `"/g keeps no-referrer and noindex"` — `block("/g")`가 `Referrer-Policy: no-referrer`·`X-Robots-Tag: noindex`를 포함(이미 있으면 그대로 두고 없을 때만 추가).
  - `pwa.test.ts` 마지막 테스트를 `"no app file outside src/app/s wires the manifest or service worker"`로 바꾼다 — `src/app` 아래 `.ts`·`.tsx`를 재귀로 모아 `src/app/s/`로 시작하는 것을 빼고 모두 `/manifest\.webmanifest|registerServiceWorker/`에 안 맞는다; 모은 파일 수 > 5(빈 목록으로 통과하지 않게).
  - `InstallGuideCard.test.tsx` `"tells iPhone users to sign in again inside the home-screen app"` — 브라우저 탭 상태에서 `추가한 뒤에는 홈 화면 앱에서 다시 로그인해요.`가 보인다.
- [ ] **Step 2:** `npm test -- src/test src/features/my-info` → InstallGuideCard 새 테스트 FAIL(나머지는 지금 코드로 통과해도 된다 — 고정용).
- [ ] **Step 3:** `InstallGuideCard` 아이폰 문단 뒤에 `<p className="text-body-sm text-text-muted">아이폰은 Safari와 홈 화면 앱의 로그인이 따로예요. 추가한 뒤에는 홈 화면 앱에서 다시 로그인해요.</p>`(카카오톡 줄 앞). `ci.yml` `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`(dev·main push 빌드는 끝까지 돈다).
- [ ] **Step 4:** 전체 검증 PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/test/headers.test.ts src/test/pwa.test.ts .github/workflows/ci.yml src/features/my-info/components/InstallGuideCard.tsx src/features/my-info/components/InstallGuideCard.test.tsx
  git commit -m "test: pin worker-src/manifest-src and the PWA wiring scope; ci: cancel only PR runs; tell iPhone users to sign in again in the home-screen app"
  ```

### Task 4: 배포 런북 `docs/deploy/2026-11-cloud-runbook.md`, README 로컬 실행

**Files:**
- Create: `docs/deploy/2026-11-cloud-runbook.md`
- Modify: `README.md`(create-next-app 기본 글을 바꾼다)

**Interfaces:**
- Consumes: Task 1의 `seed-demo.sql`·`seed-demo-clear.sql` 사용법, `supabase/config.toml`(`verify_jwt = false` 3개, redirect 3개, `minimum_password_length = 8`), `public/_headers`, `supabase/functions/_shared/http.ts` `ALLOWED_ORIGINS`.

런북은 사용자가 위에서 아래로 그대로 따라 하는 문서다. 단계마다 `- [ ]`, 명령은 코드 블록, 대시보드 조작은 `메뉴 > 메뉴 > 항목: 값`, 단계마다 **확인:** 줄(기대 출력). 비밀 값 자리는 `<…>` 이름표만, 비밀을 받는 명령은 `read -rs VAR` 뒤 변수로 넘긴다.

- [ ] **Step 1: 런북 §0 준비** — Supabase·GitHub·Cloudflare 계정 2FA(S5) · GitHub Settings > Code security: Secret scanning·Push protection 켬(S14) · `supabase --version` 2.121 · `psql` 불필요(시드는 SQL Editor) · 작업 브랜치 `dev` 최신(`git switch dev && git pull`) · **금지 목록**: `supabase db push --include-seed`, `supabase db reset --linked`, 대시보드 Table Editor·SQL로 스키마 수정(S7 — 시드 SQL과 아래 확인 쿼리만 허용), 커밋별 미리보기 주소(`<hash>.heesu.pages.dev`)에서 로그인.
- [ ] **Step 2: 런북 §1 Supabase 연결·마이그레이션** — `supabase login` → `supabase link --project-ref pudxtxzcftehxicfthmf`(DB 비밀번호는 프롬프트에) → `supabase migration list`(원격에 이미 적용된 것 확인; 원격에 학생·반 데이터가 있으면 SQL Editor `select name from public.students where name ~ '[[:cntrl:]]' union all select name from public.classes where name ~ '[[:cntrl:]]'` = 0행, 있으면 고친 뒤 진행) → Database > Extensions: `pg_cron` 켬(db push 전, retention 마이그레이션이 Free에서 막히지 않게) → `supabase db push --dry-run`(목록 = `supabase/migrations` 18개 중 미적용분) → `supabase db push`. **확인(SQL Editor):** `select extname from pg_extension where extname in ('pg_graphql','pg_cron')` → `pg_cron`만 / `select jobname, schedule from cron.job` → `purge-stale-consultations | 0 18 * * *` / `select id, public, file_size_limit, allowed_mime_types from storage.buckets` → `videos | false | … | {video/mp4}` / `select count(*) from pg_tables where schemaname='public' and not rowsecurity` → 0. 실패 시: 어느 파일에서 멈췄는지 기록 → 로컬에서 새 마이그레이션으로 고침(적용된 파일 수정 금지) → 다시 push.
- [ ] **Step 3: 런북 §2 Edge Functions·비밀** — Settings > API Keys: legacy 키가 **켜져 있는지**(함수가 자동 주입 `SUPABASE_SERVICE_ROLE_KEY`를 쓴다; 끄면 함수 3개가 500 — 끄기 전에 코드 변경 필요, `SUPABASE_` 접두 비밀은 직접 못 만든다) · `read -rs TS_SECRET && supabase secrets set TURNSTILE_SECRET_KEY="$TS_SECRET" && unset TS_SECRET`(시연 중 값 = 스펙 §3의 Cloudflare **테스트** 비밀 — 12/1 전 §8에서 교체) · `supabase functions deploy submit-consultation --no-verify-jwt`, `create-student --no-verify-jwt`, `reset-student-password --no-verify-jwt` · **확인:** `supabase secrets list`에 `TURNSTILE_SECRET_KEY` 이름 / `supabase functions list` 3개 ACTIVE.
- [ ] **Step 4: 런북 §3 대시보드 설정**(각 줄 = 위치 · 값 · 왜): Authentication > Sign In / Providers: Allow new users to sign up **끔**, Allow anonymous sign-ins **끔**, Email provider **켬**, Confirm email **켬**, Minimum password length **8** · Authentication > URL Configuration: Site URL `https://heesu.pages.dev`, Redirect URLs **정확히 3개** `http://localhost:3000`, `https://dev.heesu.pages.dev`, `https://heesu.pages.dev`(와일드카드 금지) · Authentication > Multi-Factor: TOTP 켬 · Authentication > Sessions(또는 Attack Protection): refresh token rotation 켬, reuse interval 10초 · Realtime > Settings: Allow public access **끔**(S8) · Storage > Settings: 전역 파일 크기 한도 50MB(Free 최대 — 시연 영상은 짧게) · Organization > Usage: 사용량 알림 메일 받는 주소 확인, 시연 주간에는 매일 Usage 확인(S14; `guardian_view` 반복 호출은 DB가 막지 않는다).
- [ ] **Step 5: 런북 §4 Cloudflare Pages** — Workers & Pages > heesu > Settings > Build: Production branch `main`, Build command `npm run build`, Output `out`, 환경 변수 `NODE_VERSION=22` · Preview: 자동 미리보기 브랜치를 `dev`만(Custom branches) — 커밋별 주소에서 로그인하지 않게 · Variables and Secrets: **Production과 Preview 둘 다** `NEXT_PUBLIC_SUPABASE_URL = https://pudxtxzcftehxicfthmf.supabase.co`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = <Settings > API Keys의 sb_publishable_… 값>`(공개 값이지만 문서엔 이름만) · 값은 빌드 때 박히므로 바꾼 뒤 Deployments > 최신 dev 배포 > Retry deployment.
- [ ] **Step 6: 런북 §5 배포 뒤 확인(스모크)** — `H=https://dev.heesu.pages.dev`(운영 확인 때는 `https://heesu.pages.dev`), `API=https://pudxtxzcftehxicfthmf.supabase.co`, `read -r PK`(publishable 키). 각 줄 명령 + 기대:
  - `curl -sI $H/g | grep -iE 'referrer-policy|x-robots-tag'` → `referrer-policy: no-referrer` **한 줄만**, `x-robots-tag: noindex`.
  - `curl -sI $H/ | grep -i content-security-policy` → `pudxtxzcftehxicfthmf.supabase.co`, `worker-src 'self'`, `manifest-src 'self'`, `frame-src https://challenges.cloudflare.com` 포함. 같은 응답에 `strict-transport-security`, `x-content-type-options: nosniff`.
  - `curl -s -o /dev/null -w '%{http_code}\n' $H/s` → `200`(3xx면 SW가 리다이렉트 응답을 저장한다 — 멈추고 알린다). `curl -sI $H/sw.js | grep -i cache-control` → `no-cache`.
  - CORS: `curl -si -X OPTIONS $API/functions/v1/submit-consultation -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' | head -1` → `403`, `access-control-allow-origin` 없음 / 같은 요청 `Origin: $H` → 2xx + `access-control-allow-origin: $H` / `curl -si -X POST … -H 'Origin: https://evil.example' -d '{}'` → 403. (로컬 Kong은 OPTIONS에 `*`를 줬다 — 클라우드 게이트웨이 값을 여기서 확인.)
  - 가입 차단: `curl -s -X POST $API/auth/v1/signup -H "apikey: $PK" -H 'content-type: application/json' -d '{"email":"probe@example.test","password":"probe-pass-1234"}'` → `signup_disabled` 오류.
  - anon 읽기: `curl -s "$API/rest/v1/students?select=id" -H "apikey: $PK"` → `[]` 또는 권한 오류(데이터 없음) / `site_content?select=key` → 6키 / `curl -s "$API/rest/v1/rpc/guardian_view?p_token=x" -H "apikey: $PK"` → 오류(GET 거절).
  - 실제 상담 신청 1건(§6 뒤, `$H`에서 폼 제출) → 성공 카드 → 원장 상담 목록에 보임 → 상태 `보류` 처리.
  - 원장 계정: SQL Editor `select count(*) from private.admins a join auth.users u on u.id = a.user_id where u.email like '%@example.test'` → 0.
- [ ] **Step 7: 런북 §6 원장 계정·시연 데이터** — Authentication > Users > Add user > Create new user: `<원장 이메일>`, 비밀번호 **12자 이상**(비밀번호 관리자에 저장), Auto Confirm 켬 → SQL Editor `insert into private.admins (user_id) select id from auth.users where email = '<원장 이메일>';`(실행 뒤 편집기에서 지운다, 저장된 쿼리로 남기지 않는다) → `$H/login` 로그인 → TOTP 등록(사용자 인증 앱, 준비용) → QR이 CSP 아래에서 보이는지 → `/admin` 학생 추가 2번: 아이디 `demo_haneul`(이름 아무거나, 학년 중2), `demo_minjun`(고1), 임시 비밀번호는 비밀번호 관리자에만 → SQL Editor에 `supabase/seed-demo.sql` 전체 붙여 넣고 Run → **확인:** `select count(*) from public.students where login_id like 'demo\_%'` = 8. 오류가 나면 문구대로 고치고(트랜잭션이라 반쯤 들어가지 않는다 — 같은 쿼리로 0인지 확인) 다시 → `/admin` 영상: 두 반에 짧은 mp4(각 50MB 미만, 저작권 문제 없는 직접 찍은 클립) 하나씩 업로드 → `demo_haneul` 상세 > 학부모 링크 만들기(시연 때 누나 폰으로 열어 보기). **시연 전날 밤(최종 런북에서는 §7 뒤 §8로 옮김):** 준비용 TOTP를 지워 누나가 첫 로그인 때 자기 폰으로 등록하게 — SQL Editor `delete from auth.mfa_factors where user_id = (select id from auth.users where email = '<원장 이메일>');` → 원장 로그인 시 등록 화면이 뜨는지 한 번 확인 후 로그아웃(등록하지 않고).
- [ ] **Step 8: 런북 §7 운영 배포(`dev → main`)와 §8 12/1 공개 전(시연과 별개)** — §7: GitHub PR `dev → main`, **Create a merge commit**(squash 금지 — dev와 main 역사를 맞춘다) → CI 통과 → 머지 → Cloudflare 프로덕션 빌드 → §5를 `H=https://heesu.pages.dev`로 다시. §8: Cloudflare Turnstile 위젯 만들기(허용 호스트 `heesu.pages.dev`, `dev.heesu.pages.dev`) → 사이트 키는 `src/features/consultations/model/consultation.ts` `TURNSTILE_SITE_KEY`를 PR로 교체(공개 값) + 함수 hostname 검사 코드(후속 항목) → `read -rs` 방식으로 `TURNSTILE_SECRET_KEY` 교체 → 함수 재배포 → 실제 신청 1건. `/privacy` 관문(빈칸 채움·없는 기능 문구 제거·법률 검토 → `robots: { index: false }` 제거 + `public/sitemap.xml`에 다시 추가).
- [ ] **Step 9: 런북 §9 되돌리기** — 프론트: Cloudflare > Deployments > 이전 프로덕션 배포 > Rollback to this deployment(빌드 없이 즉시). 함수: `git switch --detach <이전 커밋> && supabase functions deploy <이름> --no-verify-jwt && git switch -`. DB: 되돌리는 마이그레이션은 없다 — 앞으로 고치는 새 마이그레이션만(하위 호환으로 썼으므로 프론트만 되돌려도 동작). Free는 백업이 없다 → 시연 데이터가 꼬이면 `seed-demo-clear.sql` → 다시 `seed-demo.sql`. 비밀: `supabase secrets unset <이름>`. 최후 수단(새 프로젝트)은 ref가 바뀌어 `_headers` CSP·`headers.test.ts`·Cloudflare 변수·Turnstile을 같이 바꿔야 한다 — 시연 전에는 하지 않는다. 계정 문제: 학생 추가 중 끊겨 로그인만 되는 Auth 사용자(students 행 없음)가 남으면 그 아이디를 다시 못 쓴다 → Authentication > Users에서 `<아이디>@student.heesu.internal` 삭제.
- [ ] **Step 10: README** — 제목 `희수영어`, "로컬 실행"(OrbStack PATH, `supabase start`, `.env.local`을 `.env.example`에서 복사하고 값은 `supabase status`의 API URL·publishable 키로, `npm run dev`는 반드시 `:3000` — Edge Function Origin 허용 목록), "검증"(AGENTS.md 명령 + `npm run fn:check`, `npm run db:demo-check`), "문서"(설계·계획·런북·QA 경로). 비밀 값 없음.
- [ ] **Step 11:** 검증 — `rg -n "sb_secret_|sb_publishable_[A-Za-z0-9]|eyJ[A-Za-z0-9_-]{20,}|1x0000000000000000000000000000000AA" docs/deploy README.md` → 0건. `rg -c "확인:" docs/deploy/2026-11-cloud-runbook.md` ≥ 8. 전체 검증 PASS.
- [ ] **Step 12: Commit**
  ```bash
  git add docs/deploy/2026-11-cloud-runbook.md README.md
  git commit -m "docs: cloud deploy runbook for the demo (migrations, functions, dashboard toggles, smoke checks, rollback) and README local setup"
  ```

### Task 5: QA 체크리스트 `docs/qa/2026-11-v1-qa.md`

**Files:**
- Create: `docs/qa/2026-11-v1-qa.md`

**Interfaces:**
- Consumes: 스펙 §2~§6·§9·§11 화면 표, Task 1 시드 값(아이디·이름·포인트 27·결제 행), Task 4 런북 절 번호, 아래 "후속 항목 반영표"에서 처리가 "QA"인 줄 전부.

형식: 한국어. 항목마다 `- [ ] **확인할 것** — 방법 → 기대: …`(기대 결과 없는 항목 금지). 맨 위에 쓰는 법(기기·계정 준비, 실패하면 "날짜·기기·주소·화면 캡처·한 일"을 적어 이슈로), 기기 약어(PC = PC Chrome 1280px, iOS = 아이폰 Safari, iOS앱 = 홈 화면 앱, AND = 안드로이드 Chrome, 카톡 = 카카오톡 인앱 브라우저), 각 항목 끝에 해당 기기 약어.

- [ ] **Step 1: 섹션을 이 순서로 쓴다.** 각 섹션에 반드시 들어갈 항목:
  0. **사용자가 직접 할 일**(spec §8: 가입·익명 끄기, Realtime 공개 끄기, 원장 계정, Cloudflare 변수) = 런북 §0~§6 체크가 끝났는지 한 줄씩 → 기대: 런북 해당 절 `확인:`이 모두 맞음. 이어서 **시연 전 필수 10개**(일요일 전 dev 미리보기에서): 원장 로그인+TOTP, 오늘 화면 고등 반 표시·수업 시작, 출결 칸 클릭 저장, 학생 `demo_haneul` 첫 로그인 비밀번호 변경, 학생 홈 포인트 27/30, 원장 +3 → 학생 축하 한 번, 학부모 링크 열기, 상담 신청→원장 목록, 영상 재생, 질문→답변 실시간.
  1. **방문자 `/`·`/privacy`**: 섹션 순서·모션, 공지 띠(`(예시)`), 반·수강료·법정 표시 4개가 DB 값, 전화 `tel:`, 지도 앱 링크, 상담 폼(번호 숫자만·형식 문구·확인란 둘 필수·`/privacy#consult`·성공 카드·같은 번호 4번째 → 하루 3건 문구), Turnstile이 StrictMode에서 위젯 하나만, 390px 가로 스크롤 없음, `/privacy` 검색 제외 메타.
  2. **원장 `/admin/*`** 화면마다(로그인·TOTP, 오늘, 출결·숙제, 수업일지, 학생 목록·추가·상세(학교·보호자 **두 번 연속 저장**, 동의, 학부모 링크 만들기·재발급·복사, 결제 기록, 비밀번호 초기화), 반, 영상(업로드 진행률·50MB 넘는 파일 거절 문구·시청 현황), 질문(미답변 배지·실시간), 상담(새 신청 먼저·상태·메모), 포인트(순위표·수동 가감 사유 필수·음수 표시), 결제(월 이동·칸 입력·지우기), 랜딩 관리(저장 즉시 반영·잘못된 전화 거절·목표 바꾸면 다시 축하), 설정(비밀번호 변경)), 1024px 미만 사이드바 접힘. 알려진 동작 3개를 기대 결과로 적는다: 자정을 넘긴 탭은 새로고침 전까지 어제 날짜, 출결 표 "최근 8회"에 미래 날짜 수업이 섞일 수 있음, 퇴원 처리한 학생의 지난 칸은 원장도 못 고침.
  3. **학생 `/s/*`**: 첫 로그인 강제 변경, 홈 인사·숙제 카드·포인트·새 영상, 숙제 "제출했어요"·미완료가 위에 남음, 영상 목록·재생·이어 보기·질문하기, 질문 목록·답변 실시간, 내 정보(포인트 내역·로그아웃·설치 안내), 비밀번호 변경이 현재 비밀번호를 묻지 않음(→ 누나 확인 목록과 연결).
  4. **학부모 `/g#t=…`**: 이름·4주 기록·이번 주·포인트, 열면 주소창에서 토큰이 지워짐, 새로고침 유지, 지워진 주소를 남에게 보내면 실패 문구, 재발급 뒤 옛 링크 실패, 한 글자 바꾼 링크 실패.
  5. **기기별**: iOS 홈 화면 추가(아이콘·standalone·하단 safe-area·앱에서 다시 로그인·영상 `playsinline` 재생·이어 보기·축하가 Safari와 앱에서 따로 한 번씩), AND 설치(앱 설치 메뉴), 카톡(아이폰·안드로이드 각각: 학부모 링크 열기·새로고침·링크 미리보기 카드에 토큰 없음, 학생 로그인 시 "Safari/Chrome으로 열기" 안내), PC 1280 원장 전 화면.
  6. **PWA·오프라인**(production 빌드만 SW 등록 — 미리보기에서): SW 등록(개발자 도구 없이: 홈 화면 앱 두 번째 실행부터 비행기 모드로 `/s` 셸), 오프라인 문구, 첫 방문 직후(새로고침 전) 오프라인은 셸이 안 뜰 수 있음(알려진 한계), 오프라인 새로고침 시 몇 초 빈 화면 뒤 역할 오류 문구(알려진 한계 — 시연 뒤 고침), 영상 화면 `?id=` 캐시 1개, Storage 영상이 SW를 거치지 않고 재생.
  7. **보안(도구 없이)**: 가입 시도(로그인 화면에 가입 없음, 런북 §5 curl 결과 옮겨 적기), 학생으로 `/admin` 주소 입력 → 학생 홈으로, 원장 TOTP 없이(aal1) `/admin` 안 열림, 학생 A로 로그인해 B의 이름·포인트·출결이 어디에도 없음(순위는 숫자만), 학생 질문에 `<script>` 넣기 → 글자 그대로, 학부모 링크 위조(한 글자·쿼리 `?t=`·없음) → 같은 문구, 퇴원 처리 → 그 학생 로그인 시 데이터 0·링크 실패, 원장 비밀번호 바꾼 뒤 다른 기기 옛 세션이 다음 갱신에서 로그아웃(접속 토큰은 최대 1시간 유효 — 알려진 한계), 로그아웃 후 뒤로 가기에 개인정보 안 보임, Realtime: 다른 학생 질문이 실시간으로 안 옴.
  8. **누나에게 받을 정보·확인할 것**: 원장 이력, 주소, 전화, 교습비·교재비, 반·시간표, 학원 명칭·등록번호·교습과목·교습비 게시 문구(법정 표시 4), 개인정보 문의처, 등록 동의서에 **수업 녹화·영상 게시 동의**(S9), 학생 비밀번호 변경이 현재 비밀번호를 묻지 않아도 되는지, 일요일 수업 칸 유지 여부, 보상 목표 30점, 포인트 규칙(출석+숙제 완료=1점).
  9. **12/1 랜딩 공개 전 관문**: 런북 §8 전부(Turnstile 실제 키·hostname 검사, `/privacy` 관문), `(예시)` 값이 랜딩에 남지 않음, 시연 뒤 고칠 목록(아래 반영표 "시연 뒤") 처리.
  10. **개원 전 Pro 전환 체크리스트**: 조직 Pro 업그레이드, Storage 전역 한도 1GiB + `src/features/videos/model/videos.ts` `VIDEO_MAX_BYTES`를 1GiB로, `seed-demo-clear.sql` + 시연 Auth 사용자·영상 파일 삭제, Leaked password protection·원장 세션 비활동 타임아웃 켬(S5), 일일 백업 확인 + 월 1회 암호화 덤프(S12), 퇴원생 Auth 삭제·개인정보 파기 절차(스펙 §11), staging 프로젝트와 Preview 변수 분리(S13) + 환경별 CSP, CSP `'unsafe-inline'` 제거 스크립트(S10), legacy API 키 끄기 전 함수 비밀 이름 변경, 사용량 알림.
  11. **알려진 한계(v1)**: 발급된 영상 signed URL은 최대 3시간 열림(S9), Realtime DELETE 이벤트는 PK만(S8), 로그아웃한 원장의 aal2 접속 토큰은 만료까지 유효, 업로드 성공 뒤 행 저장 전에 탭을 닫으면 Storage에 고아 파일(대시보드에서 지움), 시청 시간은 학생 기기가 보고한 값(증빙 아님).
- [ ] **Step 2:** 검증 — `rg -c "기대:" docs/qa/2026-11-v1-qa.md` ≥ 100. 키워드가 모두 있는지 `for k in 카카오톡 "홈 화면" playsinline "두 번 연속" "녹화" "Pro 전환" "aal2" "Realtime" "Turnstile" "/privacy" "safe-area" "현재 비밀번호" "StrictMode"; do rg -q "$k" docs/qa/2026-11-v1-qa.md || echo "없음: $k"; done` → 출력 없음. Task 4 Step 11의 비밀 패턴 `rg` → 0건.
- [ ] **Step 3: Commit**
  ```bash
  git add docs/qa/2026-11-v1-qa.md
  git commit -m "docs: v1 QA checklist by role, screen, device and security, with owner questions and Pro switch list"
  ```

### Task 6: 후속 문서 정리

**Files:**
- Modify: `docs/superpowers/plans/v1-followups.md`, `docs/superpowers/plans/foundation-followups.md`

- [ ] **Step 1:** 아래 "후속 항목 반영표"대로 줄마다 `[x] (Task N)` / `[x] → 런북 §N` / `[x] → QA §N` / 그대로 두고 `→ 시연 뒤(12/1 전)` 또는 `→ v2` 표시. 이미 된 것(`create-student` 제어 문자 거부, `InstallGuideCard` `useSyncExternalStore`, `classes` INSERT 컬럼 grant, 반 목록 인원 `class_roster`, SW `/_next/static` 정리·URL 정규화)은 `[x]`와 근거 파일. `v1-followups.md` 끝에 `## 시연 뒤 · 12/1 전`(반영표 "시연 뒤" 줄 모음)과 `## v1에 없는 것`(아래 목록) 두 묶음을 더한다.
- [ ] **Step 2:** 전체 검증 PASS.
- [ ] **Step 3: Commit**
  ```bash
  git add docs/superpowers/plans/v1-followups.md docs/superpowers/plans/foundation-followups.md
  git commit -m "docs: map demo-deploy-qa follow-ups to the seed, runbook, QA checklist or the post-demo list"
  ```

---

# Part B — 클라우드·원격(사용자가 직접, 에이전트 Task 아님)

- [ ] **B1. 2FA·저장소 보호** — 런북 §0(Supabase·GitHub·Cloudflare 2FA, secret scanning·push protection).
- [ ] **B2. 이 계획 PR** — Part A 커밋이 있는 `feature/demo-deploy-qa`를 push, PR(base `dev`)을 연다(#9). 아직 머지하지 않는다.
- [ ] **B3. 쌓인 PR을 순서대로 `dev`에 squash 머지: #3 → #4 → #5 → #6 → #7 → #8 → #9.** 각 PR의 브랜치는 앞 브랜치 위에 쌓여 있어서, 앞 PR을 squash한 뒤에는 다음 브랜치를 새 `dev` 위로 옮긴다: `git fetch origin && git rebase --onto origin/dev origin/<앞 브랜치> <이번 브랜치> && git push --force-with-lease origin <이번 브랜치>` → PR diff가 그 계획 커밋만인지 보고 → CI 초록 → Squash and merge. (순서: landing → auth-admin → class-ops → student-app → videos-questions → guardian-records → demo-deploy-qa.)
- [ ] **B4. 클라우드 적용** — 런북 §1(link·pg_cron·db push·확인 쿼리) → §2(legacy 키 확인·비밀·함수 3개) → §3(대시보드 설정) → §4(Cloudflare 변수 Production·Preview, dev 재배포).
- [ ] **B5. 미리보기 스모크** — 런북 §5를 `H=https://dev.heesu.pages.dev`로. 하나라도 기대와 다르면 멈추고 이슈로.
- [ ] **B6. 원장 계정·시연 데이터** — 런북 §6(원장 생성·`private.admins`·준비용 TOTP·`demo_haneul`/`demo_minjun` 추가·`seed-demo.sql` 붙여 넣기·영상 2개·학부모 링크). 런북 §5의 실제 상담 신청 1건.
- [ ] **B7. 시연 전 필수 QA** — `docs/qa/2026-11-v1-qa.md` §0의 10개를 미리보기에서(PC + 아이폰 + 안드로이드 각 1번).
- [ ] **B8. 운영 배포** — 런북 §7: `dev → main` PR, Create a merge commit → `heesu.pages.dev`에서 §5 다시 + §0 중 로그인·학생 홈·학부모 링크 3개.
- [ ] **B9. 시연 전날 밤** — 런북 §8(§7 뒤): 준비용 TOTP 삭제, 사용량 확인, 학부모 링크 다시 만들어 두기.
- [ ] **B10. 시연(일요일)** — 순서 제안: 랜딩(폰) → 상담 신청 → 원장 로그인(누나 폰으로 TOTP 등록, 비밀번호 바꾸기) → 오늘·수업 시작·출결 → 학생 화면(`demo_haneul`, 폰 홈 화면 추가) → 원장이 +3 → 학생 축하 → 질문·답변 실시간 → 영상 → 학부모 링크(카톡으로 보내 열기) → 랜딩 관리에서 공지 고치기 → QA §8 질문 목록 받기.
- [ ] **B11. 그 뒤 며칠** — QA 문서 §1~§7을 기기별로, 실패는 이슈로(날짜·기기·주소·캡처). 누나 답(§8)으로 `site_content`는 원장 화면에서, 코드 문구는 PR로.

---

## v1에 없는 것(명시)

- 웹푸시 전부: 원장 설정 "웹푸시 알림 켜기", `push_subscriptions` 테이블, `notify-admin` 함수, `/admin` 범위 SW 등록(spec §4·§7, 계획 5 Task 11 미구현 — 빼는 순서 1번).
- Sentry(S11, `/privacy` 처리위탁의 "나중" 항목 — CSP `connect-src`에도 없음).
- 알림톡·솔라피·`send-alimtalk`(spec §1 비목표).
- 실제 도메인, 리포트 자동 발송·성적 그래프·수납 연동, 다중 학원(spec §1 비목표).
- staging 프로젝트·환경별 CSP(S13 — 개원 후), CSP `'unsafe-inline'` 제거(S10 — 개원 전), Leaked password protection·세션 비활동 타임아웃(S5 — Pro), 일일 백업·월 1회 덤프(S12 — Pro).
- 퇴원생 Auth 삭제·개인정보 파기 자동화(spec §11 — v1은 상태만, Pro 전환 체크리스트로).
- 답변 고치기 화면(권한만 있음), 고아 영상 파일 정리 화면, 지도 embed.
- service_role 쓰기의 감사 actor(v2), goal 선택 `PointsProgress`(v2).

## 후속 항목 반영표

| 출처 | 항목 | 처리 |
| --- | --- | --- |
| foundation Guardian | `curl -sI /g` Referrer-Policy·X-Robots-Tag | 런북 §5, Task 3 테스트 |
| foundation Guardian | staging CSP 환경별 | v1에 없음(S13) |
| foundation Cloud | 가입·익명 끔, Realtime 공개 끔 | 런북 §3 |
| foundation Cloud | 원장 비밀번호 ≥ 12, TOTP | 런북 §6 |
| foundation Cloud | pg_cron 켜기·`cron.job` 확인 (+ foundation demo-deploy-qa 같은 줄) | 런북 §1 |
| foundation Cloud | `drop extension pg_graphql` 성공 확인 | 런북 §1 확인 쿼리 |
| foundation Cloud | Cloudflare 변수 Production·Preview | 런북 §4 |
| foundation Cloud | 2FA(Supabase·GitHub·Cloudflare) | 런북 §0 |
| foundation Cloud | 대시보드 스키마 수정 금지 | 런북 §0 금지 목록 |
| foundation Cloud | `TURNSTILE_SECRET_KEY` 테스트 비밀, 12/1 교체 | 런북 §2·§8, QA §9 |
| foundation Cloud | 함수 배포(`verify_jwt` false) 3개 | 런북 §2 |
| foundation Cloud | Turnstile 허용 호스트 | 런북 §8 |
| foundation Cloud | `/privacy` 색인 다시 켜기 | 런북 §8, QA §9 |
| foundation Cloud | `supabase link` + `db push` | 런북 §1 |
| foundation Cloud | 실제 신청 스모크, 다른 Origin 403 | 런북 §5 |
| foundation Cloud | legacy API 키 끔 여부 | 런북 §2(켜 둔다), QA §10 |
| foundation Cloud | Redirect URL 정확히 3개 | 런북 §3 |
| foundation Cloud | 원장 `private.admins`, 첫 로그인 TOTP | 런북 §6 |
| foundation Cloud | `--include-seed`·`reset --linked` 금지, `@example.test` 원장 없음 | 런북 §0·§5 |
| foundation Cloud | Email 켬·가입 끔·Confirm email·최소 8 | 런북 §3 |
| foundation Cloud | 원장 비밀번호 재설정 뒤 옛 refresh token 실패 | QA §7 |
| foundation Cloud | 20261107 전 이름 제어 문자 확인 | 런북 §1 |
| foundation Cloud | 로컬 빌드 `.env.local` (+ v1 README 줄) | Task 4 README |
| foundation demo-deploy-qa | 카톡 인앱 학부모 링크 | QA §5 |
| foundation demo-deploy-qa | 녹화·게시 동의(S9) | QA §8 |
| foundation demo-deploy-qa | 사용량 알림(S14) | 런북 §3 |
| v1 demo-deploy-qa | iOS 홈 화면·안드로이드 설치·SW·CSP 아래 오프라인 | QA §5·§6, 런북 §5 CSP |
| v1 demo-deploy-qa | 학생 비밀번호 변경이 현재 비밀번호 안 물음 | QA §3·§8 |
| v1 demo-deploy-qa | SW `/_next/static` 정리 | 이미 함(Task SW) — Task 6 `[x]` |
| v1 demo-deploy-qa | 헤더 테스트 worker-src·manifest-src 정확히 | Task 3 |
| v1 demo-deploy-qa | 첫 방문 오프라인, 오프라인 새로고침 역할 오류 | QA §6(알려진 한계), 시연 뒤 |
| v1 demo-deploy-qa | PWA 누출 테스트 범위 | Task 3 |
| v1 demo-deploy-qa | InstallGuideCard `useSyncExternalStore` | 이미 함 — Task 6 `[x]` |
| v1 demo-deploy-qa | ChangePasswordCard 이중 제출 가드 | 시연 뒤 |
| v1 demo-deploy-qa | Modal 호스트·포커스 트랩 테스트 | 시연 뒤 |
| v1 demo-deploy-qa | 로그아웃 fallback 중복 | 시연 뒤 |
| v1 demo-deploy-qa | `create-student` 제어 문자 거부 | 이미 함(`CONTROL_CHARS`) — Task 6 `[x]` |
| v1 demo-deploy-qa | Turnstile 5초 제한·non-2xx·non-JSON | Task 2 |
| v1 demo-deploy-qa | 함수 클라이언트 `Database` 타입 | 시연 뒤 |
| v1 demo-deploy-qa | 함수 클라이언트 hosted 스모크 | 런북 §5·§6 |
| v1 demo-deploy-qa | Turnstile hostname 검사 | 런북 §8(실제 키와 같이) |
| v1 demo-deploy-qa | A11y 묶음 | 시연 뒤 |
| v1 demo-deploy-qa | 시각 묶음 | 시연 뒤 |
| v1 demo-deploy-qa | StrictMode Turnstile | QA §1 |
| v1 demo-deploy-qa | 공개 전 관문 | 런북 §8, QA §9 |
| v1 demo-deploy-qa | 클라우드 옛 refresh token, 접속 토큰 ≤1h | QA §7·§11 |
| v1 demo-deploy-qa | `getUser` 네트워크 실패가 401(“로그인 만료”)로 보임 | 시연 뒤 |
| v1 demo-deploy-qa | aal2 토큰·고아 Auth 사용자·클라우드 CORS | QA §11, 런북 §9·§5 |
| v1 demo-deploy-qa | TOTP QR CSP | 런북 §6 |
| v1 demo-deploy-qa | CI `cancel-in-progress` | Task 3 |
| v1 demo-deploy-qa | 학교·보호자 두 번째 저장 | QA §2 |
| v1 demo-deploy-qa | seed-demo가 `auth.users` 모양 재사용 | 해당 없음 — 시드는 `auth.users`에 넣지 않는다(계정은 `create-student`) |
| v1 demo-deploy-qa (class-ops) | 자정 지난 탭의 `today` | QA §2 알려진 동작, 시연 뒤 |
| v1 demo-deploy-qa (class-ops) | 출결 표 최근 8회에 미래 수업 | QA §2, 시연 뒤 |
| v1 demo-deploy-qa (class-ops) | 퇴원생 지난 칸 수정 막힘 | QA §2 |
| v1 demo-deploy-qa (class-ops) | `classes` INSERT 컬럼 grant | 이미 함(guardian-records Task 4) — `[x]` |
| v1 demo-deploy-qa (class-ops) | AttendanceTable a11y, undo ABA, 오늘 카드 깜빡임, `aria-selected`·포인트 테스트 | 시연 뒤 |
| v1 class-ops 남은 줄 | 반 목록 인원이 `class_members` 직접 | 이미 `class_roster`(`classes/data/classes.ts`) — `[x]` |
| v1 demo-deploy-qa (student-app) | iOS 저장소 분리 안내 문구, 축하 맥락별 | Task 3, QA §5 |
| v1 demo-deploy-qa (student-app) | `/s` 리다이렉트 없음 | 런북 §5 |
| v1 demo-deploy-qa (videos) | Free 50MB 전역 한도 | 런북 §3·§6, QA §2 |
| v1 demo-deploy-qa (videos) | Realtime 공개 끔 상태 실시간 | QA §0·§7 |
| v1 demo-deploy-qa (videos) | `storage.buckets` videos 확인 | 런북 §1 |
| v1 demo-deploy-qa (videos) | 아이폰 영상 재생·이어 보기·앱 | QA §5 |
| v1 demo-deploy-qa (videos) | 고아 영상 파일 정리 | QA §11, v1에 없음 |
| v1 demo-deploy-qa (videos) | Pro 때 영상 1GiB | QA §10 |
| v1 demo-deploy-qa (videos) | SW production만 — 미리보기 오프라인·`?id=` 캐시·Range | QA §6 |
| v1 videos-questions | 웹푸시·원장 SW 범위 | v1에 없음 |
