"use client";

import { useEffect } from "react";
import { celebrate } from "@/design-system";
import {
  celebrationKey,
  shouldCelebrate,
  withCelebrated,
} from "../model/celebration";

export function useGoalCelebration(
  studentId: string,
  points: number | undefined,
  goal: number | undefined,
): void {
  useEffect(() => {
    if (points === undefined || goal === undefined) return;
    try {
      const key = celebrationKey(studentId);
      const stored = localStorage.getItem(key);
      if (shouldCelebrate(stored, goal, points)) {
        // 기록을 먼저, 축하는 그다음: 저장이 실패하면 축하하지 않는다.
        localStorage.setItem(key, withCelebrated(stored, goal));
        void celebrate({ y: 0.2 });
      }
    } catch {
      /* 저장소를 못 쓰면 축하하지 않는다 */
    }
  }, [studentId, points, goal]);
}
