import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import type { Attendance, Homework } from "@/design-system";
import { type Session } from "@/features/sessions";
import { buildBoard, RECENT_SESSION_COUNT, type Board } from "../model/board";

const SESSION_COLUMNS = "id, class_id, date, summary, homework, homework_due";
const ROW_COLUMNS = "session_id, student_id, status";
const HOMEWORK_COLUMNS = "session_id, student_id, status, submitted_at";

function toSession(r: {
  id: string;
  class_id: string;
  date: string;
  summary?: string | null;
  homework?: string | null;
  homework_due?: string | null;
}): Session {
  return {
    id: r.id,
    classId: r.class_id,
    date: r.date,
    summary: r.summary ?? null,
    homework: r.homework ?? null,
    homeworkDue: r.homework_due ?? null,
  };
}

async function attendanceRows(ids: string[]) {
  const { data, error } = await supabase
    .from("attendance")
    .select(ROW_COLUMNS)
    .in("session_id", ids);
  if (error) throw error;
  return data;
}

async function homeworkRows(ids: string[]) {
  const { data, error } = await supabase
    .from("homework_checks")
    .select(HOMEWORK_COLUMNS)
    .in("session_id", ids);
  if (error) throw error;
  return data;
}

export async function getBoard(classId: string): Promise<Board> {
  const [sessionsRes, rosterRes] = await Promise.all([
    supabase
      .from("sessions")
      .select(SESSION_COLUMNS)
      .eq("class_id", classId)
      .order("date", { ascending: false })
      .limit(RECENT_SESSION_COUNT),
    // class_roster는 퇴원생을 이미 뺀 보기예요.
    supabase
      .from("class_roster")
      .select("student_id, name, grade, status")
      .eq("class_id", classId),
  ]);
  if (sessionsRes.error) throw sessionsRes.error;
  if (rosterRes.error) throw rosterRes.error;
  const sessions = sessionsRes.data.map(toSession);
  const ids = sessions.map((s) => s.id);
  const [attendance, homework] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([attendanceRows(ids), homeworkRows(ids)]);
  return buildBoard({
    sessions,
    members: rosterRes.data.map((r) => ({
      id: r.student_id ?? "",
      name: r.name ?? "",
      grade: r.grade ?? "",
      status: r.status ?? "",
    })),
    attendance,
    homework,
  });
}

// payload에는 grant된 세 컬럼만 넣어요. 같은 값의 키로 upsert하므로 키 이동 금지 트리거에 걸리지 않아요.
const ON_CONFLICT = { onConflict: "session_id,student_id" } as const;

function check(res: { data: unknown[] | null; error: unknown }): void {
  if (res.error) throw res.error;
  if (!res.data || res.data.length === 0) throw new SaveNotAppliedError();
}

export async function setAttendance(
  sessionId: string,
  studentId: string,
  status: Attendance,
): Promise<void> {
  check(
    await supabase
      .from("attendance")
      .upsert(
        { session_id: sessionId, student_id: studentId, status },
        ON_CONFLICT,
      )
      .select("session_id"),
  );
}

export async function setHomework(
  sessionId: string,
  studentId: string,
  status: Homework,
): Promise<void> {
  check(
    await supabase
      .from("homework_checks")
      .upsert(
        { session_id: sessionId, student_id: studentId, status },
        ON_CONFLICT,
      )
      .select("session_id"),
  );
}

export type DayProgress = Record<
  string,
  { sessionId: string; entered: number; total: number }
>;

/** 그 날짜 수업마다 반의 재원생 수(total)와 출결을 넣은 재원생 수(entered). */
export async function getDayProgress(date: string): Promise<DayProgress> {
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, class_id")
    .eq("date", date);
  if (error) throw error;
  if (sessions.length === 0) return {};
  const [rosterRes, attRes] = await Promise.all([
    supabase
      .from("class_roster")
      .select("class_id, student_id, status")
      .in(
        "class_id",
        sessions.map((s) => s.class_id),
      ),
    supabase
      .from("attendance")
      .select(ROW_COLUMNS)
      .in(
        "session_id",
        sessions.map((s) => s.id),
      )
      .neq("status", "none"),
  ]);
  if (rosterRes.error) throw rosterRes.error;
  if (attRes.error) throw attRes.error;
  const active = new Map<string, Set<string>>();
  for (const r of rosterRes.data) {
    if (r.status !== "active" || !r.class_id || !r.student_id) continue;
    const set = active.get(r.class_id) ?? new Set<string>();
    set.add(r.student_id);
    active.set(r.class_id, set);
  }
  const result: DayProgress = {};
  for (const s of sessions) {
    const members = active.get(s.class_id) ?? new Set<string>();
    const entered = new Set(
      attRes.data
        .filter((a) => a.session_id === s.id && members.has(a.student_id))
        .map((a) => a.student_id),
    ).size;
    result[s.class_id] = { sessionId: s.id, entered, total: members.size };
  }
  return result;
}

export type StudentRecord = {
  sessionId: string;
  date: string;
  className: string;
  att: Attendance;
  hw: Homework;
  /** 학생이 숙제를 제출한 시각(ISO) */
  submittedAt: string | null;
};

/** 그 학생이 지금 속한 반들의 최근 수업 8개(날짜 내림차순)와 그 학생의 출결·숙제. */
export async function listStudentRecords(
  studentId: string,
): Promise<StudentRecord[]> {
  const { data: memberships, error } = await supabase
    .from("class_members")
    .select("class_id, classes(name)")
    .eq("student_id", studentId);
  if (error) throw error;
  if (memberships.length === 0) return [];
  const classNames = new Map(
    memberships.map((m) => [m.class_id, m.classes?.name ?? ""]),
  );
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, class_id, date")
    .in("class_id", [...classNames.keys()])
    .order("date", { ascending: false })
    .limit(RECENT_SESSION_COUNT);
  if (sessionsError) throw sessionsError;
  if (sessions.length === 0) return [];
  const ids = sessions.map((s) => s.id);
  const [attRes, hwRes] = await Promise.all([
    supabase
      .from("attendance")
      .select(ROW_COLUMNS)
      .eq("student_id", studentId)
      .in("session_id", ids),
    supabase
      .from("homework_checks")
      .select(HOMEWORK_COLUMNS)
      .eq("student_id", studentId)
      .in("session_id", ids),
  ]);
  if (attRes.error) throw attRes.error;
  if (hwRes.error) throw hwRes.error;
  const att = new Map(attRes.data.map((r) => [r.session_id, r.status]));
  const hw = new Map(hwRes.data.map((r) => [r.session_id, r]));
  return sessions.map((s) => ({
    sessionId: s.id,
    date: s.date,
    className: classNames.get(s.class_id) ?? "",
    att: att.get(s.id) ?? "none",
    hw: hw.get(s.id)?.status ?? "none",
    submittedAt: hw.get(s.id)?.submitted_at ?? null,
  }));
}
