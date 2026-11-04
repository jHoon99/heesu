import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";
import { toLocalDateKey } from "@/features/sessions";

export type PaymentRecord = {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  paidAt: string | null;
  memo: string | null;
};

export type PayableStudent = {
  id: string;
  name: string;
  status: "active" | "paused" | "left";
};

export const MAX_AMOUNT = 10_000_000;
export const MAX_MEMO = 200;

/** 학원(서울) 기준 `yyyy-MM`. */
export function monthKeyOf(d: Date): string {
  return toLocalDateKey(d).slice(0, 7);
}

function parts(key: string): [number, number] {
  const [y, m] = key.split("-");
  return [Number(y), Number(m)];
}

function keyOf(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(key: string, n: number): string {
  const [y, m] = parts(key);
  const index = y * 12 + (m - 1) + n;
  return keyOf(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1);
}

/** 끝 달 포함 `size`개월, 오래된 달부터. */
export function monthWindow(end: string, size = 6): string[] {
  return Array.from({ length: size }, (_, i) => shiftMonth(end, i - size + 1));
}

export function monthLabel(key: string): string {
  const [y, m] = parts(key);
  return m === 1 ? `${y}년 ${m}월` : `${m}월`;
}

export function rangeLabel(months: string[]): string {
  const first = months[0];
  const last = months[months.length - 1];
  if (first === undefined || last === undefined) return "";
  const [fy, fm] = parts(first);
  const [ly, lm] = parts(last);
  return fy === ly
    ? `${fy}년 ${fm}월 ~ ${lm}월`
    : `${fy}년 ${fm}월 ~ ${ly}년 ${lm}월`;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function buildPaymentRows(
  students: PayableStudent[],
  payments: PaymentRecord[],
  months: string[],
): { student: PayableStudent; cells: (PaymentRecord | null)[] }[] {
  const byKey = new Map(payments.map((p) => [`${p.studentId}|${p.month}`, p]));
  return students
    .map((student) => ({
      student,
      cells: months.map((m) => byKey.get(`${student.id}|${m}`) ?? null),
    }))
    .filter((r) => r.student.status !== "left" || r.cells.some((c) => c))
    .sort((a, b) => a.student.name.localeCompare(b.student.name, "ko"));
}

const AMOUNT_MESSAGE = "금액은 0~10,000,000원 사이 숫자로 입력해 주세요.";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const paymentFormSchema = z.object({
  amount: z
    .string()
    .transform((s) => s.replace(/[,\s]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\d+$/, AMOUNT_MESSAGE)
        .transform(Number)
        .pipe(
          z
            .number()
            .int()
            .min(0, AMOUNT_MESSAGE)
            .max(MAX_AMOUNT, AMOUNT_MESSAGE),
        ),
    ),
  paidAt: z
    .string()
    .refine(
      (v) => v === "" || DATE_RE.test(v),
      "납부일을 날짜로 입력해 주세요.",
    )
    .transform((v) => (v === "" ? null : v)),
  memo: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .max(MAX_MEMO, "메모는 200자까지 쓸 수 있어요.")
        .refine((v) => !hasControlChars(v), { message: CONTROL_CHAR_MESSAGE }),
    )
    .transform((v) => (v === "" ? null : v)),
});

export type PaymentFormValues = z.output<typeof paymentFormSchema>;
