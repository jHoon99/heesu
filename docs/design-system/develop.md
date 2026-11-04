# 개발 연결 (Next.js + Tailwind CSS)

토큰은 **CSS 변수 한 벌**이 원본이다. Tailwind는 그 변수를 가리키기만 한다 — 색을 바꿀 때는 `:root`의 변수만 고친다. 파일 원본: `code/globals.css`, `code/tailwind.config.ts`.

## 1. 글꼴 (app/layout.tsx)

`fonts/PretendardVariable.woff2`를 `app/fonts/`로 복사한다.

```tsx
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "45 920",
  display: "swap",
  variable: "--font-pretendard",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>{children}</body>
    </html>
  );
}
```

`globals.css`의 `--font-sans` 맨 앞에 `var(--font-pretendard),`를 추가하면 next/font가 최적화한 파일을 쓴다. 고운바탕(명조)은 랜딩 제목에만 쓰니 Google Fonts `@import`로 충분하다(`next/font/google`의 `Gowun_Batang`도 가능).

## 2. Tailwind v4 (Next.js 15+ 기본) — globals.css 하나로 끝

아래 전체를 `app/globals.css`에 붙인다. `@theme inline`이 Tailwind 기본 색 팔레트를 끄고 브랜드 토큰만 남긴다 — `bg-blue-500` 같은 클래스가 아예 안 생기니 디자인 밖의 색이 섞이지 않는다.

