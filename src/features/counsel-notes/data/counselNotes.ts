import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  COUNSEL_METHODS,
  COUNSEL_PARTIES,
  type CounselNote,
  type CounselOutput,
} from "../model/counselNotes";

export async function listCounselNotes(
  studentId: string,
): Promise<CounselNote[]> {
  const { data, error } = await supabase
    .from("counsel_notes")
    .select("id, counseled_on, method, party, body")
    .eq("student_id", studentId)
    .order("counseled_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    counseledOn: r.counseled_on,
    method: COUNSEL_METHODS.find((m) => m === r.method) ?? "in_person",
    party: COUNSEL_PARTIES.find((p) => p === r.party) ?? "guardian",
    body: r.body,
  }));
}

export async function addCounselNote(
  studentId: string,
  input: CounselOutput,
): Promise<void> {
  const { error } = await supabase.from("counsel_notes").insert({
    student_id: studentId,
    counseled_on: input.counseledOn,
    method: input.method,
    party: input.party,
    body: input.body,
  });
  if (error) throw error;
}

export async function deleteCounselNote(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("counsel_notes")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
}
