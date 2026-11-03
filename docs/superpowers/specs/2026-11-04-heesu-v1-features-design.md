# 희수영어 v1 기능 설계

작성일 2026-11-04. 구조·보안 규칙은 [아키텍처 설계](2026-11-03-heesu-architecture-design.md)(이하 "아키텍처")가 원본이고, 이 문서는 **무엇을 만드는가**(화면, 동작, 데이터)를 정한다. 기반 작업은 끝났다(`dev`, [후속 항목](../plans/foundation-followups.md)). 디자인은 `docs/design-system/`(README, 확인용 화면 3개, `landing-mock.html`)이 원본이다.

## 1. 목표와 일정

- **2026-11-07(토)까지** v1 전체를 클라우드 무료 프로젝트에 올려, 11-08(일) 원장(누나)이 폰·PC로 직접 써보고 피드백을 준다. 실제 정보(원장 이력, 주소, 교습비 등)는 그때 받는다. 그 전까지는 디자인 시안의 빈칸(점선 자리표시) 그대로 둔다.
- 이후 며칠: 개발자가 QA 체크리스트로 테스트하고 수정 → 12/1 랜딩 공개, 1월 개원.
- **비목표(v1)**: 알림톡 발송(카카오 채널 승인 필요), 실제 도메인, 리포트 자동 발송·성적 그래프·수납 연동(v2), 다중 학원.
- **반목표**: 시연용이라고 보안 규칙(아키텍처 13장)을 건너뛰는 것. 가짜 데이터라도 규칙은 운영과 같다.

## 2. 사용자와 주소

| 사용자 | 주소 | 로그인 | 기기 |
| --- | --- | --- | --- |
| 방문자·학부모 | `/`, `/privacy` | 없음 | 폰 |
| 원장 | `/admin/*` | 이메일+비밀번호+TOTP | 태블릿 가로·PC(1024px+) |
| 학생 | `/s/*` | 아이디+비밀번호 | 폰, 홈 화면에 추가(PWA) |
| 학부모 | `/g#t=<토큰>` | 없음(토큰) | 폰 |
| 공통 | `/login` | | |

동적 id는 쿼리로 넘긴다(`/admin/students/detail?id=…`). 로그인 후 역할에 따라 `/admin` 또는 `/s`로 보낸다. 역할이 맞지 않는 주소에 들어오면 자기 홈으로 보낸다(권한 자체는 RLS가 막고, 이건 화면 이동일 뿐).

## 3. 랜딩 (`/`)

`docs/design-system/landing-mock.html`을 그대로 구현한다(섹션: 헤더 탭, 첫 화면, 소개, 원장, 수업 방식, 반·시간표, 수강료, 오시는 길, 상담 신청, 푸터, 모바일 하단 CTA 바). 모션은 디자인 시스템 랜딩 규칙(TextRise, LeafDraw, Reveal, CountUp).

- **코드에 두는 문구**(빌드 때 HTML): 소개, 원장, 수업 방식, 오시는 길. 아직 모르는 값은 시안의 점선 자리표시 컴포넌트(`Blank`)로 둔다.
- **DB에서 읽는 섹션**(`site_content`, 즉시 반영): 공지(있을 때만 첫 화면 아래 띠로), 반·시간표, 수강료·교재비, 푸터의 법정 표시 4가지(교습비 등, 등록번호, 학원 명칭, 교습과목 — 학원법 15조). 값이 없으면 자리표시. 빌드 HTML에는 기본 자리표시가 들어가고 브라우저가 덮어쓴다.
- **상담 신청 폼**: 학부모 성함, 연락처(010-0000-0000 형식, 숫자만 입력 허용), 학생 학년(중1~고3), 궁금한 점(선택, 1000자), "보호자가 작성합니다" 확인(필수), 개인정보 수집·이용 동의(필수, 내용 보기 → `/privacy#consult`). Cloudflare Turnstile 위젯(데모는 Cloudflare 테스트 키 `1x00000000000000000000AA`, 서버 테스트 비밀 `1x0000000000000000000000000000000AA`). 제출 → Edge Function `submit-consultation`(아키텍처 S6: Turnstile 검증, 같은 번호 하루 3건 제한, service_role insert, 동의 버전·시각 저장). 성공 시 폼 자리에 "신청이 접수됐어요. 원장이 직접 연락드릴게요." 카드, 실패 시 고치는 방법이 담긴 토스트.
- **전화로 문의하기**: `tel:` 링크(번호는 `site_content`).
- **오시는 길**: 지도는 v1에서 정적 자리표시 + "지도 앱에서 보기" 링크(네이버 지도 검색 URL, 주소가 있을 때). iframe 없음(CSP 유지).
- **`/privacy`**: 개인정보처리방침 초안(수집 항목·목적·보관 기간·처리위탁·국외이전: Supabase, Cloudflare, Sentry(나중), 솔라피(나중)·파기·14세 미만 법정대리인 동의·문의처 자리표시). 법률 검토 전 초안임을 문서 상단 주석에만 적고 화면에는 쓰지 않는다.
- SEO: `<title>`, description, Open Graph(로고 `public/brand/full_beige.svg`를 PNG로 변환한 이미지), `robots.txt`(`/admin`, `/s`, `/g` 차단), `sitemap.xml`(`/`, `/privacy`).

