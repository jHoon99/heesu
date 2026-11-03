import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  buildHomeworkItems,
  HOMEWORK_SESSION_LIMIT,
  type HomeworkCheckRow,
  type HomeworkItem,
  type HomeworkSessionRow,
} from "../model/homework";

const SESSION_SELECT =
  "id, class_id, date, homework, homework_due, classes(name)";

export async function listMyHomework(
  studentId: string,
  today: string,
): Promise<HomeworkItem[]> {
  const sessionsRes = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .not("homework", "is", null)
    .lte("date", today)
    .order("date", { ascending: false })
    .limit(HOMEWORK_SESSION_LIMIT);
  if (sessionsRes.error) throw sessionsRes.error;
  const sessions: HomeworkSessionRow[] = sessionsRes.data ?? [];

  const checksRes = await supabase
    .from("homework_checks")
    .select("session_id, status, submitted_at")
    .eq("student_id", studentId);
  if (checksRes.error) throw checksRes.error;
  const checks: HomeworkCheckRow[] = checksRes.data ?? [];

  // 오래된 미완료는 최근 40개 밖에 있어도 보여요.
  const loaded = new Set(sessions.map((s) => s.id));
  const extraIds = checks
    .filter((c) => c.status === "missing" && !loaded.has(c.session_id))
    .map((c) => c.session_id);
  if (extraIds.length > 0) {
    const extraRes = await supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .in("id", extraIds);
    if (extraRes.error) throw extraRes.error;
    sessions.push(...(extraRes.data ?? []));
  }
  return buildHomeworkItems(sessions, checks, today);
}

export async function submitHomework(sessionId: string): Promise<string> {
  const { data, error } = await supabase.rpc("submit_homework", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  if (typeof data !== "string") throw new SaveNotAppliedError();
  return data;
}
