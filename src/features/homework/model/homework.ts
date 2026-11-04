import type { Homework } from "@/design-system";

export type HomeworkItem = {
  sessionId: string;
  classId: string;
  className: string;
  date: string;
  homework: string;
  due: string | null;
  status: Homework;
  submittedAt: string | null;
};

export type HomeworkSessionRow = {
  id: string;
  class_id: string;
  date: string;
  homework: string | null;
  homework_due: string | null;
  classes: { name: string } | null;
};

export type HomeworkCheckRow = {
  session_id: string;
  status: Homework;
  submitted_at: string | null;
};

export const HOMEWORK_SESSION_LIMIT = 40;

const byClassName = (a: HomeworkItem, b: HomeworkItem) =>
  a.className.localeCompare(b.className, "ko");

/** 미완료는 오래된 날짜 먼저, 나머지는 최신 날짜 먼저, 같은 날은 반 이름순. */
export function sortHomework(items: HomeworkItem[]): HomeworkItem[] {
  const missing = items
    .filter((i) => i.status === "missing")
    .sort((a, b) => a.date.localeCompare(b.date) || byClassName(a, b));
  const rest = items
    .filter((i) => i.status !== "missing")
    .sort((a, b) => b.date.localeCompare(a.date) || byClassName(a, b));
  return [...missing, ...rest];
}

export function buildHomeworkItems(
  sessions: HomeworkSessionRow[],
  checks: HomeworkCheckRow[],
  today: string,
): HomeworkItem[] {
  const checkBySession = new Map(checks.map((c) => [c.session_id, c]));
  const seen = new Set<string>();
  const items: HomeworkItem[] = [];
  for (const s of sessions) {
    const homework = s.homework?.trim();
    if (!homework || s.date > today || s.classes === null) continue;
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const check = checkBySession.get(s.id);
    items.push({
      sessionId: s.id,
      classId: s.class_id,
      className: s.classes.name,
      date: s.date,
      homework,
      due: s.homework_due,
      status: check?.status ?? "none",
      submittedAt: check?.submitted_at ?? null,
    });
  }
  return sortHomework(items);
}

/** 반마다 가장 최근 숙제 1개와 모든 미완료. */
export function pickTodayHomework(items: HomeworkItem[]): HomeworkItem[] {
  const latest = new Map<string, HomeworkItem>();
  for (const i of items) {
    const cur = latest.get(i.classId);
    if (!cur || i.date > cur.date) latest.set(i.classId, i);
  }
  const picked = new Map<string, HomeworkItem>();
  for (const i of latest.values()) picked.set(i.sessionId, i);
  for (const i of items) if (i.status === "missing") picked.set(i.sessionId, i);
  return sortHomework([...picked.values()]);
}

export function canSubmit(item: HomeworkItem): boolean {
  return item.status !== "done" && item.submittedAt === null;
}

export function homeworkProgress(items: HomeworkItem[]): {
  finished: number;
  total: number;
} {
  return {
    finished: items.filter((i) => i.status === "done" || i.submittedAt !== null)
      .length,
    total: items.length,
  };
}

const submittedFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** `11/4 15:30`(서울 시각). */
export function formatSubmittedAt(iso: string): string {
  const parts = submittedFormat.formatToParts(new Date(iso));
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${Number(p("month"))}/${Number(p("day"))} ${p("hour")}:${p("minute")}`;
}
