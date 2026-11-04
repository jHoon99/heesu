import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import type { PayableStudent, PaymentRecord } from "../model/payments";

type Row = {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  paid_at: string | null;
  memo: string | null;
};

const COLUMNS = "id, student_id, month, amount, paid_at, memo";

function toRecord(r: Row): PaymentRecord {
  return {
    id: r.id,
    studentId: r.student_id,
    month: r.month,
    amount: r.amount,
    paidAt: r.paid_at,
    memo: r.memo,
  };
}

export async function listPayableStudents(): Promise<PayableStudent[]> {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, status");
  if (error) throw error;
  return (data ?? []) as PayableStudent[];
}

export async function listPayments(
  from: string,
  to: string,
): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(COLUMNS)
    .gte("month", from)
    .lte("month", to);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toRecord);
}

export async function listStudentPayments(
  studentId: string,
): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(COLUMNS)
    .eq("student_id", studentId)
    .order("month", { ascending: false })
    .limit(12);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toRecord);
}

export async function savePayment(input: {
  studentId: string;
  month: string;
  amount: number;
  paidAt: string | null;
  memo: string | null;
}): Promise<void> {
  const { data, error } = await supabase
    .from("payments")
    .upsert(
      {
        student_id: input.studentId,
        month: input.month,
        amount: input.amount,
        paid_at: input.paidAt,
        memo: input.memo,
      },
      { onConflict: "student_id,month" },
    )
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new SaveNotAppliedError();
}

export async function deletePayment(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new SaveNotAppliedError();
}
