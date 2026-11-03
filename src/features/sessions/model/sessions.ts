import { addDays, format, getISODay, isValid, parseISO } from "date-fns";
import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";
import { DAY_LABELS, type ScheduleSlot } from "@/features/classes";

export type Session = {
  id: string;
  classId: string;
  date: string;
  summary: string | null;
  homework: string | null;
  homeworkDue: string | null;
};

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parseSessionRow(row: unknown): Session {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id),
    classId: String(r.class_id),
    date: String(r.date),
    summary: textOrNull(r.summary),
    homework: textOrNull(r.homework),
    homeworkDue: textOrNull(r.homework_due),
  };
}

const ACADEMY_TIME_ZONE = "Asia/Seoul";
const zoneFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ACADEMY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 학원(서울) 기준 날짜 `yyyy-MM-dd`. 브라우저 시간대나 UTC에 기대지 않아요. */
export function toLocalDateKey(d: Date): string {
  const part = (type: string) =>
    zoneFormat.formatToParts(d).find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** ISO 요일 1(월)~7(일). */
export function isoDayOf(dateKey: string): number {
  return getISODay(parseISO(dateKey));
}

export function formatShortDate(dateKey: string): string {
  const d = parseISO(dateKey);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function dayLabelOf(dateKey: string): string {
  return DAY_LABELS[isoDayOf(dateKey) - 1] ?? "";
}

/** 수업 날짜 다음 날부터 7일 안에서 시간표 요일이 처음 오는 날. 시간표가 비면 null. */
export function nextScheduleDate(
  schedule: ScheduleSlot[],
  dateKey: string,
): string | null {
  if (schedule.length === 0) return null;
  const days = new Set(schedule.map((s) => s.day));
  const base = parseISO(dateKey);
  for (let n = 1; n <= 7; n += 1) {
    const next = addDays(base, n);
    if (days.has(getISODay(next))) return format(next, "yyyy-MM-dd");
  }
  return null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDateKey = (v: string) => DATE_RE.test(v) && isValid(parseISO(v));

function longText(max: number, tooLong: string) {
  return z
    .string()
    .trim()
    .max(max, tooLong)
    .refine(
      (v) => !hasControlChars(v, { multiline: true }),
      CONTROL_CHAR_MESSAGE,
    )
    .transform((v) => (v === "" ? null : v));
}

export const sessionFormSchema = z
  .object({
    date: z.string().refine(isDateKey, "수업 날짜를 골라 주세요."),
    summary: longText(2000, "수업 내용은 2000자까지 쓸 수 있어요."),
    homework: longText(1000, "숙제 내용은 1000자까지 쓸 수 있어요."),
    homeworkDue: z
      .string()
      .refine(
        (v) => v === "" || isDateKey(v),
        "숙제 마감일을 날짜로 골라 주세요.",
      )
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((v) => v.homeworkDue === null || v.homeworkDue >= v.date, {
    path: ["homeworkDue"],
    message: "숙제 마감일은 수업 날짜와 같거나 그 뒤로 골라 주세요.",
  });

export type SessionFormInput = z.input<typeof sessionFormSchema>;
export type SessionFormOutput = z.output<typeof sessionFormSchema>;
