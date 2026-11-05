import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  TEST_KINDS,
  type TestOutput,
  type TestResult,
} from "../model/testRecords";

export async function listTestResults(
  studentId: string,
): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from("test_results")
    .select("id, taken_on, kind, title, score, max_score, pass_score, memo")
    .eq("student_id", studentId)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    takenOn: r.taken_on,
    kind: TEST_KINDS.find((k) => k === r.kind) ?? "word",
    title: r.title,
    score: r.score,
    maxScore: r.max_score,
    passScore: r.pass_score,
    memo: r.memo,
  }));
}

export async function addTestResult(
  studentId: string,
  input: TestOutput,
): Promise<void> {
  const { error } = await supabase.from("test_results").insert({
    student_id: studentId,
    taken_on: input.takenOn,
    kind: input.kind,
    title: input.title,
    score: input.score,
    max_score: input.maxScore,
    pass_score: input.passScore,
    memo: input.memo,
  });
  if (error) throw error;
}

export async function deleteTestResult(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("test_results")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
}
