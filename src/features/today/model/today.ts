import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { ClassSummary, ScheduleSlot } from "@/features/classes";

/** 계획 5가 미답변 질문 수 훅으로 바꾼다. */
export const UNANSWERED_QUESTIONS_PLACEHOLDER = 0;

/** 그 요일 칸이 있는 반을 그날 가장 이른 칸의 시작 시각순(같으면 이름순)으로. */
export function todaysClasses(
  classes: ClassSummary[],
  isoDay: number,
): { cls: ClassSummary; slot: ScheduleSlot }[] {
  const out: { cls: ClassSummary; slot: ScheduleSlot }[] = [];
  for (const cls of classes) {
    const slot = cls.schedule
      .filter((s) => s.day === isoDay)
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    if (slot) out.push({ cls, slot });
  }
  return out.sort(
    (a, b) =>
      a.slot.start.localeCompare(b.slot.start) ||
      a.cls.name.localeCompare(b.cls.name, "ko"),
  );
}

export function formatTodayHeading(dateKey: string): string {
  return format(parseISO(dateKey), "M월 d일 EEEE", { locale: ko });
}