```css
/* app/globals.css — 희수영어 tokens (Tailwind CSS v4 + Next.js) */
@import "tailwindcss";
@import url("https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap");
/* Pretendard는 next/font/local 로 불러오는 것을 권장 (layout.tsx 예시는 개발 연결 섹션) */

:root {
  /* color */
  --brown-50: #FAF5EF;
  --brown-100: #F2E7DA;
  --brown-200: #E3CDB5;
  --brown-300: #CFAE8C;
  --brown-400: #B58A64;
  --brown-500: #9A6B45;
  --brown-600: #865A38;
  --brown-700: #7A4E2E;
  --brown-800: #5F3C23;
  --brown-900: #45291A;
  --beige: #F2EADC;
  --cream: #FEFDF8;
  --gray-0: #FFFFFF;
  --gray-50: #FAF8F4;
  --gray-100: #F3F0EA;
  --gray-200: #E6E1D8;
  --gray-300: #D3CCC0;
  --gray-400: #ADA496;
  --gray-500: #857C70;
  --gray-600: #665E54;
  --gray-700: #4A443D;
  --gray-800: #322D28;
  --gray-900: #211D19;
  --success-50: #E4F2E8;
  --success-500: #3E9A62;
  --success-700: #256B3E;
  --warning-50: #FDEBD6;
  --warning-500: #CC6A14;
  --warning-700: #9A4A06;
  --danger-50: #FBE7E4;
  --danger-500: #D2402F;
  --danger-700: #B42318;
  --info-50: #E4EEF7;
  --info-500: #3D7AB3;
  --info-700: #2B5C88;
  --incomplete-50: #EDE9F6;
  --incomplete-500: #7C68B5;
  --incomplete-700: #5B4691;
  --honey-50: #FDF8EA;
  --honey-100: #FBF0D6;
  --honey-300: #F0CC7A;
  --honey-500: #D9A23A;
  --honey-700: #8A5E0E;
  --bg-page: var(--beige);
  --bg-admin: var(--gray-50);
  --bg-surface: var(--cream);
  --bg-surface-raised: var(--gray-0);
  --bg-subtle: var(--brown-50);
  --border: var(--gray-200);
  --border-strong: var(--gray-300);
  --text: var(--gray-900);
  --text-muted: var(--gray-600);
  --text-subtle: var(--gray-500);
  --text-brand: var(--brown-700);
  --text-on-brand: var(--gray-0);
  --primary: var(--brown-700);
  --primary-hover: var(--brown-800);
  --primary-soft: var(--brown-100);
  --focus-ring: var(--brown-500);
  --points: var(--honey-500);
  --points-ink: var(--honey-700);
  --points-soft: var(--honey-100);
  /* font */
  --font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  --font-serif: "Gowun Batang", "Nanum Myeongjo", AppleMyungjo, serif;
  /* spacing (4px) */
  --space-0_5: 2px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  /* radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  /* shadow */
  --shadow-sm: 0 1px 2px rgba(69, 41, 26, 0.06);
  --shadow-md: 0 4px 16px rgba(69, 41, 26, 0.10);
  --shadow-lg: 0 12px 32px rgba(69, 41, 26, 0.16);
  /* size */
  --control-sm: 32px;
  --control-md: 40px;
  --control-lg: 48px;
  --table-row: 40px;
  --tabbar: 64px;
  --sidebar: 232px;
  /* motion */
  --dur-instant: 100ms;
  --dur-fast: 160ms;
  --dur-base: 240ms;
  --dur-slow: 480ms;
  --dur-slower: 720ms;
  --dur-count: 900ms;
  --dur-draw: 1600ms;
  --dur-stagger: 80ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-linear: linear;
  --rise-sm: 8px;
  --rise-md: 16px;
  --rise-lg: 28px;
  --scale-press: 0.98;
}

@theme inline {
  --color-*: initial;  /* 기본 팔레트 끄기: 브랜드 색만 쓰게 */
  --color-white: #FFFFFF;
  --color-transparent: transparent;
  --color-current: currentColor;
  --color-brown-50: var(--brown-50);
  --color-brown-100: var(--brown-100);
  --color-brown-200: var(--brown-200);
  --color-brown-300: var(--brown-300);
  --color-brown-400: var(--brown-400);
  --color-brown-500: var(--brown-500);
  --color-brown-600: var(--brown-600);
  --color-brown-700: var(--brown-700);
  --color-brown-800: var(--brown-800);
  --color-brown-900: var(--brown-900);
  --color-beige: var(--beige);
  --color-cream: var(--cream);
  --color-gray-0: var(--gray-0);
  --color-gray-50: var(--gray-50);
  --color-gray-100: var(--gray-100);
  --color-gray-200: var(--gray-200);
  --color-gray-300: var(--gray-300);
  --color-gray-400: var(--gray-400);
  --color-gray-500: var(--gray-500);
  --color-gray-600: var(--gray-600);
  --color-gray-700: var(--gray-700);
  --color-gray-800: var(--gray-800);
  --color-gray-900: var(--gray-900);
  --color-success-50: var(--success-50);
  --color-success-500: var(--success-500);
  --color-success-700: var(--success-700);
  --color-warning-50: var(--warning-50);
  --color-warning-500: var(--warning-500);
  --color-warning-700: var(--warning-700);
  --color-danger-50: var(--danger-50);
  --color-danger-500: var(--danger-500);
  --color-danger-700: var(--danger-700);
  --color-info-50: var(--info-50);
  --color-info-500: var(--info-500);
  --color-info-700: var(--info-700);
  --color-incomplete-50: var(--incomplete-50);
  --color-incomplete-500: var(--incomplete-500);
  --color-incomplete-700: var(--incomplete-700);
  --color-honey-50: var(--honey-50);
  --color-honey-100: var(--honey-100);
  --color-honey-300: var(--honey-300);
  --color-honey-500: var(--honey-500);
  --color-honey-700: var(--honey-700);
  --color-bg-page: var(--bg-page);
  --color-bg-admin: var(--bg-admin);
  --color-bg-surface: var(--bg-surface);
  --color-bg-surface-raised: var(--bg-surface-raised);
  --color-bg-subtle: var(--bg-subtle);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-text: var(--text);
  --color-text-muted: var(--text-muted);
  --color-text-subtle: var(--text-subtle);
  --color-text-brand: var(--text-brand);
  --color-text-on-brand: var(--text-on-brand);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-soft: var(--primary-soft);
  --color-focus-ring: var(--focus-ring);
  --color-points: var(--points);
  --color-points-ink: var(--points-ink);
  --color-points-soft: var(--points-soft);
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --spacing: 4px;  /* p-4 = 16px, gap-3 = 12px … 4px 단위 */
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-full: var(--radius-full);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --text-display-serif: 34px;
  --text-display-serif--line-height: 44px;
  --text-display-serif--font-weight: 700;
  --text-display-serif--letter-spacing: -0.01em;
  --text-heading-serif: 24px;
  --text-heading-serif--line-height: 34px;
  --text-heading-serif--font-weight: 700;
  --text-h1: 28px;
  --text-h1--line-height: 36px;
  --text-h1--font-weight: 700;
  --text-h1--letter-spacing: -0.02em;
  --text-h2: 22px;
  --text-h2--line-height: 30px;
  --text-h2--font-weight: 700;
  --text-h2--letter-spacing: -0.015em;
  --text-h3: 18px;
  --text-h3--line-height: 26px;
  --text-h3--font-weight: 600;
  --text-h3--letter-spacing: -0.01em;
  --text-body-lg: 17px;
  --text-body-lg--line-height: 28px;
  --text-body-lg--font-weight: 400;
  --text-body: 15px;
  --text-body--line-height: 24px;
  --text-body--font-weight: 400;
  --text-body-sm: 14px;
  --text-body-sm--line-height: 22px;
  --text-body-sm--font-weight: 400;
  --text-label: 14px;
  --text-label--line-height: 20px;
  --text-label--font-weight: 600;
  --text-table: 13px;
  --text-table--line-height: 18px;
  --text-table--font-weight: 500;
  --text-caption: 12px;
  --text-caption--line-height: 16px;
  --text-caption--font-weight: 500;
  --text-number-xl: 40px;
  --text-number-xl--line-height: 44px;
  --text-number-xl--font-weight: 800;
  --text-number-xl--letter-spacing: -0.02em;
  --ease-out: var(--ease-out);
  --ease-in-out: var(--ease-in-out);
  --ease-in: var(--ease-in);
  --animate-rise: hs-rise var(--dur-slow) var(--ease-out) both;
  --animate-fade: hs-fade var(--dur-base) var(--ease-out) both;
  @keyframes hs-rise { from { opacity: 0; transform: translateY(var(--rise-md)); } to { opacity: 1; transform: none; } }
  @keyframes hs-fade { from { opacity: 0; } to { opacity: 1; } }
}

@layer base {
  html { font-family: var(--font-sans); color: var(--text); word-break: keep-all; -webkit-font-smoothing: antialiased; }
  body { background: var(--bg-page); }
  :focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
}

/* 동작 줄이기: 모든 CSS 모션 끔 (Motion 컴포넌트는 <HeesuMotion>이 처리) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; scroll-behavior: auto !important; }
}
```

