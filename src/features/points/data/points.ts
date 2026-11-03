import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  POINT_HISTORY_LIMIT,
  type ManualPointOutput,
  type PointEntry,
  type PointTotal,
} from "../model/points";

const STATUSES = ["active", "paused", "left"] as const;

export async function listPointTotals(): Promise<PointTotal[]> {
  const { data, error } = await supabase
    .from("student_point_totals")
    .select("student_id, name, grade, status, total");
  if (error) throw error;
  const totals: PointTotal[] = [];
  for (const r of data) {
    const status = STATUSES.find((s) => s === r.status);
    if (r.student_id === null || r.name === null || !status) continue;
    totals.push({
      studentId: r.student_id,
      name: r.name,
      grade: r.grade ?? "",
      status,
      total: r.total ?? 0,
    });
  }
  return totals;
}

export async function listPointHistory(
  studentId: string,
  limit = POINT_HISTORY_LIMIT,
): Promise<PointEntry[]> {
  const { data, error } = await supabase
    .from("points")
    .select("id, amount, reason, created_at, sessions(date)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    amount: r.amount,
    reason: r.reason,
    createdAt: r.created_at,
    sessionDate: r.sessions?.date ?? null,
  }));
}

/** 수동 가감. session_id는 DB가 거절하므로 절대 보내지 않아요. */
export async function addManualPoints(
  studentId: string,
  input: ManualPointOutput,
): Promise<void> {
  const { data, error } = await supabase
    .from("points")
    .insert({
      student_id: studentId,
      amount: input.amount,
      reason: input.reason,
    })
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
}
