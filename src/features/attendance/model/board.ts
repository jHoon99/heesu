import type {
  Attendance,
  AttendanceRecords,
  AttendanceTableProps,
  Homework,
} from "@/design-system";
import { dayLabelOf, formatShortDate, type Session } from "@/features/sessions";

export const RECENT_SESSION_COUNT = 8;

export type BoardStudent = { id: string; name: string; grade: string };

export type Board = {
  /** 날짜 오름차순 */
  sessions: Session[];
  students: BoardStudent[];
  /** [studentId][sessionId] */
  records: AttendanceRecords;
};

type Row<S> = { session_id: string; student_id: string; status: S };

export function buildBoard(input: {
  sessions: Session[];
  members: { id: string; name: string; grade: string; status: string }[];
  attendance: Row<Attendance>[];
  homework: Row<Homework>[];
}): Board {
  const students = input.members
    .filter((m) => m.status === "active")
    .map(({ id, name, grade }) => ({ id, name, grade }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const sessions = [...input.sessions].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const studentIds = new Set(students.map((s) => s.id));
  const sessionIds = new Set(sessions.map((s) => s.id));

  let records: AttendanceRecords = {};
  const put = (row: Row<Attendance | Homework>, field: "att" | "hw"): void => {
    // 반에서 빠진 학생의 지난 행은 그리지 않아요.
    if (!studentIds.has(row.student_id) || !sessionIds.has(row.session_id))
      return;
    records = applyCell(
      records,
      row.student_id,
      row.session_id,
      field,
      row.status,
    );
  };
  for (const row of input.attendance) put(row, "att");
  for (const row of input.homework) put(row, "hw");
  return { sessions, students, records };
}

export function applyCell(
  records: AttendanceRecords,
  studentId: string,
  sessionId: string,
  field: "att" | "hw",
  value: Attendance | Homework,
): AttendanceRecords {
  const row = records[studentId] ?? {};
  return {
    ...records,
    [studentId]: {
      ...row,
      [sessionId]: { ...row[sessionId], [field]: value },
    },
  };
}

export function toTableDates(
  sessions: Session[],
  todayKey: string,
): AttendanceTableProps["dates"] {
  return sessions.map((s) => ({
    key: s.id,
    label: formatShortDate(s.date),
    day: dayLabelOf(s.date),
    today: s.date === todayKey,
  }));
}