## 3. 클래스 이름 규칙

| 쓰임 | 클래스 예 |
| --- | --- |
| 페이지 배경 | `bg-bg-page` (랜딩·학생), `bg-bg-admin` (관리) |
| 카드 | `bg-bg-surface border border-border rounded-lg p-4` |
| 기본 버튼 | `h-12 px-5 rounded-md bg-primary hover:bg-primary-hover text-text-on-brand text-label` |
| 보조 글자 | `text-text-muted text-body-sm` |
| 출석 칩 | `bg-success-50 text-success-700 rounded-full text-caption` |
| 지각 칩 | `bg-warning-50 text-warning-700` |
| 결석 칩 | `bg-danger-50 text-danger-700` |
| 보강 칩 | `bg-info-50 text-info-700` |
| 숙제 미완료 칩 | `bg-incomplete-50 text-incomplete-700` |
| 포인트 숫자 | `text-number-xl text-brown-900 tabular-nums` |
| 랜딩 헤드라인 | `font-serif text-display-serif md:text-[44px] md:leading-[56px]` |
| 간격 (4px) | `p-4`=16, `gap-3`=12, `mt-12`=48 |
| 전환 | `transition-colors duration-(--dur-fast) ease-out` |
| 등장 (CSS만) | `animate-rise` |

`bg-bg-page`처럼 이름이 겹쳐 보이는 건 토큰 이름(`bg-page`)을 그대로 살렸기 때문이다. 짧게 쓰고 싶으면 `@theme`에서 `--color-page: var(--bg-page)`처럼 별칭을 하나 더 두면 된다.

## 4. 모션 (Motion + canvas-confetti)

규칙은 **모션** 섹션. 코드는 `code/motion.tsx` 하나에 다 있다(타입 검사 통과, `motion` 12 · React 18/19).

```bash
npm i motion canvas-confetti
npm i -D @types/canvas-confetti
```

`code/motion.tsx` → `components/motion.tsx`로 복사하고, `app/layout.tsx`에서 한 번 감싼다:

```tsx
import { HeesuMotion } from "@/components/motion";
// <body><HeesuMotion>{children}</HeesuMotion></body>
```

`HeesuMotion`은 `MotionConfig reducedMotion="user"`라서 '동작 줄이기'를 켠 기기에서는 이동·크기 모션이 자동으로 꺼진다. CSS 쪽은 `globals.css` 맨 아래 미디어 쿼리가 끈다.

화면별로 쓰는 것:

