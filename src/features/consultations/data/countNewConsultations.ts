import { supabase } from "@/core/supabase/client";

export async function countNewConsultations(): Promise<number> {
  const { count, error } = await supabase
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}
