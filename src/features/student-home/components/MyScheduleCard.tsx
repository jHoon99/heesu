import { Card } from "@/design-system";
import { formatSchedule, type ScheduleSlot } from "@/features/classes";
import {
  dayLabelOf,
  formatShortDate,
  toLocalDateKey,
} from "@/features/sessions";
import { nextClassDate } from "../model/schedule";

/** 나의 수업: 내 반마다 요일·시간과 다음 수업 날짜. */
export function MyScheduleCard({
  classes,
  now = new Date(),
}: {
  classes: { id: string; name: string; schedule: ScheduleSlot[] }[];
  now?: Date;
}) {
  const today = toLocalDateKey(now);
  return (
    <Card title="수업 일정">
      {classes.length === 0 ? (
        <p className="text-body text-text-muted">
          아직 배정된 반이 없어요. 원장님께 반 배정을 부탁해 주세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {classes.map((c) => {
            const next = nextClassDate(c.schedule, today);
            return (
              <li key={c.id} className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-label text-text">{c.name}</p>
                  {next ? (
                    <p className="text-body-sm text-text-brand">
                      {next === today
                        ? "오늘 수업"
                        : `다음 수업 ${formatShortDate(next)}(${dayLabelOf(next)})`}
                    </p>
                  ) : null}
                </div>
                <p className="text-body-sm break-words text-text-muted">
                  {formatSchedule(c.schedule)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