```tsx
// 랜딩 히어로
<Reveal><Badge>전주 · 2027년 1월 개원</Badge></Reveal>
<h1 className="font-serif text-display-serif"><TextRise lines={["한 문장씩,", "깊이 있게."]} /></h1>
<LeafDraw className="absolute right-4 top-6" />
<Reveal delay={420}><p className="text-body-lg">…</p></Reveal>

// 랜딩 섹션
<Reveal><h2 className="font-serif text-heading-serif">희수영어가 약속하는 것</h2></Reveal>
<RevealGroup>{points.map(p => <Point key={p.id} {...p} />)}</RevealGroup>
<span>반 정원 <CountUp value={8} from={1} />명</span>

// 학생 — 숙제 체크
<PointsBurst amount={hw.points} trigger={hw.done ? hw.id : 0}>
  <Badge tone="points">+{hw.points}P</Badge>
</PointsBurst>

// 학생 — 포인트
<CountUp value={points} />P
<ProgressFill value={(points / goal) * 100} className="h-full rounded-full bg-points" />
useEffect(() => { if (points >= goal && !celebrated) { celebrate(); setCelebrated(true); } }, [points]);

// 토스트·모달
<AnimatePresence>{open && <motion.div {...overlay.toast}>…</motion.div>}</AnimatePresence>

// 원장 화면: 등장 모션 없이 색 전환만
<button className="transition-colors duration-(--dur-instant) ease-out">…</button>
```

지킬 것:
- 지속 시간·이징은 `motion.tsx`의 `dur` · `ease` · `t`만 쓴다. 숫자를 직접 쓰지 않는다.
- `celebrate()`는 보상 달성 때 한 번만(같은 보상에 다시 터지지 않게 상태 저장).
- 서버 컴포넌트 페이지에서 모션 부분만 클라이언트 컴포넌트로 분리한다(`motion.tsx`는 `"use client"`).
- 원장 관리 화면에서는 `Reveal`/`TextRise`/`celebrate`를 쓰지 않는다.

## 5. 상태 값 (DB·API 공통)

컴포넌트·DB·API가 같은 문자열을 쓴다:

```ts
export type Attendance = "none" | "present" | "late" | "absent" | "makeup"; // 미입력·출석·지각·결석·보강
export type Homework = "none" | "done" | "missing";                          // 미입력·완료·미완료
// 출결 칸 클릭 순서: none → present → late → absent → makeup → none
// 숙제 칸 클릭 순서: none → done → missing → none
```

## 6. Tailwind v3를 쓸 때

`globals.css`의 `:root { … }` 블록과 `@layer base`는 그대로 두고 `@theme inline { … }` 블록만 지운다. 그다음 아래 설정을 쓴다.

