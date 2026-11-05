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

export type GuardianTest = {
  date: string;
  kind: "word" | "grammar";
  title: string;
  score: number;
  maxScore: number;
  passScore: number | null;
};

export type GuardianClinic = {
  kind: "word_retest" | "concept_review";
  status: "open" | "done";
  createdOn: string;
  doneOn: string | null;
};

export type GuardianView = {
  name: string;
  today: string;
  totalPoints: number;
  records: GuardianRecord[];
  week: GuardianWeekSession[];
  tests: GuardianTest[];
  clinic: GuardianClinic[];
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
  // 옛 서버 응답(배포 순서가 어긋난 잠깐)에도 화면이 깨지지 않게 없으면 빈 목록.
  tests: z
    .array(
      z.object({
        date: dateKey,
        kind: z.enum(["word", "grammar"]),
        title: z.string(),
        score: z.number().int(),
        max_score: z.number().int(),
        pass_score: z.number().int().nullable(),
      }),
    )
    .default([]),
  clinic: z
    .array(
      z.object({
        kind: z.enum(["word_retest", "concept_review"]),
        status: z.enum(["open", "done"]),
        created_on: dateKey,
        done_on: dateKey.nullable(),
      }),
    )
    .default([]),
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
    tests: v.tests.map((t) => ({
      date: t.date,
      kind: t.kind,
      title: t.title,
      score: t.score,
      maxScore: t.max_score,
      passScore: t.pass_score,
    })),
    clinic: v.clinic.map((c) => ({
      kind: c.kind,
      status: c.status,
      createdOn: c.created_on,
      doneOn: c.done_on,
    })),
  };
}

export function isGuardianLinkError(e: unknown): boolean {
  return (
    typeof e === "object" && e !== null && "code" in e && e.code === "P0001"
  );
}
