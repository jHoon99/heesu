전주의 중·고등 영어 학원 **희수영어 (HEESU ENGLISH)** 의 디자인 시스템. 2027년 1월 개원. 세 화면에 쓴다: 학부모가 폰으로 보는 **랜딩**, 원장이 태블릿·PC로 쓰는 **관리 화면**, 학생이 홈 화면에 추가해 쓰는 **학생 웹앱**.

분위기는 **고즈넉하고 차분하게**. 로고의 갈색·베이지·크림이 바탕이고, 학생 포인트 화면에서만 꿀색으로 살짝 즐겁게 한다. 귀엽거나 유행 타는 장식(그라데이션, 이모지, 네온, 3D 일러스트)은 쓰지 않는다.

## 화면별 원칙

| 화면 | 기기 | 배경 | 우선순위 |
| --- | --- | --- | --- |
| 랜딩 | 폰 (390px 기준) | `bg-page` 베이지 | **신뢰** — 명조 제목, 넉넉한 여백, 사실만 쓰는 문장 |
| 원장 관리 | 태블릿 가로·PC (1024px+) | `bg-admin` | **속도와 밀도** — 40px 행, 클릭 한 번에 상태 변경 |
| 학생 웹앱 | 폰 | `bg-page` 베이지 | **오늘 할 일** 먼저, 포인트로 동기 부여 |

## 글 쓰는 법

- 존댓말 "-해요"체. 학부모에게는 정중하게("알려드려요"), 학생에게는 친근하게("하늘아, 오늘도 한 문장씩!").
- 과장 금지. "최고", "1등", "100% 성적 향상" 같은 말은 쓰지 않는다. 숫자는 사실일 때만: "반 정원 8명", "주 3회 90분".
- 버튼은 동사로 끝낸다: "상담 신청하기", "결석 처리", "저장".
- 상태 이름은 고정: **출석 · 지각 · 결석 · 보강 / 숙제 완료 · 미완료 · 미입력**. 다른 말로 바꿔 쓰지 않는다.
- 오류 문구는 고치는 방법까지: "010-0000-0000 형식으로 입력해 주세요."
- 이모지는 쓰지 않는다. 아이콘으로 대신한다.

## 색

로고 원색 `#7A4E2E` = `brown-700` = `primary`. 이 색 하나에서 `brown-50`~`brown-900`을 만들었다.

- 페이지 배경은 `bg-page`(베이지 `#F2EADC`), 카드·폼은 `bg-surface`(크림 `#FEFDF8`). 관리 화면은 표가 많으니 `bg-admin`(`gray-50`)과 흰 `bg-surface-raised`.
- 기본 글자 `text`(`gray-900`), 보조 글자 `text-muted`(`gray-600`). `text-subtle`(`gray-500`)은 placeholder·비활성에만 — 본문에 쓰면 명암비가 부족하다.
- `primary` 채움 위 글자는 `text-on-brand`(흰색, 7.1:1). 베이지 위 갈색 글자는 5.9:1.
- primary 버튼은 한 화면에 하나. 나머지는 `secondary`나 `ghost`.
- 회색은 차가운 회색이 아니라 갈색이 섞인 따뜻한 회색(`gray-*`)만 쓴다.

### 의미 색 — 브랜드 갈색과 헷갈리지 않게

| 상태 | 토큰 | 아이콘 |
| --- | --- | --- |
| 출석 · 숙제 완료 | `success-50` 배경 + `success-700` 글자 | 체크 |
| 지각 | `warning-*` (주황) | 시계 |
| 결석 · 오류 | `danger-*` (빨강) | X |
| 보강 · 안내 | `info-*` (파랑) | 반복 화살표 |
| 숙제 미완료 | `incomplete-*` (보라) | 느낌표 |
| 미입력 | 점선 테두리, `text-subtle` | 가로줄 |

- 상태는 **색 + 아이콘 + 글자**를 항상 함께 쓴다. 색만으로 구분하지 않는다(색약 학부모·학생 고려).
- 갈색 계열 의미 색은 만들지 않는다. 갈색은 "브랜드·선택됨"만 뜻한다.
- `-500`은 점·아이콘·테두리용(흰 바탕 3:1 이상), 글자는 반드시 `-700`.

### 포인트 색 (학생 화면 전용)

`points`(`honey-500`), `points-ink`(`honey-700`), `points-soft`(`honey-100`). 랜딩과 관리 화면에서는 쓰지 않는다. 꿀색 채움 위 글자는 `brown-900`(5.8:1). 지각(주황)과는 칩 모양·아이콘으로 구분된다 — 포인트는 숫자와 코인, 지각은 시계 아이콘 칩.

## 글꼴

- 본문과 UI는 모두 **Pretendard** (`--font-sans`, `fonts/PretendardVariable.woff2`).
- **명조(`--font-serif`, 고운바탕)는 랜딩의 큰 제목에만**: `display-serif`(첫 화면 헤드라인 한 줄), `heading-serif`(섹션 제목). 로고의 세리프와 결을 맞춘다. 관리·학생 화면에는 쓰지 않는다(예외: 사이드바의 학원 이름, 영상 썸네일의 Unit 표기).
- 크기 단계: `h1` 28 · `h2` 22 · `h3` 18 · `body-lg` 17(랜딩 본문) · `body` 15 · `body-sm` 14 · `label` 14 · `table` 13(관리 표) · `caption` 12. 12px보다 작게 쓰지 않는다.
- 숫자(포인트, 출석률, 날짜)는 `font-variant-numeric: tabular-nums` (`.hs-num`).
- 한글 줄바꿈은 `word-break: keep-all`.

