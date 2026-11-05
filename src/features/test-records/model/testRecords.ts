import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

export const TEST_KINDS = ["word", "grammar"] as const;
export type TestKind = (typeof TEST_KINDS)[number];
export const TEST_KIND_LABELS: Record<TestKind, string> = {
  word: "단어",
  grammar: "문법",
};

export type TestResult = {
  id: string;
  takenOn: string;
  kind: TestKind;
  title: string;
  score: number;
  maxScore: number;
  passScore: number | null;
  memo: string | null;
};

const DATE_MESSAGE = "날짜를 골라 주세요.";
const TITLE_MESSAGE = "제목을 1~40자로 입력해 주세요. 예: Day 12";
const SCORE_MESSAGE = "점수를 0~1000 사이 숫자로 입력해 주세요.";
const MAX_MESSAGE = "만점을 1~1000 사이 숫자로 입력해 주세요.";
const OVER_MESSAGE = "점수가 만점보다 클 수 없어요. 숫자를 확인해 주세요.";
const MEMO_MESSAGE = "메모는 200자까지 쓸 수 있어요.";
const PASS_MESSAGE = "통과 기준을 0~1000 사이 숫자로 입력하거나 비워 주세요.";
const PASS_OVER_MESSAGE =
  "통과 기준이 만점보다 클 수 없어요. 숫자를 확인해 주세요.";

/** 통과 기준 기본값: 만점의 80%(올림). 원장이 바꿀 수 있어요. */
export const DEFAULT_PASS_RATE = 0.8;
export function defaultPassScore(maxScore: number): number {
  return Math.ceil(maxScore * DEFAULT_PASS_RATE);
}

function intField(min: number, message: string) {
  return z
    .string()
    .trim()
    .refine((v) => /^\d{1,4}$/.test(v), message)
    .transform(Number)
    .refine((n) => n >= min && n <= 1000, message);
}

export const testSchema = z
  .object({
    takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, DATE_MESSAGE),
    kind: z.enum(TEST_KINDS, { error: "종류를 골라 주세요." }),
    title: z
      .string()
      .trim()
      .refine((v) => {
        const n = [...v].length;
        return n >= 1 && n <= 40;
      }, TITLE_MESSAGE)
      .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE),
    score: intField(0, SCORE_MESSAGE),
    maxScore: intField(1, MAX_MESSAGE),
    passScore: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{1,4}$/.test(v), PASS_MESSAGE)
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((n) => n === null || n <= 1000, PASS_MESSAGE),
    memo: z
      .string()
      .trim()
      .refine((v) => [...v].length <= 200, MEMO_MESSAGE)
      .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE)
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((v) => v.score <= v.maxScore, {
    message: OVER_MESSAGE,
    path: ["score"],
  })
  .refine((v) => v.passScore === null || v.passScore <= v.maxScore, {
    message: PASS_OVER_MESSAGE,
    path: ["passScore"],
  });
export type TestInput = z.input<typeof testSchema>;
export type TestOutput = z.output<typeof testSchema>;

export function isBelowPass(r: { score: number; passScore: number | null }) {
  return r.passScore !== null && r.score < r.passScore;
}

/** 18/20 → "18/20 (90%)" */
export function formatScore(score: number, maxScore: number): string {
  return `${score}/${maxScore} (${Math.round((score / maxScore) * 100)}%)`;
}