## 4. 원장 화면 (`/admin`)

디자인 시스템 `AdminAttendanceScreen` 견본: 왼쪽 `AdminSidebar`(232px, 1024px 미만 접힘), 페이지 배경 `bg-admin`, 등장 모션 없음, 컨트롤 40px.

**사이드바 메뉴**: 오늘 · 출결·숙제 · 수업일지 · 학생 · 반 · 영상 · 질문(미답변 수 배지) · 상담(새 신청 수) · 포인트 · 결제 · 랜딩 관리 · 설정.

| 화면 | 동작 |
| --- | --- |
| 로그인 `/login` | 이메일·비밀번호 → TOTP 미등록이면 등록 화면(QR + 코드 확인), 등록돼 있으면 6자리 코드. aal2가 돼야 `/admin` 진입 |
| 오늘 | 오늘 수업이 있는 반 목록(요일 기준 `classes.schedule`), 각 반의 출결 입력 진행률, 미답변 질문 수, 새 상담 수 |
| 출결·숙제 | 반 선택 → `AttendanceTable`(행=학생, 열=최근 수업 날짜). 출결 칸 클릭 순환 `none→present→late→absent→makeup→none`, 숙제 칸 `none→done→missing→none`(디자인 시스템 5장). 저장은 클릭마다 즉시(낙관적 업데이트, 실패 시 되돌리고 토스트) |
| 수업일지 | 반·날짜로 수업(`sessions`) 생성·수정: 수업 내용(요약), 숙제 내용, 숙제 마감일(기본 다음 수업일). 같은 반·같은 날짜는 하나 |
| 학생 | 목록(이름, 학년, 학교, 반, 상태 재원/휴원/퇴원, 포인트) + 추가·수정. 추가 = Edge Function `create-student`(아이디 `^[a-z0-9_]{3,20}$`, 초기 비밀번호 8자+, 첫 로그인 때 변경 강제). 상세: 기본 정보, 반 배정(여러 반), 보호자 연락처·메모(`student_private`), 학부모 링크 발급/재발급, 최근 출결·숙제·포인트 내역, 결제 기록 |
| 반 | 목록 + 추가·수정: 이름, 중등/고등, 요일·시간(`schedule` = `[{ "day": 1-7, "start": "HH:MM", "end": "HH:MM" }]`), 정원 |
| 영상 | 반별 목록, 업로드(제목, 반, mp4, TUS 이어 올리기, 진행률), 공개일, 시청 현황(학생별 본 시간/전체 길이) |
| 질문 | 미답변 먼저. 질문(학생 이름, 연결된 영상·수업, 내용) + 답변 작성. Realtime으로 새 질문이 바로 뜬다 |
| 상담 | 신청 목록(새 신청 먼저), 상태(새 신청/연락함/등록/보류), 메모 |
| 포인트 | 순위표(1~3등 강조), 학생별 내역, 수동 가감(사유 필수) |
| 결제 | 월별 표: 학생 × 월, 금액·납부일·메모 수기 입력 |
| 랜딩 관리 | `site_content` 편집: 공지(제목·본문·노출 on/off), 반·시간표 표시용 목록, 수강료·교재비, 전화번호, 주소, 법정 표시 4가지. 저장하면 랜딩에 바로 반영 |
| 설정 | 비밀번호 변경, 웹푸시 알림 켜기(시간이 남으면) |

