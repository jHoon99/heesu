import type { ScheduleSlot } from "@/features/classes";
import { isoDayOf, nextScheduleDate } from "@/features/sessions";

/** 오늘 수업이 있으면 오늘, 아니면 시간표상 다음 수업 날짜. 시간표가 없으면 null. */
export function nextClassDate(
  schedule: ScheduleSlot[],
  todayKey: string,
): string | null {
  if (schedule.some((s) => s.day === isoDayOf(todayKey))) return todayKey;
  return nextScheduleDate(schedule, todayKey);
}
