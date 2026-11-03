import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  CONSENT_METHODS,
  diffClassIds,
  type ConsentOutput,
  type ConsentRecord,
  type GuardianOutput,
} from "../model/detail";

export async function getStudentPrivate(
  id: string,
): Promise<GuardianOutput | null> {
  const { data, error } = await supabase
    .from("student_private")
    .select("school, guardian_name, guardian_phone, memo")
    .eq("student_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    school: data.school,
    guardianName: data.guardian_name,
    guardianPhone: data.guardian_phone,
    memo: data.memo,
  };
}

export async function saveStudentPrivate(
  id: string,
  input: GuardianOutput,
): Promise<void> {
  const { data, error } = await supabase
    .from("student_private")
    .upsert(
      {
        student_id: id,
        school: input.school,
        guardian_name: input.guardianName,
        guardian_phone: input.guardianPhone,
        memo: input.memo,
      },
      { onConflict: "student_id" },
    )
    .select("student_id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
}

export async function setStudentClasses(
  id: string,
  current: string[],
  next: string[],
): Promise<void> {
  const { add, remove } = diffClassIds(current, next);
  // 추가를 먼저: 중간에 실패해도 배정이 사라지지 않고 남기만 해요.
  if (add.length > 0) {
    const { error } = await supabase
      .from("class_members")
      .insert(add.map((class_id) => ({ student_id: id, class_id })));
    if (error) throw error;
  }
  if (remove.length > 0) {
    const { data, error } = await supabase
      .from("class_members")
      .delete()
      .eq("student_id", id)
      .in("class_id", remove)
      .select("class_id");
    if (error) throw error;
    if (data.length === 0) {
      // 0행이면 이미 지워졌는지(재시도) RLS가 막았는지 가려요.
      const left = await supabase
        .from("class_members")
        .select("class_id")
        .eq("student_id", id)
        .in("class_id", remove);
      if (left.error) throw left.error;
      if (left.data.length > 0) throw new SaveNotAppliedError();
    }
  }
}

export async function listConsents(id: string): Promise<ConsentRecord[]> {
  const { data, error } = await supabase
    .from("consents")
    .select("id, guardian_name, method, version, consented_at")
    .eq("student_id", id)
    .order("consented_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    guardianName: r.guardian_name,
    method: CONSENT_METHODS.find((m) => m === r.method) ?? "written",
    version: r.version,
    consentedAt: r.consented_at,
  }));
}

export async function addConsent(
  id: string,
  input: ConsentOutput,
): Promise<void> {
  const { error } = await supabase.from("consents").insert({
    student_id: id,
    guardian_name: input.guardianName,
    method: input.method,
    version: input.version,
    consented_at: input.consentedAt,
  });
  if (error) throw error;
}
