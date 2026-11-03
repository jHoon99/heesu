"use client";
/**
 * 희수영어 — motion primitives for Next.js (App Router).
 * npm i motion canvas-confetti && npm i -D @types/canvas-confetti
 * Values mirror tokens.json (duration / easing / distance). Rules: the "모션" section.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  MotionConfig,
  AnimatePresence,
  useInView,
  useReducedMotion,
  animate,
  type Transition,
} from "motion/react";

/* ---------- tokens (keep in sync with tokens.json) ---------- */
export const dur = { instant: 0.1, fast: 0.16, base: 0.24, slow: 0.48, slower: 0.72, count: 0.9, draw: 1.6, stagger: 0.08 } as const;
export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  in: [0.4, 0, 1, 1],
} as const satisfies Record<string, [number, number, number, number]>;
export const rise = { sm: 8, md: 16, lg: 28 } as const;

export const t = {
  enter: { duration: dur.base, ease: ease.out } satisfies Transition,
  exit: { duration: dur.fast, ease: ease.in } satisfies Transition,
  reveal: { duration: dur.slow, ease: ease.out } satisfies Transition,
  change: { duration: dur.slow, ease: ease.inOut } satisfies Transition,
};

/**
 * Wrap the app once (app/layout.tsx): <HeesuMotion>{children}</HeesuMotion>
 * reducedMotion="user" → Motion turns transforms off when the OS asks.
 */
export function HeesuMotion({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={t.enter}>
      {children}
    </MotionConfig>
  );
}

/* ---------- Reveal: 랜딩 섹션, 처음 보일 때 한 번 ---------- */
export function Reveal({
  children,
  delay = 0,
  distance = "md",
  className,
}: { children: ReactNode; delay?: number; distance?: "sm" | "md"; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: rise[distance] }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -8% 0px" }}
      transition={{ ...t.reveal, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- RevealGroup: 항목 차례로 (최대 6개, 그 뒤는 함께) ---------- */
export function RevealGroup({ children, className }: { children: ReactNode[]; className?: string }) {
  return (
    <div className={className}>
      {children.map((c, i) => (
        <Reveal key={i} delay={Math.min(i, 5) * dur.stagger * 1000} distance="sm">
          {c}
        </Reveal>
      ))}
    </div>
  );
}

/* ---------- TextRise: 헤드라인 줄마다 ---------- */
export function TextRise({ lines, delay = 120, className }: { lines: string[]; delay?: number; className?: string }) {
  return (
    <span className={className} aria-label={lines.join(" ")} style={{ display: "block" }}>
      {lines.map((ln, i) => (
        <span key={i} aria-hidden style={{ display: "block", overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
          <motion.span
            style={{ display: "block" }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: dur.slower, ease: ease.out, delay: delay / 1000 + i * dur.stagger }}
          >
            {ln}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ---------- LeafDraw: 로고 잎사귀 가지를 선으로 (첫 화면 하나) ---------- */
const LEAF = [
  "M8 156 C40 120 70 82 84 18",
  "M84 18 C76 6 78 -4 86 -14 C96 -2 94 10 84 18 Z",
  "M78 58 C90 42 106 36 122 38 C112 54 96 62 78 58 Z",
  "M60 98 C76 88 92 88 106 96 C92 108 76 108 60 98 Z",
  "M40 128 C30 114 30 100 38 88 C48 100 48 116 40 128 Z",
];
export function LeafDraw({ size = 120, color = "var(--brown-400)", delay = 200, className }: { size?: number; color?: string; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <svg className={className} viewBox="0 -20 130 180" width={size} height={(size * 180) / 130} aria-hidden style={{ overflow: "visible" }}>
      {LEAF.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: dur.draw, ease: ease.inOut, delay: delay / 1000 + (i === 0 ? 0 : 0.3 + (i - 1) * dur.stagger * 3) }}
        />
      ))}
    </svg>
  );
}

/* ---------- CountUp: 숫자 (포인트, "반 정원 8명") ---------- */
const nf = new Intl.NumberFormat("ko-KR");
export function CountUp({ value, from = 0, className }: { value: number; from?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  const last = useRef(from);
  const [shown, setShown] = useState(reduced ? value : from);
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setShown(value); last.current = value; return; }
    const c = animate(last.current, value, {
      duration: dur.count,
      ease: ease.out,
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => { last.current = value; },
    });
    return () => c.stop();
  }, [inView, value, reduced]);
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }} aria-label={nf.format(value)}>
      <span aria-hidden>{nf.format(shown)}</span>
    </span>
  );
}

/* ---------- PointsBurst: 숙제 체크 → "+30P" 떠오르며 사라짐 ---------- */
export function PointsBurst({ amount, trigger, children }: { amount: number; trigger: unknown; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [bursts, setBursts] = useState<number[]>([]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!trigger || reduced) return;
    const id = Date.now();
    setBursts((b) => [...b, id]);
    const timer = setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), dur.slower * 1000 + 60);
    return () => clearTimeout(timer);
  }, [trigger, reduced]);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      {children}
      <AnimatePresence>
        {bursts.map((id) => (
          <motion.span
            key={id}
            aria-hidden
            className="absolute left-1/2 -top-1 whitespace-nowrap rounded-full bg-points-soft px-2 text-caption font-semibold text-points-ink"
            initial={{ opacity: 0, x: "-50%", y: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 0], y: [0, -6, -rise.lg], scale: [0.9, 1, 1] }}
            transition={{ duration: dur.slower, ease: ease.out, times: [0, 0.2, 1] }}
          >
            +{amount}P
          </motion.span>
        ))}
      </AnimatePresence>
      {bursts.length > 0 && <span role="status" className="sr-only">{amount}포인트 받았어요</span>}
    </span>
  );
}

/* ---------- celebrate: 보상 달성 때만 ---------- */
export async function celebrate(origin: { x?: number; y?: number } = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  const cs = getComputedStyle(document.documentElement);
  const colors = ["honey-500", "honey-300", "brown-400", "brown-200", "brown-700"].map((n) => cs.getPropertyValue(`--${n}`).trim());
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 32,
    gravity: 1.1,
    ticks: 160,
    scalar: 0.9,
    colors,
    disableForReducedMotion: true,
    origin: { x: origin.x ?? 0.5, y: origin.y ?? 0.3 },
  });
}

/* ---------- ProgressFill: 진행 바 (포인트, 영상) ---------- */
export function ProgressFill({ value, className }: { value: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ width: "2%" }}
      animate={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      transition={t.change}
    />
  );
}

/* ---------- Overlays: 토스트·모달 공통 ---------- */
export const overlay = {
  toast: { initial: { opacity: 0, y: rise.sm }, animate: { opacity: 1, y: 0, transition: t.enter }, exit: { opacity: 0, y: rise.sm / 2, transition: t.exit } },
  scrim: { initial: { opacity: 0 }, animate: { opacity: 1, transition: t.enter }, exit: { opacity: 0, transition: t.exit } },
  modal: { initial: { opacity: 0, y: rise.sm, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1, transition: t.enter }, exit: { opacity: 0, scale: 0.98, transition: t.exit } },
} as const;

/* ---------- Press: 버튼·카드 누름 ---------- */
export const press = { whileTap: { scale: 0.98 }, transition: { duration: dur.fast, ease: ease.out } } as const;
