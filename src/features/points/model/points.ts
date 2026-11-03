import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

export type PointTotal = {
  studentId: string;
  name: string;
  grade: string;
  status: "active" | "paused" | "left";
  total: number;
};

export type PointEntry = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  /** 자동 포인트면 그 수업 날짜, 수동 포인트면 null. */
  sessionDate: string | null;
};

/** 재원 학생만, 누적 포인트 내림차순, 동점은 같은 순위(1, 2, 2, 4)와 이름순. */
export function rankStudents(
  totals: PointTotal[],
): (PointTotal & { rank: number })[] {
  const sorted = totals
    .filter((t) => t.status === "active")
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ko"));
  return sorted.map((t, i) => {
    let first = i;
    while (first > 0 && sorted[first - 1]?.total === t.total) first -= 1;
    return { ...t, rank: first + 1 };
  });
}

const AMOUNT_MESSAGE =
  "포인트는 -100부터 100 사이의 0이 아닌 정수로 입력해 주세요.";
const REASON_MESSAGE = "사유를 1~100자로 입력해 주세요.";

export const manualPointSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^[+-]?\d+$/, AMOUNT_MESSAGE)
    .transform(Number)
    .refine((n) => n !== 0 && n >= -100 && n <= 100, AMOUNT_MESSAGE),
  reason: z
    .string()
    .trim()
    .min(1, REASON_MESSAGE)
    .max(100, REASON_MESSAGE)
    .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE),
});

export type ManualPointInput = z.input<typeof manualPointSchema>;
export type ManualPointOutput = z.output<typeof manualPointSchema>;

export function formatAmount(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