## 5. 학생 화면 (`/s`)

디자인 시스템 `StudentHomeScreen` 견본: 모바일, 하단 `StudentTabBar`(홈 · 숙제 · 영상 · 질문 · 내 정보), 배경 `bg-page`.

| 화면 | 동작 |
| --- | --- |
| 첫 로그인 | 비밀번호 변경 강제 |
| 홈 | "하늘아, 오늘도 한 문장씩!" 인사, 오늘 숙제 카드(최근 수업의 숙제 + 아직 미완료인 지난 숙제), 포인트 카드(`PointsProgress`: 누적 포인트, 다음 보상까지, 순위 숫자만), 새 영상 |
| 숙제 | 수업별 숙제 목록. 각 숙제에 "제출했어요" 버튼(`submit_homework(session_id)` RPC, 제출 시각 기록). 판정(완료·미완료)은 원장이 매긴 값을 칩으로 표시. 원장이 미완료로 둔 숙제는 완료될 때까지 목록 위쪽에 남는다 |
| 영상 | 내 반 영상 목록(`VideoCard`, 진행률), 재생: 재생 직전 signed URL(3시간), 10초마다 시청 위치 저장(`video_views`), 영상 아래 "질문하기" |
| 질문 | 내 질문 목록 + 답변(Realtime 갱신), 새 질문(영상·수업 선택 가능) |
| 내 정보 | 이름, 반, 포인트 내역, 비밀번호 변경, 로그아웃, "홈 화면에 추가" 안내 |

포인트가 오르면 `CountUp`, 보상 목표 달성 시 한 번만 `celebrate()`.

## 6. 학부모 화면 (`/g#t=<토큰>`)

로그인 없음. fragment의 토큰으로 `guardian_view(token)` RPC 한 번 호출. 보여주는 것: 학생 이름, 최근 4주 출결·숙제(날짜별 칩), 이번 주 수업 내용·숙제, 누적 포인트. 토큰이 없거나 틀리거나 만료면 같은 문구 "링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요." 토큰 만료 90일, 재발급 시 이전 토큰 폐기(아키텍처 S7). 원장은 발급 직후 링크 복사 버튼으로 카톡에 직접 보낸다.

## 7. 데이터 모델

모든 테이블 RLS + pgTAP(아키텍처 S1~S3). 상태 값은 디자인 시스템과 같은 Postgres enum.

| 테이블 | 핵심 컬럼 | 접근 |
| --- | --- | --- |
| `students` | id, user_id(auth), name, grade(중1~고3), status(active/paused/left), joined_at | admin 전체 / 학생 본인 행 |
| `student_private` | student_id, school, guardian_name, guardian_phone, memo | admin만 |
| `classes` | id, name, level(middle/high), schedule jsonb, capacity | admin 전체 / 학생은 소속 반 |
| `class_members` | class_id, student_id | admin / 학생 본인 행 |
| `sessions` | id, class_id, date, summary, homework, homework_due | admin / 학생 소속 반. unique(class_id, date) |
| `attendance` | session_id, student_id, status `attendance_status` | admin / 학생 본인 |
| `homework_checks` | session_id, student_id, status `homework_status`, submitted_at | admin(status) / 학생 본인 읽기, `submit_homework` RPC로 submitted_at만 |
| `points` | id, student_id, session_id?, amount, reason, created_at | admin / 학생 본인. 자동분은 트리거(present + done = 1점, 조건 깨지면 회수) |
| `videos` | id, class_id, title, storage_path, duration_seconds, published_at | admin / 학생 소속 반 + 공개일 지난 것 |
| `video_views` | video_id, student_id, watched_seconds, updated_at | admin / 학생 본인(insert·update) |
| `questions` | id, student_id, video_id?, session_id?, body(≤2000), created_at | admin / 학생 본인(insert는 body·video_id·session_id만) |
| `answers` | id, question_id, body, created_at | admin 쓰기 / 질문한 학생 읽기 |
| `consultations` | id, parent_name, phone, grade, message, status, memo, consent_version, consented_at, created_at | admin만(insert는 Edge Function) |
| `payments` | id, student_id, month(YYYY-MM), amount, paid_at, memo | admin만 |
| `guardian_tokens` | student_id, token_hash, expires_at, revoked_at | admin만, 조회는 `guardian_view` RPC |
| `site_content` | key, value jsonb, updated_at | anon·authenticated 읽기 / admin 쓰기 |
| `consents` | student_id, guardian_name, method, version, consented_at | admin만 |
| `push_subscriptions` | user_id, endpoint, keys | 본인 / `notify-admin`은 admin 구독만(시간 남으면) |

