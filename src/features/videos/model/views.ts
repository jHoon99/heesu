/** 다 봄 기준: 길이의 95% 이상. */
const COMPLETE_RATIO = 0.95;

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isComplete(watched: number, duration: number): boolean {
  return watched >= duration * COMPLETE_RATIO;
}

/** 0~100 내림. 다 봄 기준을 넘으면 100. */
export function watchedPercent(watched: number, duration: number): number {
  if (isComplete(watched, duration)) return 100;
  return Math.max(0, Math.floor((watched * 100) / duration));
}

export type ViewRow = {
  studentId: string;
  name: string;
  watchedSeconds: number;
  percent: number;
  updatedAt: string | null;
};

/** 명단(퇴원생 제외)의 학생만, 기록이 없으면 0·null, 이름순. */
export function buildViewRows(
  roster: { studentId: string; name: string }[],
  views: { studentId: string; watchedSeconds: number; updatedAt: string }[],
  duration: number,
): ViewRow[] {
  const byStudent = new Map(views.map((v) => [v.studentId, v]));
  return roster
    .map((r) => {
      const v = byStudent.get(r.studentId);
      return {
        studentId: r.studentId,
        name: r.name,
        watchedSeconds: v?.watchedSeconds ?? 0,
        percent: v ? watchedPercent(v.watchedSeconds, duration) : 0,
        updatedAt: v?.updatedAt ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function completeCount(rows: ViewRow[], duration: number): number {
  return rows.filter((r) => isComplete(r.watchedSeconds, duration)).length;
}

export function isScheduled(publishedAt: string, now: Date): boolean {
  return new Date(publishedAt).getTime() > now.getTime();
}

/** 서울 기준 `M/d HH:mm`. */
export function formatDateTime(iso: string): string {
  const p = (t: string) =>
    timeFormat.formatToParts(new Date(iso)).find((x) => x.type === t)?.value ??
    "";
  return `${p("month")}/${p("day")} ${p("hour")}:${p("minute")}`;
}
