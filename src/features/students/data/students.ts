import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  parseStudentRow,
  type StudentEditOutput,
  type StudentSummary,
} from "../model/students";

const COLUMNS =
  "id, login_id, name, grade, status, joined_at, student_private(school), class_members(classes(id, name))";

export async function listStudents(): Promise<StudentSummary[]> {
  const { data, error } = await supabase
    .from("students")
    .select(COLUMNS)
    .order("name");
  if (error) throw error;
  return data.map(parseStudentRow);
}

export async function getStudent(id: string): Promise<StudentSummary | null> {
  const { data, error } = await supabase
    .from("students")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? parseStudentRow(data) : null;
}

// 컬럼 grant와 같게 name·grade·status·joined_at만 보내요.
export async function updateStudent(
  id: string,
  input: StudentEditOutput,
): Promise<void> {
  const { data, error } = await supabase
    .from("students")
    .update({
      name: input.name,
      grade: input.grade,
      status: input.status,
      joined_at: input.joinedAt,
    })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  // RLS가 막거나 없는 id면 오류 없이 0행이 돌아와요.
  if (data.length === 0) throw new SaveNotAppliedError();
}
