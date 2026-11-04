import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";
import { dayLabelOf, formatShortDate } from "@/features/sessions";

export const QUESTION_BODY_MAX = 2000;

export const bodySchema = z
  .string()
  .trim()
  .min(1, "내용을 입력해 주세요.")
  .max(QUESTION_BODY_MAX, "2000자까지 쓸 수 있어요.")
  .refine(
    (v) => !hasControlChars(v, { multiline: true }),
    CONTROL_CHAR_MESSAGE,
  );

export type QuestionLink =
  | { kind: "video"; videoId: string; title: string }
  | { kind: "session"; sessionId: string; date: string; className: string };

export type Answer = { id: string; body: string; createdAt: string };

export type Question = {
  id: string;
  body: string;
  createdAt: string;
  answeredAt: string | null;
  link: QuestionLink | null;
  answers: Answer[];
};

export type AdminQuestion = Question & { studentName: string };

export function linkLabel(link: QuestionLink): string {
  return link.kind === "video"
    ? `영상 · ${link.title}`
    : `수업 · ${formatShortDate(link.date)}(${dayLabelOf(link.date)}) ${link.className}`;
}

const seoulTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 서울 기준 `M/d HH:mm`. */
export function formatQuestionTime(iso: string): string {
  const parts = seoulTime.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 미답변 먼저(최근 먼저), 그다음 답변된 것(최근 먼저). */
export function sortAdminQuestions(qs: AdminQuestion[]): AdminQuestion[] {
  return [...qs].sort((a, b) => {
    const au = a.answeredAt === null ? 0 : 1;
    const bu = b.answeredAt === null ? 0 : 1;
    if (au !== bu) return au - bu;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}