## 간격 · 모서리 · 그림자

- 간격은 **4px 단위**: `space-1`(4) `space-2`(8) `space-3`(12) `space-4`(16) `space-5`(20) `space-6`(24) `space-8`(32) `space-12`(48) `space-16`(64).
- 모바일 화면 좌우 여백 `space-4`, 랜딩 섹션 사이 `space-12`.
- 모서리: `radius-sm` 4(체크박스, 표 안 칩) · `radius-md` 8(버튼, 입력창) · `radius-lg` 12(카드) · `radius-xl` 16(모달, 학생 큰 카드) · `radius-full`(칩, 배지).
- 그림자는 최소: 카드는 `border` 테두리로 구분하고, 떠 있는 것(토스트 `shadow-md`, 모달 `shadow-lg`, 하단 탭바 `shadow-sm`)에만 그림자.
- 높이: 모바일 버튼·입력창 `control-lg`(48, 터치), 관리 화면 `control-md`(40)·`control-sm`(32), 표 행 `table-row`(40).

## 상태와 포커스

- 포커스: `focus-ring`(`brown-500`) 2px 실선, 2px 띄움. 모든 표면 위 3:1 이상.
- hover는 한 단계 진하게(`primary` → `primary-hover`) 또는 `bg-subtle`.
- 비활성은 `gray-100` 배경 + `text-subtle`.

## 모션

고즈넉하게: **짧은 거리(8–16px), 감속(`ease-out`), 튕김 없음, 한 번만.** 자세한 규칙과 타이밍은 **모션** 섹션.

- 랜딩: 헤드라인 줄마다 떠오름(`TextRise`), 잎사귀 선 그리기 하나(`LeafDraw`), 섹션 떠오름(`Reveal`), 숫자 카운트업(`CountUp`). 시작 시퀀스는 1초 안에.
- 원장 관리: 등장 모션 없음(`hs-calm`). 상태칩 색 전환 `dur-instant`만.
- 학생: 포인트 카운트업과 진행 바, 숙제 체크 시 "+P"(`PointsBurst`), **보상 달성 때만** 꽃가루(`Confetti`).
- 모든 모션은 `prefers-reduced-motion`에서 꺼진다. 모션 없이도 정보는 전부 보여야 한다.
- 쓰지 않는 것: 그라데이션·오로라 배경, 반짝이는 테두리, 3D 기울기, 커서 효과, 파티클 배경, 자동 캐러셀, 흔들기.

## 아이콘

- 24px 격자, 1.75px 선, 둥근 끝 — lucide 계열 모양. 개발에서는 `lucide-react`를 쓰면 같은 결이 나온다(번들의 `Icon`은 그 모양을 그대로 그린 최소 세트).
- 아이콘 색은 글자색을 따른다. 장식용 컬러 아이콘·이모지는 쓰지 않는다.

## 로고

- `assets/Logos`의 파일을 그대로 쓴다. 다시 그리거나 색을 바꾸지 않는다.
- 밝은 바탕(베이지·크림·흰색) 위에만 놓는다. 어두운 바탕(`brown-900` 푸터)에는 로고 대신 명조 글자 "희수영어"를 흰색으로.
- 앱 헤더·사이드바는 HS 마크(`heesu-mark.svg`) + 명조 "희수영어". 전체 로고(`heesu-logo.svg`)는 랜딩 첫 화면·인쇄물처럼 넓은 곳에.

## 컴포넌트

Forms: `Button` `Input` `Select` `Checkbox` `Radio` `ConsultForm` · Status: `StatusChip` `Badge` · Layout: `Card` · Navigation: `Tabs` `AdminSidebar` `StudentTabBar` · Overlays: `Modal` `Toast` · Data: `AttendanceTable` · Student: `VideoCard` `PointsProgress` · Motion: `Reveal` `TextRise` `LeafDraw` `CountUp` `PointsBurst` `Confetti`.
확인용 화면: `LandingScreen`(모바일) · `AdminAttendanceScreen`(태블릿 가로) · `StudentHomeScreen`(모바일).

## 이 시스템으로 화면을 만들 때

1. 화면 종류부터 정한다: 랜딩 / 원장 관리 / 학생. 배경, 컨트롤 높이, 모션 강도가 여기서 결정된다(위 표).
2. 색·글꼴·간격·모서리·그림자·모션은 토큰만 쓴다. 토큰에 없는 값이 필요하면 가장 가까운 토큰을 쓴다 — 새 값을 만들지 않는다.
3. 이미 있는 컴포넌트를 먼저 쓴다. 상태 표시는 반드시 `StatusChip`, 포인트는 `PointsProgress`·`Badge tone="points"`.
4. 확인용 화면(`LandingScreen` `AdminAttendanceScreen` `StudentHomeScreen`)을 기준 견본으로 삼는다.
5. 마지막 점검: 글자 명암비 4.5:1, 터치 영역 48px(모바일), 포커스 링, 동작 줄이기, 한국어 줄바꿈(`keep-all`).

Next.js + Tailwind로 옮기는 방법은 **개발 연결** 섹션, 모션 코드는 `code/motion.tsx`.
