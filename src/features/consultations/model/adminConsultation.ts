import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";
import type { Grade } from "./consultation";

export const CONSULTATION_STATUSES = [
  "new",
  "contacted",
  "enrolled",
  "on_hold",
] as const;
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  new: "새 신청",
  contacted: "연락함",
  enrolled: "등록",
  on_hold: "보류",
};

export const CONSULTATION_STATUS_TONE = {
  new: "new",
  contacted: "brand",
  enrolled: "solid",
  on_hold: "neutral",
} as const;

export type ConsultationRecord = {
  id: string;
  parentName: string;
  phone: string;
  grade: Grade;
  message: string | null;
  status: ConsultationStatus;
  memo: string | null;
  createdAt: string;
};

/** 새 신청 먼저, 그 안과 나머지는 신청일 내림차순. */
export function sortConsultations(
  list: ConsultationRecord[],
): ConsultationRecord[] {
  return [...list].sort((a, b) => {
    const an = a.status === "new" ? 0 : 1;
    const bn = b.status === "new" ? 0 : 1;
    if (an !== bn) return an - bn;
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  });
}

export const consultationEditSchema = z.object({
  status: z.enum(CONSULTATION_STATUSES),
  memo: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .max(2000, "메모는 2000자까지 쓸 수 있어요.")
        .refine((v) => !hasControlChars(v, { multiline: true }), {
          message: CONTROL_CHAR_MESSAGE,
        }),
    )
    .transform((s) => (s === "" ? null : s)),
});
export type ConsultationEditInput = z.input<typeof consultationEditSchema>;
export type ConsultationEditOutput = z.output<typeof consultationEditSchema>;

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/\D/g, "")}`;
}

const SEOUL_DATETIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 브라우저 시간대와 상관없이 서울 기준 yyyy.MM.dd HH:mm. */
export function formatSeoulDateTime(iso: string): string {
  const p: Record<string, string> = {};
  for (const part of SEOUL_DATETIME.formatToParts(new Date(iso))) {
    p[part.type] = part.value;
  }
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}
