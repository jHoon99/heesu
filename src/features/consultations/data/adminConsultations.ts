import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import type {
  ConsultationRecord,
  ConsultationStatus,
} from "../model/adminConsultation";
import type { Grade } from "../model/consultation";

type Row = {
  id: string;
  parent_name: string;
  phone: string;
  grade: string;
  message: string | null;
  status: string;
  memo: string | null;
  created_at: string;
};

export async function listConsultations(): Promise<ConsultationRecord[]> {
  const { data, error } = await supabase
    .from("consultations")
    .select("id, parent_name, phone, grade, message, status, memo, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    parentName: r.parent_name,
    phone: r.phone,
    grade: r.grade as Grade,
    message: r.message,
    status: r.status as ConsultationStatus,
    memo: r.memo,
    createdAt: r.created_at,
  }));
}

export async function updateConsultation(
  id: string,
  input: { status: ConsultationStatus; memo: string | null },
): Promise<void> {
  const { data, error } = await supabase
    .from("consultations")
    .update({ status: input.status, memo: input.memo })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new SaveNotAppliedError();
}