```ts
// tailwind.config.ts — Tailwind CSS v3 를 쓸 때만. (v4면 globals.css 의 @theme 만으로 충분)
// spacing 은 Tailwind 기본(4px 단위: p-1=4px, p-4=16px)을 그대로 씁니다.
import type { Config } from "tailwindcss";

const config: Config = {
  "content": [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  "theme": {
    "colors": {
      "transparent": "transparent",
      "current": "currentColor",
      "white": "#FFFFFF",
      "brown-50": "var(--brown-50)",
      "brown-100": "var(--brown-100)",
      "brown-200": "var(--brown-200)",
      "brown-300": "var(--brown-300)",
      "brown-400": "var(--brown-400)",
      "brown-500": "var(--brown-500)",
      "brown-600": "var(--brown-600)",
      "brown-700": "var(--brown-700)",
      "brown-800": "var(--brown-800)",
      "brown-900": "var(--brown-900)",
      "beige": "var(--beige)",
      "cream": "var(--cream)",
      "gray-0": "var(--gray-0)",
      "gray-50": "var(--gray-50)",
      "gray-100": "var(--gray-100)",
      "gray-200": "var(--gray-200)",
      "gray-300": "var(--gray-300)",
      "gray-400": "var(--gray-400)",
      "gray-500": "var(--gray-500)",
      "gray-600": "var(--gray-600)",
      "gray-700": "var(--gray-700)",
      "gray-800": "var(--gray-800)",
      "gray-900": "var(--gray-900)",
      "success-50": "var(--success-50)",
      "success-500": "var(--success-500)",
      "success-700": "var(--success-700)",
      "warning-50": "var(--warning-50)",
      "warning-500": "var(--warning-500)",
      "warning-700": "var(--warning-700)",
      "danger-50": "var(--danger-50)",
      "danger-500": "var(--danger-500)",
      "danger-700": "var(--danger-700)",
      "info-50": "var(--info-50)",
      "info-500": "var(--info-500)",
      "info-700": "var(--info-700)",
      "incomplete-50": "var(--incomplete-50)",
      "incomplete-500": "var(--incomplete-500)",
      "incomplete-700": "var(--incomplete-700)",
      "honey-50": "var(--honey-50)",
      "honey-100": "var(--honey-100)",
      "honey-300": "var(--honey-300)",
      "honey-500": "var(--honey-500)",
      "honey-700": "var(--honey-700)",
      "bg-page": "var(--bg-page)",
      "bg-admin": "var(--bg-admin)",
      "bg-surface": "var(--bg-surface)",
      "bg-surface-raised": "var(--bg-surface-raised)",
      "bg-subtle": "var(--bg-subtle)",
      "border": "var(--border)",
      "border-strong": "var(--border-strong)",
      "text": "var(--text)",
      "text-muted": "var(--text-muted)",
      "text-subtle": "var(--text-subtle)",
      "text-brand": "var(--text-brand)",
      "text-on-brand": "var(--text-on-brand)",
      "primary": "var(--primary)",
      "primary-hover": "var(--primary-hover)",
      "primary-soft": "var(--primary-soft)",
      "focus-ring": "var(--focus-ring)",
      "points": "var(--points)",
      "points-ink": "var(--points-ink)",
      "points-soft": "var(--points-soft)"
    },
    "fontFamily": {
      "sans": [
        "var(--font-sans)"
      ],
      "serif": [
        "var(--font-serif)"
      ]
    },
    "fontSize": {
      "display-serif": [
        "34px",
        {
          "lineHeight": "44px",
          "fontWeight": "700",
          "letterSpacing": "-0.01em"
        }
      ],
      "heading-serif": [
        "24px",
        {
          "lineHeight": "34px",
          "fontWeight": "700"
        }
      ],
      "h1": [
        "28px",
        {
          "lineHeight": "36px",
          "fontWeight": "700",
          "letterSpacing": "-0.02em"
        }
      ],
      "h2": [
        "22px",
        {
          "lineHeight": "30px",
          "fontWeight": "700",
          "letterSpacing": "-0.015em"
        }
      ],
      "h3": [
        "18px",
        {
          "lineHeight": "26px",
          "fontWeight": "600",
          "letterSpacing": "-0.01em"
        }
      ],
      "body-lg": [
        "17px",
        {
          "lineHeight": "28px",
          "fontWeight": "400"
        }
      ],
      "body": [
        "15px",
        {
          "lineHeight": "24px",
          "fontWeight": "400"
        }
      ],
      "body-sm": [
        "14px",
        {
          "lineHeight": "22px",
          "fontWeight": "400"
        }
      ],
      "label": [
        "14px",
        {
          "lineHeight": "20px",
          "fontWeight": "600"
        }
      ],
      "table": [
        "13px",
        {
          "lineHeight": "18px",
          "fontWeight": "500"
        }
      ],
      "caption": [
        "12px",
        {
          "lineHeight": "16px",
          "fontWeight": "500"
        }
      ],
      "number-xl": [
        "40px",
        {
          "lineHeight": "44px",
          "fontWeight": "800",
          "letterSpacing": "-0.02em"
        }
      ]
    },
    "borderRadius": {
      "none": "0",
      "sm": "4px",
      "md": "8px",
      "lg": "12px",
      "xl": "16px",
      "full": "9999px"
    },
    "boxShadow": {
      "none": "none",
      "sm": "var(--shadow-sm)",
      "md": "var(--shadow-md)",
      "lg": "var(--shadow-lg)"
    },
    "screens": {
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px"
    },
    "extend": {
      "transitionDuration": {
        "instant": "100ms",
        "fast": "160ms",
        "base": "240ms",
        "slow": "480ms",
        "slower": "720ms"
      },
      "transitionTimingFunction": {
        "out": "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
        "in": "cubic-bezier(0.4, 0, 1, 1)"
      },
      "height": {
        "control-sm": "32px",
        "control-md": "40px",
        "control-lg": "48px",
        "row": "40px",
        "tabbar": "64px"
      },
      "width": {
        "sidebar": "232px"
      }
    }
  }
};

export default config;
```
