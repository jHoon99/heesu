import { supabase } from "@/core/supabase/client";
import type { TablesInsert } from "@/core/supabase/database.types";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import type { AdminQuestion, Question, QuestionLink } from "../model/questions";

type Row = {
  id: string;
  body: string;
  created_at: string;
  answered_at: string | null;
  video_id?: string | null;
  session_id?: string | null;
  students?: { name: string } | null;
  videos: { title: string } | null;
  sessions: { date: string; classes: { name: string } | null } | null;
  answers: { id: string; body: string; created_at: string }[];
};

const MINE_COLUMNS =
  "id, body, created_at, answered_at, video_id, session_id, videos(title), sessions(date, classes(name)), answers(id, body, created_at)";
const COLUMNS = MINE_COLUMNS.replace(
  "session_id, ",
  "session_id, students(name), ",
);

function linkOf(r: Row): QuestionLink | null {
  if (r.videos) {
    return { kind: "video", videoId: r.video_id ?? "", title: r.videos.title };
  }
  if (r.sessions) {
    return {
      kind: "session",
      sessionId: r.session_id ?? "",
      date: r.sessions.date,
      className: r.sessions.classes?.name ?? "",
    };
  }
  return null;
}

export async function listAdminQuestions(): Promise<AdminQuestion[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "answers", ascending: true })
    .limit(200);
  if (error) throw error;
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    answeredAt: r.answered_at,
    studentName: r.students?.name ?? "",
    link: linkOf(r),
    answers: r.answers.map((a) => ({
      id: a.id,
      body: a.body,
      createdAt: a.created_at,
    })),
  }));
}

export async function countUnansweredQuestions(): Promise<number> {
  const { count, error } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .is("answered_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function answerQuestion(
  questionId: string,
  body: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("answers")
    .insert({ question_id: questionId, body })
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new SaveNotAppliedError();
}

function answersOf(r: Row) {
  return r.answers.map((a) => ({
    id: a.id,
    body: a.body,
    createdAt: a.created_at,
  }));
}

/** RLS가 내 질문만 돌려줘요. */
export async function listMyQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(MINE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "answers", ascending: true })
    .limit(200);
  if (error) throw error;
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    answeredAt: r.answered_at,
    link: linkOf(r),
    answers: answersOf(r),
  }));
}

/** RLS상 내 반 수업만 보여요. */
export async function listRecentSessions(
  today: string,
): Promise<{ id: string; date: string; className: string }[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, date, classes(name)")
    .lte("date", today)
    .order("date", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (
    data as unknown as {
      id: string;
      date: string;
      classes: { name: string } | null;
    }[]
  ).map((r) => ({ id: r.id, date: r.date, className: r.classes?.name ?? "" }));
}

/** student_id는 보내지 않아요. DB 트리거가 로그인한 학생으로 채워요. */
export async function askQuestion(input: {
  body: string;
  videoId: string | null;
  sessionId: string | null;
}): Promise<void> {
  const { data, error } = await supabase
    .from("questions")
    .insert({
      body: input.body,
      video_id: input.videoId,
      session_id: input.sessionId,
      // student_id는 트리거가 채워서 생성 타입의 필수 키만 맞춰요.
    } as TablesInsert<"questions">)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new SaveNotAppliedError();
}