순위(학생 화면 숫자): `my_rank()` RPC가 내 순위 숫자만 돌려준다. 다른 학생 이름·점수는 학생에게 보이지 않는다.

**감사 로그**(S12): `students`, `student_private`, `guardian_tokens`, `consultations`, `consents`, `payments`.

## 8. 시연 환경 (토요일까지)

- 클라우드 Supabase `heesu`(Free)에 마이그레이션 적용(`supabase db push`), Edge Functions 배포, Storage 버킷 `videos`(비공개, mp4, 무료 한도 50MB라 짧은 클립).
- 시연 데이터: 가짜 학생 8명(2개 반), 수업 4주치, 출결·숙제·포인트, 짧은 영상 2개, 질문 2개, 상담 2건. 이름·번호는 명백한 가짜(예: "김하늘", 010-0000-00xx). 클라우드 시드는 별도 스크립트(`supabase/seed-demo.sql`)로 넣고, 개원 전 Pro 전환 때 지운다.
- 원장 계정: 개발자가 대시보드에서 만든 뒤 `private.admins`에 넣는다(시연 때 누나 폰으로 TOTP 등록). 시연용 학생 계정 2개.
- 배포: `dev` → Cloudflare 미리보기, 시연 직전 `dev → main` 머지로 `heesu.pages.dev`.
- **사용자가 직접 할 일**(목록을 QA 문서에 넣는다): 대시보드 Auth 가입·익명 로그인 끄기, Realtime 공개 접근 끄기, 원장 계정 생성, Cloudflare 환경 변수 확인.

## 9. QA 체크리스트

마지막 계획의 산출물로 `docs/qa/2026-11-v1-qa.md`를 만든다: 화면별 수동 테스트 단계(기대 결과 포함), 보안 확인(다른 학생 데이터 접근 시도, 학부모 링크 위조, 가입 시도), 폰 확인(아이폰 Safari 홈 화면 추가, 안드로이드 Chrome), 누나에게 받을 정보 목록, 개원 전 Pro 전환 체크리스트.

## 10. 계획 분할(빌드 순서)

각 계획은 독립적으로 테스트 가능한 결과를 낸다. 앞 계획의 후속 항목(`foundation-followups.md`)은 해당 계획이 가져간다.

1. **landing**: 랜딩, `/privacy`, `site_content`(읽기), `consultations` + `submit-consultation`, 토스트 Provider, 폰트 최적화, Edge Function 툴링(Deno check, tsconfig/ESLint 제외).
2. **auth-admin-base**: `/login`(원장 TOTP, 학생 첫 로그인 비밀번호 변경), 역할별 이동, 원장 셸(사이드바), `students`·`student_private`·`classes`·`class_members` + `create-student`, 학생·반 화면.
3. **class-ops**: `sessions`, `attendance`, `homework_checks`, `points`(트리거), 출결·숙제 표, 수업일지, 포인트 화면, 오늘 화면.
4. **student-app**: 학생 셸·탭바, 홈·숙제(`submit_homework`)·내 정보, `my_rank()`, PWA(manifest, 서비스워커, 아이콘).
5. **videos-questions**: Storage 버킷·정책, 업로드(TUS), 재생·시청 기록, `questions`·`answers` + Realtime, 원장 질문 화면, (시간 남으면) 웹푸시.
6. **guardian-records**: `guardian_tokens` + `guardian_view`, `/g`, 상담 목록, 결제, 랜딩 관리(`site_content` 쓰기), `consents`, 감사 로그 연결.
7. **demo-deploy-qa**: 클라우드 적용·배포, 시연 데이터, QA 체크리스트, `dev → main`.

## 11. 빌더 검토 후 결정 (제 판단, 일요일 누나 확인)

