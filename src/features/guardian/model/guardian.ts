import { z } from "zod";
import type { Attendance, Homework } from "@/design-system";

export const GUARDIAN_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const GUARDIAN_LINK_ERROR =
  "링크가 만료되었거나 올바르지 않아요. 학원에 새 링크를 요청해 주세요.";

export function readTokenFromHash(hash: string): string | null {
  const t = new URLSearchParams(hash.replace(/^#/, "")).get("t");
  return t !== null && GUARDIAN_TOKEN_RE.test(t) ? t : null;
}

export function guardianUrl(origin: string, token: string): string {
  return `${origin}/g#t=${token}`;
}

export type GuardianRecord = {
  date: string;
  className: string;
  attendance: Attendance;
  homework: Homework;
};

export type GuardianWeekSession = {
  date: string;
  className: string;
  summary: string | null;
  homework: string | null;
  homeworkDue: string | null;
};

export type GuardianView = {
  name: string;
  today: string;
  totalPoints: number;
  records: GuardianRecord[];
  week: GuardianWeekSession[];
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const viewSchema = z.object({
  name: z.string(),
  today: dateKey,
  total_points: z.number().int(),
  records: z.array(
    z.object({
      date: dateKey,
      class_name: z.string(),
      attendance: z.enum(["none", "present", "late", "absent", "makeup"]),
      homework: z.enum(["none", "done", "missing"]),
    }),
  ),
  week: z.array(
    z.object({
      date: dateKey,
      class_name: z.string(),
      summary: z.string().nullable(),
      homework: z.string().nullable(),
      homework_due: dateKey.nullable(),
    }),
  ),
});

export function parseGuardianView(raw: unknown): GuardianView {
  const v = viewSchema.parse(raw);
  return {
    name: v.name,
    today: v.today,
    totalPoints: v.total_points,
    records: v.records.map((r) => ({
      date: r.date,
      className: r.class_name,
      attendance: r.attendance,
      homework: r.homework,
    })),
    week: v.week.map((w) => ({
      date: w.date,
      className: w.class_name,
      summary: w.summary,
      homework: w.homework,
      homeworkDue: w.homework_due,
    })),
  };
}

export function isGuardianLinkError(e: unknown): boolean {
  return (
    typeof e === "object" && e !== null && "code" in e && e.code === "P0001"
  );
}
