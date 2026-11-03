import { supabase } from "@/core/supabase/client";

export async function getMyRank(): Promise<{
  rank: number;
  total: number;
} | null> {
  const { data, error } = await supabase.rpc("my_rank");
  if (error) throw error;
  const row = data[0];
  return row ? { rank: row.rank, total: row.total } : null;
}

export async function getMyPointTotal(studentId: string): Promise<number> {
  const { data, error } = await supabase
    .from("student_point_totals")
    .select("total")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data?.total ?? 0;
}