| 항목 | 결정 |
| --- | --- |
| 수업(`sessions`) 생성 | 자동 생성(cron) 없음. "오늘" 화면에 `schedule`상 오늘 수업이 있는 반마다 **"수업 시작"** 버튼 → 오늘 날짜 수업 행 생성(이미 있으면 그 수업으로 이동). 출결 표에도 "오늘 수업 추가" 버튼. 수업일지에서 다른 날짜로도 만들 수 있다. 숙제 마감 기본값 = `schedule`상 다음 수업일 |
| 토요일까지 못 하면 빼는 순서 | 웹푸시 → 결제 → 랜딩 관리 화면(대신 시드로 `site_content` 채움) → 영상 업로드 화면(대신 스크립트로 업로드) → 상담 상태 관리. 랜딩·로그인·학생·반·출결·숙제·수업일지·학생 홈·포인트·학부모 링크는 반드시 |
| 보상 목표 | `site_content` 키 `points_goal`(기본 30점, 랜딩 관리에서 수정). `PointsProgress`의 goal로 쓴다. 축하는 목표별로 한 번: 브라우저 `localStorage`에 달성한 목표 값을 기록 |
| 퇴원(`left`) | v1은 상태만 바꾼다. 트리거로 그 학생의 학부모 토큰 즉시 폐기. `private.my_student_id()`는 `status <> 'left'`인 학생만 돌려줘서 퇴원생은 로그인해도 데이터가 0행. 개인정보 파기·Auth 삭제는 Pro 전환 체크리스트(QA 문서)로 |
| 포인트 규칙 | 출결 `present` 또는 `makeup` + 숙제 `done` = 자동 1점. `late`·`absent`·`none`은 0점. 조건이 깨지면 그 수업의 자동 포인트 행을 **삭제**(수동 가감 행은 그대로). 수동 가감은 `session_id` 없이 사유 필수 |
| 순위 `my_rank()` | 학원 전체, `status = 'active'` 학생만, 누적 포인트 기준, 동점은 같은 순위(1,2,2,4). 돌려주는 값: `{ rank, total }`. 학생 화면 문구 "전체 8명 중 2등" |
| 학생 비밀번호 초기화 | 포함. Edge Function `reset-student-password`(원장만, 새 초기 비밀번호 + 첫 로그인 변경 강제) |
| 법정대리인 동의 입력 | 학생 상세에 "보호자 동의" 칸(보호자 이름, 방법: 서면/전화/카톡, 동의서 버전, 일시) → `consents` |
| 미등록 상담 6개월 뒤 삭제 | guardian-records 계획에서 `pg_cron` |

**기술 보정**

- **감사 로그**: `private.audit()`이 트리거 인자로 키 컬럼 이름을 받는다(`create trigger … execute function private.audit('student_id')`, 기본 `'id'`). 첫 사용 전에 AFTER·ROW가 아니면 예외(후속 항목). 키 컬럼이 없는 테이블에 붙이면 테스트가 실패해야 한다.
- **첫 로그인 비밀번호 변경**: `app_metadata` 대신 `students.must_change_password boolean`. 학생이 비밀번호를 바꾼 뒤 RPC `password_changed()`가 본인 행만 false로 바꾼다(다른 컬럼은 못 바꿈). 학생 화면은 이 값이 true면 비밀번호 변경 화면만 보여준다. 원장 계정은 대상 아님.
- **Edge Function 원장 확인**: `supabase.auth.getClaims(jwt)`로 서명 검증된 클레임을 받아 `aal = 'aal2'`를 확인하고, service_role 클라이언트로 `private.admins`에 `sub`가 있는지 확인한다. 둘 다 통과해야 한다(`create-student`, `reset-student-password`).
- **허용 주소**: Auth redirect·CORS 허용 목록 = `http://localhost:3000`, `https://dev.heesu.pages.dev`(dev 브랜치 별칭), `https://heesu.pages.dev`. 커밋별 미리보기 주소(`<hash>.heesu.pages.dev`)에서는 로그인하지 않는다. 와일드카드 금지(S5).
- **Turnstile 테스트 키**: 시연 동안 `heesu.pages.dev`에서도 테스트 키를 쓴다. 12/1 전에 실제 키로 바꾸는 항목을 QA 문서에 넣는다.
- **학생의 `classes` 읽기**: 소속 반 행만(반 이름·시간표). 다른 학생 정보는 없으므로 S3 취지 안이다.
