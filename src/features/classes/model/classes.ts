import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

export const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;
export const LEVEL_LABELS = { middle: "중등", high: "고등" } as const;

export const MAX_SLOTS = 14;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleSlotSchema = z
  .object({
    day: z.number().int().min(1).max(7),
    start: z.string().regex(TIME_RE, "시각은 17:00처럼 적어 주세요."),
    end: z.string().regex(TIME_RE, "시각은 17:00처럼 적어 주세요."),
  })
  .refine(
    (s) => !TIME_RE.test(s.start) || !TIME_RE.test(s.end) || s.start < s.end,
    { path: ["end"], message: "끝나는 시각을 시작보다 늦게 적어 주세요." },
  );

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;

const OVERLAP_MESSAGE = "같은 요일에 겹치는 시간이 있어요. 시간을 고쳐 주세요.";

function hasOverlap(slots: ScheduleSlot[]): boolean {
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i]!;
      const b = slots[j]!;
      if (a.day === b.day && a.start < b.end && b.start < a.end) return true;
    }
  }
  return false;
}

const CAPACITY_MESSAGE = "정원은 1~50명으로 입력해 주세요.";

export const classFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "반 이름을 1~30자로 입력해 주세요.")
    .max(30, "반 이름을 1~30자로 입력해 주세요.")
    .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE),
  level: z.enum(["middle", "high"]),
  schedule: z
    .array(scheduleSlotSchema)
    .max(MAX_SLOTS, "시간은 최대 14개까지 넣을 수 있어요.")
    .refine((slots) => !hasOverlap(slots), { message: OVERLAP_MESSAGE }),
  capacity: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 50),
      CAPACITY_MESSAGE,
    )
    .transform((v) => (v === "" ? null : Number(v))),
});

export type ClassFormInput = z.input<typeof classFormSchema>;
export type ClassFormOutput = z.output<typeof classFormSchema>;

export type ClassSummary = {
  id: string;
  name: string;
  level: "middle" | "high";
  schedule: ScheduleSlot[];
  capacity: number | null;
  memberCount: number;
};

export function formatSchedule(slots: ScheduleSlot[]): string {
  if (slots.length === 0) return "시간표 없음";
  return [...slots]
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .map((s) => `${DAY_LABELS[s.day - 1]} ${s.start}–${s.end}`)
    .join(" · ");
}

function parseSchedule(value: unknown): ScheduleSlot[] {
  const parsed = z.array(scheduleSlotSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function memberCountOf(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  const first: unknown = value[0];
  if (typeof first === "object" && first !== null && "count" in first) {
    const count = (first as { count: unknown }).count;
    if (typeof count === "number") return count;
  }
  return 0;
}

export function parseClassRow(row: unknown): ClassSummary {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id),
    name: String(r.name),
    level: r.level === "high" ? "high" : "middle",
    schedule: parseSchedule(r.schedule),
    capacity: typeof r.capacity === "number" ? r.capacity : null,
    memberCount: memberCountOf(r.class_members),
  };
}

export { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
