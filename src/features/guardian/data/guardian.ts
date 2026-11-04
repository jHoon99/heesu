import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { parseGuardianView, type GuardianView } from "../model/guardian";

// 기본 POST로 부른다: GET이면 토큰이 쿼리스트링에 실려 로그에 남고, 함수도 POST가 아니면 거부한다.
export async function getGuardianView(token: string): Promise<GuardianView> {
  const { data, error } = await supabase.rpc("guardian_view", {
    p_token: token,
  });
  if (error) throw error;
  return parseGuardianView(data);
}

// 원문 토큰은 이 호출의 반환값으로만 나온다(다시 읽을 수 없다).
export async function issueGuardianToken(studentId: string): Promise<string> {
  const { data, error } = await supabase.rpc("issue_guardian_token", {
    p_student_id: studentId,
  });
  if (error) throw error;
  if (typeof data !== "string" || data === "") throw new SaveNotAppliedError();
  return data;
}

export type GuardianLinkStatus = { createdAt: string; expiresAt: string };

export async function getGuardianLinkStatus(
  studentId: string,
): Promise<GuardianLinkStatus | null> {
  const { data, error } = await supabase
    .from("guardian_tokens")
    .select("created_at, expires_at")
    .eq("student_id", studentId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data
    ? { createdAt: data.created_at, expiresAt: data.expires_at }
    : null;
}
