import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  parseSessionRow,
  type Session,
  type SessionFormOutput,
} from "../model/sessions";

const COLUMNS = "id, class_id, date, summary, homework, homework_due";

export async function listClassSessions(
  classId: string,
  limit = 50,
): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select(COLUMNS)
    .eq("class_id", classId)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(parseSessionRow);
}

export async function getSession(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? parseSessionRow(data) : null;
}

function fields(input: SessionFormOutput) {
  return {
    date: input.date,
    summary: input.summary,
    homework: input.homework,
    homework_due: input.homeworkDue,
  };
}

export async function createSession(
  classId: string,
  input: SessionFormOutput,
): Promise<string> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ class_id: classId, ...fields(input) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateSession(
  id: string,
  input: SessionFormOutput,
): Promise<void> {
  const { data, error } = await supabase
    .from("sessions")
    .update(fields(input))
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
}

/** 수업 시작: 그날 수업이 없으면 만들고, 이미 있으면 그 수업을 돌려줘요. */
export async function startSession(
  classId: string,
  date: string,
  homeworkDue: string | null,
): Promise<{ id: string; created: boolean }> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ class_id: classId, date, homework_due: homeworkDue })
    .select("id")
    .single();
  if (!error) return { id: data.id, created: true };
  if ((error as { code?: unknown }).code !== "23505") throw error;
  const existing = await supabase
    .from("sessions")
    .select("id")
    .eq("class_id", classId)
    .eq("date", date)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw error;
  return { id: existing.data.id, created: false };
}
