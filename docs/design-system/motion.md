# 모션

희수영어의 모션은 **고즈넉하게**: 짧은 거리, 조용한 감속, 튕김 없음. 움직임은 내용을 돋보이게 할 때만 쓰고, 움직임 자체가 볼거리가 되지 않게 한다. 이 섹션의 규칙과 `duration` · `easing` · `distance` 토큰만으로 구현한다.

## 원칙 다섯 가지

1. **감속으로 멈춘다.** 들어오는 것은 `ease-out`, 제자리에서 바뀌는 것은 `ease-in-out`, 나가는 것은 `ease-in`. 스프링 튕김·탄성·흔들림은 쓰지 않는다.
2. **조금만 움직인다.** 거리는 `rise-sm`(8px)·`rise-md`(16px)까지. 화면 밖에서 날아오지 않는다. 크기 변화는 누를 때 `scale-press`(0.98)뿐.
3. **한 번만.** 랜딩의 Reveal·TextRise·LeafDraw는 처음 보일 때 한 번. 스크롤을 올렸다 내려도 다시 재생하지 않는다. 무한 반복 애니메이션은 로딩 스켈레톤 말고는 없다.
4. **opacity와 transform만.** width·height·top·margin을 애니메이션하지 않는다(폰에서 끊긴다). 예외: 진행 바 width.
5. **동작 줄이기를 존중한다.** `prefers-reduced-motion: reduce`면 모든 모션을 끄고 최종 상태를 바로 보여 준다. 꽃가루·+P 떠오르기는 아예 그리지 않는다. 정보는 모션 없이도 전부 전달돼야 한다.

## 토큰

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `dur-instant` | 100ms | 관리자 상태칩 전환, 체크박스 |
| `dur-fast` | 160ms | hover, 포커스, 탭 밑줄, 누름, 나가는 것 |
| `dur-base` | 240ms | 토스트·모달 등장 |
| `dur-slow` | 480ms | 랜딩 Reveal, 진행 바 |
| `dur-slower` | 720ms | 헤드라인 줄 떠오르기, +P 떠오르기 |
| `dur-count` | 900ms | 숫자 카운트업 |
| `dur-draw` | 1600ms | 잎사귀 선 그리기 |
| `dur-stagger` | 80ms | 차례로 나오는 간격 (최대 6개) |
| `ease-out` | cubic-bezier(0.22, 1, 0.36, 1) | 기본 — 들어오는 모든 것 |
| `ease-in-out` | cubic-bezier(0.65, 0, 0.35, 1) | 진행 바, 선 그리기, 탭 |
| `ease-in` | cubic-bezier(0.4, 0, 1, 1) | 나가는 것 |

새 값을 만들지 않는다. 애매하면 `dur-base` + `ease-out`.

## 화면별 규칙

### 랜딩 (학부모 · 폰)
목표는 **신뢰**. 처음 3초가 단정해야 한다.

| 순서 | 무엇 | 컴포넌트 | 타이밍 |
| --- | --- | --- | --- |
| 1 | 개원 배지 | `Reveal` immediate | 0ms |
| 2 | 헤드라인 줄마다 | `TextRise` | 120ms 시작, 줄마다 +80ms, 각 720ms |
| 3 | 잎사귀 가지 | `LeafDraw` (`brown-400`) | 200ms 시작, 1600ms — 첫 화면에 단 하나 |
| 4 | 소개 문단 | `Reveal` | 420ms |
| 5 | 버튼 | `Reveal` | 560ms |
| 스크롤 | 섹션 제목 → 내용 | `Reveal` (화면 20% 들어오면) | 항목마다 +80ms |
| 스크롤 | "반 정원 8명" 숫자 | `CountUp` | 900ms |

- 헤드라인이 다 보이기 전에 버튼을 누를 수 없으면 안 된다: 전체 시작 시퀀스는 1초 안에 끝낸다(잎사귀 제외).
- 폼은 움직이지 않는다. 오류 문구만 `dur-fast`로 나타난다. 흔들기(shake) 금지.
- 패럴랙스, 마우스 따라다니기, 배경 영상, 자동 슬라이드 캐러셀은 쓰지 않는다.

### 원장 관리 (태블릿 · PC)
목표는 **속도**. 루트에 `hs-calm` 클래스를 달아 등장 모션을 끈다.

- 상태칩 클릭 → 색만 `dur-instant`로 바뀐다. 칩이 커지거나 튀지 않는다.
- 저장 결과는 `Toast` (`dur-base` 등장, 4초 뒤 `dur-fast` + `ease-in`으로 사라짐).
- 탭·반 전환은 즉시. 표가 페이드되지 않는다.
- 모달만 `dur-base`로 등장(배경 페이드 + 8px 떠오름).

### 학생 웹앱 (폰)
목표는 **오늘 할 일 + 작은 보상감**. 재미는 포인트에만 몰아 준다.

| 순간 | 모션 | 컴포넌트 |
| --- | --- | --- |
| 홈 진입 | 카드가 8px 떠오르며 80ms 간격 (최대 6개) | `.hs-stagger` |
| 홈 진입 | 포인트 숫자 카운트업 + 진행 바 채워짐 | `PointsProgress` (내장) |
| 숙제 체크 | 체크 `dur-instant`, 제목 회색 `dur-fast`, "+30P"가 28px 떠오르며 사라짐 | `PointsBurst` |
| 숙제 체크 | 포인트 숫자가 새 값까지 카운트업, 바가 늘어남 | `PointsProgress` |
| 보상 달성 | 꽃가루 한 번 (꿀색·갈색 60조각, 1.6초) + 포인트 토스트 | `Confetti` + `Toast tone="points"` |
| 영상 진행 | 진행 바만 (`dur-slow`) | `VideoCard` |

- 꽃가루는 **보상 달성 때만**. 숙제 하나 체크할 때마다 터뜨리지 않는다(금방 시시해진다).
- 랭킹 순위가 바뀌어도 자리를 섞는 애니메이션은 하지 않는다. 숫자만 카운트업.

## 하지 않는 것

반짝이는 테두리, 그라데이션·오로라 배경, 글리치·타이핑 효과, 3D 기울기, 마우스 커서 효과, 파티클 배경, 스크롤 고정(pin) 연출, 페이지 전환 와이프, 로딩 스피너 대신 쓰는 캐릭터 애니메이션, 무한 반복 둥둥 효과.

## 구현

- **이 시스템의 미리보기**: `bundle.css`의 `.hs-reveal` `.hs-textrise` `.hs-leaf` `.hs-burst` `.hs-stagger` `.hs-calm` 클래스와 `Reveal` `TextRise` `LeafDraw` `CountUp` `PointsBurst` `Confetti` 컴포넌트 (CSS + IntersectionObserver, 의존성 없음).
- **Next.js 앱**: `code/motion.tsx`를 `components/motion.tsx`로 복사. [Motion](https://motion.dev) (`npm i motion`) 기반이고, 같은 토큰 값과 동작 줄이기 처리가 들어 있다. 꽃가루는 `npm i canvas-confetti`. 자세한 연결은 **개발 연결** 섹션.
