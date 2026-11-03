# 희수영어 시스템 아키텍처 설계

작성일 2026-11-03. 제품 범위·일정·비용은 [개발 계획 문서](https://claude.ai/artifact/VNGKbYHhEdGqwpyH4hakiE)를 따른다. 이 문서는 **어떻게 만드는가**(구조, 라이브러리, 규칙, 개발 방식)만 다룬다. 디자인은 [희수영어 디자인 시스템](https://claude.ai/artifact/1SdKmz6qqSoYS8RyoKzYFT)과 [랜딩 시안](https://claude.ai/artifact/MUCjX1uQRraLLbbii22C3a)이 원본이다. 구현 첫 단계에서 디자인 시스템의 `tokens.json`, `code/globals.css`, `code/motion.tsx`, `components/index.d.ts`, 확인용 화면 3개, 랜딩 시안 HTML을 `docs/design-system/`에 복사해 커밋한다. 이후 작업은 저장소 안의 사본을 기준으로 한다.

## 1. 의도

원장 1명이 학생 최대 50명을 운영하는 영어 학원의 랜딩 + 관리 앱. 개발자는 Flutter 경험이 있고 이 웹 스택은 처음이다. 코드는 대부분 에이전트가 짜고 개발자가 검증한다. 그래서 구조는 **diract_flutter와 같은 결**(기능 단위 폴더, 인프라 분리, 디자인 시스템 컴포넌트화)로 맞춰, 낯선 언어에서도 "이 코드가 어디 있어야 하는지"가 바로 보이게 한다.

## 2. 목표 · 비목표 · 반목표

- **목표**: 12/1 랜딩 공개, 12/24 앱 v1. 학생 A가 학생 B의 데이터를 절대 못 보는 것. 누나가 고친 내용이 새로고침 없이 바로 보이는 것.
- **비목표**: 다중 학원(SaaS) 지원, 스토어 앱, 서버 렌더링, 결제 연동, 리포트 자동 발송(v2).
- **반목표** (동작해도 실패로 본다):
  - 50명 규모에 맞지 않는 층·추상화(usecase/domain 층, DI 컨테이너, 이벤트 버스).
  - 화면 코드에 색·간격 값이 직접 들어가는 것. 토큰 밖의 값.
  - 권한을 화면에서만 막는 것. 권한은 항상 DB(RLS)가 막는다.
  - `service_role` 키가 브라우저 번들이나 git에 들어가는 것 (저장소는 공개).

## 3. 제약

| 제약 | 결과 |
| --- | --- |
| Cloudflare Pages 정적 배포 (`output: "export"`) | 서버 코드 없음. Route Handler·Server Action·미들웨어·`next/image` 최적화 사용 불가. 로그인 뒤 화면은 전부 클라이언트 컴포넌트 |
| 동적 경로를 빌드 때 만들 수 없음 | 주소에 id를 넣지 않고 쿼리로 넘긴다: `/admin/students/detail?id=…` |
| 랜딩의 바뀌는 섹션 | 공지·반 시간표·교습비만 브라우저가 `site_content`에서 읽는다(즉시 반영 우선). 나머지 문구(소개, 원장, 수업 방식, 오시는 길)는 코드에 두고 빌드 때 HTML로 굽는다(검색 노출). 검색엔진은 바뀌는 섹션의 빌드 시점 기본 문구를 본다 |
| 서버 작업이 필요한 것 | Supabase Edge Functions(Deno)로만: 학생 계정 생성, 알림톡, 웹푸시 |
| 공개 GitHub 저장소 | 비밀값은 `.env.local`(gitignore)과 Supabase/Cloudflare 비밀 설정에만 |
| 이미 정한 스택 | Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Supabase Pro |

## 4. 폴더 구조

diract_flutter의 `app / core / design_system / features`를 그대로 옮긴다.

```
src/
  app/                      # 라우팅만. 각 page.tsx는 feature의 screen 하나를 렌더하고 끝
    (landing)/page.tsx      #   /           랜딩 (빌드 때 HTML 생성 → 검색 노출)
    (landing)/privacy/      #   /privacy    개인정보처리방침
    admin/                  #   /admin/*    원장 화면 (layout에서 admin 역할 확인)
    s/                      #   /s/*        학생 화면 (layout에서 student 역할 확인)
    g/                      #   /g#t=토큰   학부모 열람 (로그인 없음, 토큰은 # 뒤에)
    login/
    layout.tsx              #   폰트, Providers(Query, Motion, Toast)
  core/                     # 기능과 무관한 인프라. diract core/와 같은 역할
    supabase/
      client.ts             #   브라우저용 supabase-js 클라이언트 (anon 키)
      database.types.ts     #   supabase gen types 결과 (커밋, 직접 수정 금지)
      error.ts              #   에러 분류 단일 소스 → { kind, message } (diract supabase_error.dart와 같음)
    auth/                   #   세션 훅, 역할 가드 컴포넌트
    query/                  #   QueryClient, Provider
    env.ts                  #   zod로 NEXT_PUBLIC_* 검증
  design-system/            # 디자인 시스템 원본을 TSX로 옮긴 것. features·core를 import하지 않음
    components/<Name>/<Name>.tsx   # Button, Input, StatusChip, AttendanceTable … (props는 index.d.ts 그대로)
    motion/                 #   motion.tsx (Reveal, TextRise, CountUp, PointsBurst, celebrate …)
    index.ts                #   공개 API
  features/<기능>/          # diract features/<기능>/와 같은 구성
    data/                   #   Supabase 호출 + DB 행 → 모델 변환. Supabase를 부르는 유일한 곳
    model/                  #   zod 스키마와 타입 (freezed 모델 역할)
    state/                  #   TanStack Query 훅: useXxx(조회), useXxxMutation(변경), 쿼리 키
    components/             #   이 기능 전용 UI (diract widgets/)
    screen/                 #   page.tsx가 렌더하는 화면 하나 (diract screen/)
    index.ts                #   다른 곳에서 쓸 수 있는 것만 export
supabase/
  migrations/               # 스키마·RLS·함수·트리거. 모든 DB 변경은 여기로만
  tests/                    # pgTAP RLS 테스트
  functions/                # Edge Functions
  seed.sql                  # 로컬 개발용 가짜 데이터
```

**기능 목록**: `auth` `landing` `site-content` `consultations` `students` `classes` `sessions`(수업일지·숙제) `attendance` `points` `videos` `questions` `guardian` `payments`.

### 의존 규칙 (ESLint로 강제)

```
app → features → core, design-system
features/A → features/B/index.ts 만 (내부 폴더 직접 import 금지)
design-system → features·core import 금지 (외부는 react, motion, canvas-confetti, lucide-react, cva, clsx, tailwind-merge 만)
supabase-js import 는 core/supabase 와 features/*/data 에서만
```

`eslint-plugin-boundaries`로 위반 시 lint 에러. 규칙을 문서로만 두면 에이전트가 어긴다.

### Flutter ↔ 이 프로젝트 대응

| diract_flutter | heesu |
| --- | --- |
| `features/x/data/` repository | `features/x/data/` 함수 (`listSessions(classId)` 등, 순수 async) |
| freezed 모델 | zod 스키마 + `z.infer` 타입 |
| Riverpod notifier / provider | TanStack Query 훅 |
| `features/x/actions/` | 여러 단계를 묶는 흐름이 있을 때만 `state/`에 커스텀 훅으로 |
| `design_system/v2/widgets/Ds*` | `design-system/components/*` |
| `core/supabase/supabase_error.dart` | `core/supabase/error.ts` |
| go_router | `src/app/` 폴더 |

usecase·domain 층은 두지 않는다. 화면 → 훅 → data 함수 → Supabase(RLS) 세 단계가 전부다.

## 5. 데이터 흐름과 상태

- **서버 상태**: 전부 TanStack Query. 컴포넌트에서 `useEffect`로 직접 fetch하지 않는다.
- **즉시 반영**: 변경 후 해당 쿼리 키를 invalidate. 다른 사람이 바꾼 것(학생 질문 ↔ 원장 답변)은 Supabase Realtime `postgres_changes` 구독이 쿼리 캐시를 invalidate한다(broadcast·presence는 쓰지 않는다, 13장 S8). 구독은 `features/questions/state`에만 둔다.
- **클라이언트 상태**: `useState`가 기본. 화면 여러 곳에서 공유해야 할 때만 React Context. 전역 상태 라이브러리(zustand 등)는 넣지 않는다.
- **폼**: react-hook-form + zod. 스키마는 `model/`의 것을 재사용.
- **에러**: data 함수는 Supabase 에러를 그대로 던지고, 훅·화면은 `core/supabase/error.ts`로 분류해 토스트나 에러 화면에 사용자용 문구를 띄운다. 문구는 디자인 시스템 규칙("고치는 방법까지")을 따른다.

## 6. 인증과 권한

- **역할**: `admin`(원장), `student`. 학부모는 계정이 없다.
- **원장 로그인**: 이메일 + 비밀번호 + TOTP MFA 필수 (13장 S5).
- **학생 계정**: 원장이 관리 화면에서 아이디·초기 비밀번호를 만든다. 학생은 이메일이 없을 수 있으므로 내부적으로 `<아이디>@student.heesu.internal` 형태의 이메일로 Auth 사용자를 만든다. 사용자 생성은 `service_role`이 필요하므로 Edge Function `create-student`가 맡고, 함수 안에서 호출자가 admin인지 먼저 확인한다.
- **RLS**: 모든 테이블에 켠다. 공통 SQL 함수 `is_admin()`, `my_student_id()`를 두고 정책은 이것만 쓴다.
  - admin: 전체 읽기·쓰기.
  - student: 자기 행, 자기가 속한 반의 sessions·videos만 읽기. 쓰기는 `homework_checks.submitted_at`(본인, "제출했어요" 표시), `video_views`(본인), `questions`(본인 insert)만. RLS는 컬럼 단위로 못 막으므로 학생 쓰기는 `submit_homework(session_id)` RPC 하나로만 받고, 테이블 직접 update 권한은 주지 않는다.
  - 숙제 판정(`none | done | missing`)은 원장만 쓴다. 포인트는 원장 판정 기준이다.
  - anon: `site_content` 읽기, `guardian_view` RPC 실행만. 상담 신청은 테이블 insert가 아니라 Edge Function `submit-consultation`으로 받는다 (13장 S6).
- **학부모 링크**: `/g#t=<토큰>` (13장 S7). 토큰은 32바이트 랜덤, DB에는 SHA-256 해시만 저장하고 만료일을 둔다. 해시만 남으므로 링크 원문은 발급 순간에만 보인다: 원장 화면은 발급 직후 복사·알림톡 전송을 한 화면에서 끝내고, 잃어버리면 재발급(이전 토큰 폐기)한다. 브라우저는 테이블을 직접 읽지 않고 `security definer` RPC `guardian_view(token)` 하나만 호출한다. 함수가 해시·만료를 검사하고 그 학생의 출결·숙제·포인트만 돌려준다.
- **영상**: 비공개 Storage 버킷. `storage.objects` RLS가 "그 영상의 반에 속한 학생"만 signed URL 발급을 허용한다. 업로드는 원장만, TUS(resumable) 업로드. 원본 mp4를 그대로 재생한다(트랜스코딩 없음). 줌 녹화 기준 1시간 약 200MB라 Pro 프로젝트의 파일 크기 한도를 1GB로 올린다(기본 50MB).

## 7. DB 규칙

- 출결·숙제 상태 문자열은 디자인 시스템과 같게: 출결 `none | present | late | absent | makeup`, 숙제 `none | done | missing`. Postgres enum으로 만든다.
- **포인트는 DB가 계산한다.** attendance·homework_checks가 바뀌면 트리거가 그 수업의 포인트 행을 다시 계산한다(지각 없음 + 숙제 완료 = 1점). 클라이언트는 포인트를 쓰지 않는다. 규칙 세부(차감 여부)는 누나 확인 뒤 트리거만 고친다.
- 날짜 자동 변경, 예약 발송은 `pg_cron`.
- 웹푸시: `questions` insert → Database Webhook → Edge Function `notify-admin` → VAPID 웹푸시. iOS는 홈 화면에 설치한 PWA에서만 웹푸시가 되므로 `manifest.webmanifest`, 서비스워커(`public/sw.js`), 원장·학생용 "홈 화면에 추가" 안내를 v1에 포함한다.
- 알림톡(솔라피): Edge Function `send-alimtalk`만 솔라피 키를 가진다. v1 발송 대상은 학부모 링크 전달. 출결마다 보낼지 주간 요약으로 보낼지는 누나 확인 사항(계획 문서)이며, 정해지면 `pg_cron` 작업만 추가한다.
- 스키마 변경은 `supabase/migrations/`의 SQL 파일로만. 대시보드에서 직접 고치지 않는다. 마이그레이션 후 `supabase gen types`로 `database.types.ts`를 다시 만든다.
- 다중 학원용 `academy_id`는 넣지 않는다 (비목표).

## 8. 환경과 브랜치

결제는 개원 직전까지 미룬다. 개발 중에는 로컬 + 무료 클라우드 프로젝트 하나로 간다.

| | 로컬 | 클라우드 (`heesu`) |
| --- | --- | --- |
| 프론트 | `npm run dev` | Cloudflare Pages: `dev` → 미리보기 주소, `main` → 프로덕션 |
| DB | 로컬 Supabase (CLI + OrbStack) | Supabase 프로젝트 `heesu` (Seoul). 개발 중 Free, 개원 직전 Pro 업그레이드 |
| 데이터 | `seed.sql` 가짜 데이터 | 개발 중 가짜 데이터 → Pro 전환 때 비우고 실제 운영 |
| 용도 | 기능 개발, RLS 테스트, CI | 폰·PWA·아이폰 웹푸시(HTTPS 필요), 실제 네트워크, 로그인 리다이렉트, Edge Function |

- 개발은 로컬이 기본이다. 클라우드는 로컬에서 확인할 수 없는 것만 확인한다. CI는 항상 로컬 Supabase를 쓴다.
- Free 한도: DB 500MB, 파일 1GB, 파일당 50MB, 1주일 미사용 시 일시 정지. 영상은 짧은 클립으로만 테스트한다.
- **Pro 전환(개원 1~2주 전)**: 조직을 Pro로 업그레이드하고, 파일 한도를 1GB로 올리고, 테스트 데이터를 지운다. 그 전에 하지 않으면 운영 중 일시 정지·영상 업로드 실패·백업 없음.
- 운영 시작 뒤 실험용 DB가 필요해지면 그때 별도 무료 조직에 staging을 만든다. 그 전에는 Cloudflare Preview와 Production이 같은 프로젝트를 본다(운영 전이라 실제 데이터가 없음).
- `NEXT_PUBLIC_*`은 빌드 때 번들에 박히므로 값을 바꾸면 재배포해야 한다.
- 마이그레이션 적용 순서: 로컬 → 클라우드(`supabase db push`) → 그다음 `main` 머지. 프론트가 옛 스키마를 보는 시간이 없도록 마이그레이션은 하위 호환으로 쓴다(컬럼 추가 먼저, 삭제는 다음 배포에서).
- **브랜치**: `feature/<이름>`을 `dev`에서 따고 PR로 `dev`에 squash 머지. 배포할 때 `dev → main` PR. `main`에 직접 push 금지(GitHub 브랜치 보호).
- 커밋 메시지는 Conventional Commits (`feat:`, `fix:`, `chore:` …).

## 9. 라이브러리

| 용도 | 선택 | 이유 |
| --- | --- | --- |
| 서버 상태 | `@tanstack/react-query` | Riverpod의 캐시·무효화 역할. diract_admin_web에서 이미 씀 |
| 검증·모델 | `zod` | 폼·응답 검증과 타입을 한 번에 |
| 폼 | `react-hook-form` + `@hookform/resolvers` | 표준, 리렌더 적음 |
| DB·인증 | `@supabase/supabase-js` | |
| 영상 업로드 | `tus-js-client` | Supabase resumable 업로드 공식 방식 |
| 컴포넌트 변형 | `class-variance-authority` + `clsx` + `tailwind-merge` | `variant`·`size` props를 클래스로. diract_admin_web과 같음 |
| 아이콘 | `lucide-react` | 디자인 시스템이 지정 |
| 모션 | `motion` + `canvas-confetti` | 디자인 시스템 `motion.tsx`가 사용 |
| 날짜 | `date-fns` | 한국어 로케일, 트리 셰이킹 |
| 테스트 | `vitest` + `@testing-library/react` + `jsdom` | |
| RLS 테스트 | pgTAP (`supabase test db`) | 권한은 DB에서 직접 검증 |
| E2E | `@playwright/test` | 핵심 흐름 3개만 |
| 구조 강제 | `eslint-plugin-boundaries` | 4장 의존 규칙 |
| 포맷 | `prettier` + `prettier-plugin-tailwindcss` | 클래스 순서 자동 정렬 |
| 에러 추적 | `@sentry/react` | 밤에 난 버그를 아침에 알 수 있게. 정적 배포라 서버 통합이 있는 `@sentry/nextjs` 대신 브라우저 SDK. 개원 리허설 전에 연결 |

넣지 않는 것: 전역 상태 라이브러리, UI 키트(shadcn·MUI 등. 디자인 시스템이 있음), ORM(Supabase 생성 타입으로 충분), i18n(한국어만).

## 10. 개발 방식

- **TDD를 적용하는 곳**: RLS 정책(pgTAP), 포인트 트리거, `data/`의 변환 함수, `core/supabase/error.ts`, 학부모 토큰 RPC. 테스트를 먼저 쓰고 통과시킨다.
- **필수 RLS 테스트**: 테이블마다 "학생 A로 학생 B 행 조회 → 0행", "학생이 쓰기 금지 테이블에 insert → 실패", "anon이 consultations select → 0행". 새 테이블은 이 테스트 없이 머지하지 않는다.
- **컴포넌트 테스트**: 동작이 있는 것만(출결 칸 클릭 순환, 폼 검증). 모양만 있는 컴포넌트는 테스트하지 않는다.
- **E2E 3개**: 랜딩 상담 신청 → DB 저장, 원장 출결 클릭 → 학생 화면 반영, 학생 영상 재생.
- **CI** (GitHub Actions, 모든 PR): `tsc --noEmit` → `eslint` → `vitest run` → 로컬 Supabase 띄워 `supabase test db` → `next build`. 하나라도 실패하면 머지 불가.
- **생성 타입 검사**: CI에서 `supabase gen types` 결과가 커밋된 파일과 다르면 실패.
- **에이전트 작업 규칙**: 저장소 `AGENTS.md`(= `CLAUDE.md`)에 이 문서의 4장 구조, 의존 규칙, "토큰만 사용", "권한은 RLS" 규칙을 요약해 둔다. 인증·권한·DB 쓰기 코드는 한 줄로 설명하지 못하면 머지하지 않는다.
- **TypeScript**: `strict`, `noUncheckedIndexedAccess`. `any` 금지(lint 에러).

## 11. 디자인 시스템 옮기기

- 디자인 시스템 `develop.md`의 `globals.css`를 그대로 `src/app/globals.css`로 쓴다(기본 팔레트 꺼짐). Pretendard는 `next/font/local`.
- 컴포넌트는 `index.d.ts`의 props를 계약으로 보고 TSX로 다시 만든다. 미리보기 번들(`bundle.js`)은 참고만 하고 복사하지 않는다.
- 옮길 때 각 컴포넌트는 확인용 화면(`LandingScreen`, `AdminAttendanceScreen`, `StudentHomeScreen`)의 모습과 같아야 한다.
- 원장 화면에는 등장 모션이 없다. `design-system/motion`을 admin 기능에서 import하면 lint 경고.

## 12. 빌더에게 맡기는 것

- 각 기능 내부 파일 이름, 쿼리 키 모양, 컴포넌트를 쪼개는 단위.
- 마이그레이션 파일을 나누는 단위, 인덱스.
- CI 캐시 설정, Playwright 실행 환경.
- 디자인 시스템에 없는 화면 배치는 확인용 화면 3개의 패턴을 따른다.

## 13. 보안 규칙 (필수)

보안 검토(2026-11-04)에서 나온 항목이다. 6장과 겹치면 이 장이 우선한다. 공개 저장소라 마이그레이션과 RLS 정책을 누구나 읽을 수 있다는 전제로 쓴다. 각 규칙에는 pgTAP 또는 CI 검사를 붙인다.

**S1. 가입 차단과 역할 출처**
- Auth 가입을 끈다: `config.toml`의 `[auth] enable_signup = false`, 대시보드 "Allow new users to sign up" 끔, Anonymous sign-ins 끔. 사용자는 `create-student` 함수(학생)와 대시보드(원장 1명)로만 생긴다.
- 역할은 클라이언트가 쓸 수 없는 `private.admins(user_id)` 테이블과 `students.user_id`로만 판단한다. JWT의 `user_metadata`는 사용자가 직접 바꿀 수 있으므로 권한 판단에 절대 쓰지 않는다.
- pgTAP: 원장도 학생도 아닌 authenticated 사용자는 모든 테이블 0행, 모든 쓰기 실패.

**S2. 기본 권한 회수**
- 첫 마이그레이션에서 `public` 스키마의 테이블·시퀀스·함수에 대한 anon/authenticated 기본 권한을 회수하고(`alter default privileges … revoke`, 함수는 `revoke execute … from public`), 필요한 것만 명시적으로 grant한다.
- 내부 함수(트리거, 포인트 계산, `is_admin()` 등)는 API에 노출되지 않는 `private` 스키마에 둔다.
- 모든 `security definer` 함수: `set search_path = ''`, 테이블은 `schema.table`로 적는다.
- view는 `with (security_invoker = true)`만. `public`에 materialized view 금지. 쓰지 않는 `pg_graphql`은 끈다.
- pgTAP 메타 테스트: `public`의 모든 테이블 `relrowsecurity = true`; anon이 실행할 수 있는 함수 목록 = `{guardian_view}`; authenticated가 실행할 수 있는 함수 목록 = 허용 목록; 모든 `security definer` 함수에 search_path 설정.

**S3. 민감 정보 분리와 컬럼 권한**
- 원장만 보는 정보(보호자 연락처, 학교, 메모)는 `student_private` 테이블로 분리한다. 학생에게 grant하지 않는다.
- 학생은 `student_id = my_student_id()`인 행만 본다. 반 단위로 읽는 것은 `sessions`·`videos`뿐. 다른 학생의 이름·출결·포인트는 어떤 경로로도 보이지 않는다(나중에 순위표가 필요하면 별명만 돌려주는 RPC).
- 학생 insert는 컬럼 단위 grant: `grant insert (body, video_id, session_id) on questions to authenticated` + `with check (student_id = private.my_student_id())`(student_id는 기본값 트리거로 채움). 답변·상태 컬럼은 학생이 쓸 수 없다.
- `submit_homework(session_id)`는 student_id 인자를 받지 않고, 그 수업이 내 반인지 검사한다.

**S4. Edge Function 호출자 검증**
- 사용자 호출 함수: `supabase.auth.getUser(jwt)`로 검증한 뒤 DB에서 역할을 확인한다. JWT 디코드만 하거나 요청 바디의 role을 믿지 않는다.
- Database Webhook·pg_cron이 부르는 함수: Vault에 둔 공유 비밀을 헤더로 받아 상수 시간 비교로 검증한다.
- `send-alimtalk`: `student_id`만 받는다. 수신 번호와 템플릿은 서버가 정한다.
- `create-student`: 아이디 `^[a-z0-9_]{3,20}$`, role과 이메일 도메인은 함수가 고정, `email_confirm: true`(메일 발송 없음), 초기 비밀번호 최소 8자 + 첫 로그인 때 변경 강제(`app_metadata.must_change_password`).
- CORS `Access-Control-Allow-Origin`은 운영 도메인(+개발 중 미리보기 도메인)만.
- 웹푸시 본문에 이름·질문 내용을 넣지 않는다("새 질문이 도착했어요"). 잠금화면과 Apple·Google 서버를 거치기 때문이다.

**S5. 원장 계정 보호** (원장 계정 하나 = 학생 전원 데이터)
- 원장 TOTP MFA 필수. `private.is_admin()`은 `auth.jwt()->>'aal' = 'aal2'`까지 확인한다.
- 비밀번호 최소 12자, Leaked password protection 켬(Pro), refresh token 회전·재사용 감지 켬, 원장 세션 비활동 타임아웃(Pro).
- Auth redirect URL 허용 목록은 정확한 주소만(`*.pages.dev` 와일드카드 금지). PKCE 흐름.
- Supabase·GitHub·Cloudflare·솔라피 계정 모두 2FA. 대시보드 계정이 최상위 권한이다.

**S6. 상담 신청**
- anon에게 `consultations` 테이블 권한을 주지 않는다. Edge Function `submit-consultation`이 Cloudflare Turnstile 토큰을 검증하고, 전화번호별 하루 3건 제한을 확인한 뒤 service_role로 insert한다.
- 길이 제한(`check (char_length(message) <= 1000)` 등)과 전화번호 형식 검사는 DB에도 둔다.
- 동의 버전·시각을 함께 저장한다. 폼에 "보호자가 작성합니다" 확인란을 둔다(14세 미만 아동 본인의 정보 수집 방지).
- 등록으로 이어지지 않은 상담은 6개월 뒤 pg_cron이 삭제한다.

**S7. 학부모 링크**
- 토큰은 URL fragment로 넘긴다: `/g#t=<토큰>`. fragment는 서버 로그, Referer, 카카오톡 링크 미리보기 크롤러로 전송되지 않는다.
- `/g`에 `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`. RPC는 POST로만 부른다.
- 만료 90일. 퇴원·재발급 시 즉시 폐기. 실패 원인(없음·만료·폐기)을 구분하지 않는 같은 에러를 돌려준다.
- 응답은 이름, 출결, 숙제, 포인트만. 학교·연락처·다른 학생 정보 없음.

**S8. Realtime**
- `postgres_changes`만 쓴다(구독자 RLS 적용). `supabase_realtime` publication에는 `questions`, `answers`만 넣는다. `REPLICA IDENTITY FULL` 금지.
- 프로젝트 Realtime 설정에서 public 채널을 끄고, broadcast·presence는 쓰지 않는다.

**S9. 영상**
- signed URL은 재생 직전에 발급하고 만료는 3시간. 저장·캐시하지 않는다.
- storage 정책은 경로 문자열을 파싱하지 않고 `videos.storage_path`로 조인해 반 소속을 판단한다. 학생은 `storage.objects`에 insert·update·delete 권한이 없다.
- 버킷 `public = false`, `allowed_mime_types = ['video/mp4']`.
- 등록 서류에 수업 녹화·게시 동의 항목을 넣는다(누나 확인).

**S10. 프론트 보안 헤더와 XSS**
- `public/_headers`(Cloudflare Pages):
  - `Content-Security-Policy`: `default-src 'self'; connect-src 'self' https://<ref>.supabase.co wss://<ref>.supabase.co https://challenges.cloudflare.com <sentry-ingest>; frame-src https://challenges.cloudflare.com; img-src 'self' data: blob: https://<ref>.supabase.co; media-src https://<ref>.supabase.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`. `script-src`는 처음엔 `'self' 'unsafe-inline' https://challenges.cloudflare.com`으로 시작하고, 개원 전 빌드 후 인라인 스크립트 해시를 넣는 스크립트로 `'unsafe-inline'`을 없앤다. `connect-src` 제한은 처음부터 유지한다.
  - `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`(카메라·마이크·위치 끔).
- lint: `react/no-danger` 에러(`dangerouslySetInnerHTML` 금지). 사용자 입력 URL은 `https:`만 링크로 만든다. 학생 질문·상담 내용은 일반 텍스트로만 렌더한다.
- 의존성: lockfile 커밋, CI는 `npm ci`, Dependabot, GitHub Actions는 SHA로 고정, `pull_request_target` 금지.

**S11. Sentry**
- `sendDefaultPii: false`, Session Replay 끔. `beforeSend`·`beforeBreadcrumb`에서 URL 쿼리스트링·fragment·요청 바디를 지운다. user는 id만 보낸다.

**S12. 감사 로그·보존·파기** (개인정보보호법 안전성 확보조치)
- `private.audit_log`: `students`, `student_private`, `guardian_tokens`, `consultations`, `consents` 변경 시 트리거로 `auth.uid()`, 시각, 테이블, 행 id, 작업을 기록한다. append-only(update·delete 권한 없음), 1년 이상 보관.
- `consents`: 14세 미만 법정대리인 동의 기록(대리인, 일시, 방법, 동의서 버전).
- 퇴원 처리: Auth 사용자 삭제, 학부모 토큰 폐기, 개인정보 컬럼 파기 또는 익명화(보존 의무가 있는 수납 기록만 기간 보존), Storage 파일은 별도 삭제.
- 개인정보처리방침에 처리위탁·국외이전(Supabase, Cloudflare, Sentry, 솔라피)과 백업 보관 기간을 적는다.
- 백업: Pro 일일 백업(7일). 개원 후 월 1회 암호화 덤프를 저장소 밖에 보관.

**S13. 미리보기 배포와 운영 데이터**
- 개원 후에는 미리보기 배포가 운영 DB를 보지 않게 한다: staging 프로젝트를 만들고 Cloudflare Preview 변수를 staging으로 바꾼다. 그 전까지(운영 데이터 없음)는 같은 프로젝트를 써도 된다.
- 운영 로그인은 운영 도메인에서만(S5의 redirect 허용 목록).

**S14. 공개 저장소 위생**
- gitignore: `.env*`, `supabase/.temp`, `supabase/.branches`, `.wrangler/`.
- `config.toml`의 비밀값은 `env(...)`로만. `seed.sql`·테스트에는 가짜 이름·번호만. 운영 데이터 덤프, 원장 이메일 커밋 금지.
- GitHub secret scanning + push protection 켬, CI에 gitleaks.
- Supabase 사용량 알림을 켠다(anon 엔드포인트 반복 호출 감지).

