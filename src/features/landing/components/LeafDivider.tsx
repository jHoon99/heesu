"use client";

import { motion, useReducedMotion } from "motion/react";
import { dur, ease } from "@/design-system";

const PATHS = [
  "M16 22H136",
  "M184 22H304",
  "M160 34C149 27 148 14 160 6C172 14 171 27 160 34Z",
  "M160 34V14",
];

/** 시안의 320x40 구분선. 처음 보일 때 한 번 선이 그려져요. */
export function LeafDivider() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden="true" className="flex justify-center">
      <svg
        width="320"
        height="40"
        viewBox="0 0 320 40"
        fill="none"
        stroke="var(--brown-400)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="max-w-full"
      >
        {PATHS.map((d) => (
          <motion.path
            key={d}
            d={d}
            initial={reduced ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: dur.draw, ease: ease.inOut, delay: 0.2 }}
          />
        ))}
      </svg>
    </div>
  );
}
