import type { Factor } from "@supabase/supabase-js";
import { supabase } from "@/core/supabase/client";

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
}

export async function listTotpFactors(): Promise<Factor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.all.filter((f) => f.factor_type === "totp");
}

export async function unenrollFactor(id: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
  if (error) throw error;
}

export async function enrollTotp(): Promise<{
  factorId: string;
  qrCode: string;
  secret: string;
}> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "heesu-admin",
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyTotp(
  factorId: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error) throw error;
}

export async function getAssurance(): Promise<{
  current: string | null;
  next: string | null;
}> {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return { current: data.currentLevel, next: data.nextLevel };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    // 서버 요청이 실패해도 이 기기의 세션은 지워요.
    await supabase.auth.signOut({ scope: "local" });
    throw error;
  }
}
