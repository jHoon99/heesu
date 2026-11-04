import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import type { AdminQuestion, QuestionLink } from "../model/questions";

type Row = {
  id: string;
  body: string;
  created_at: string;
  answered_at: string | null;
  video_id?: string | null;
  session_id?: string | null;
  students: { name: string } | null;
  videos: { title: string } | null;
  sessions: { date: string; classes: { name: string } | null } | null;
  answers: { id: string; body: string; created_at: string }[];
};

const COLUMNS =
  "id, body, created_at, answered_at, video_id, session_id, students(name), videos(title), sessions(date, classes(name)), answers(id, body, created_at)";

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
