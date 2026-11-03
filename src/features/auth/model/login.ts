import { z } from "zod";
import { classifyError } from "@/core/supabase/error";

export const STUDENT_EMAIL_DOMAIN = "student.heesu.internal";
export const LOGIN_ID_RE = /^[a-z0-9_]{3,20}$/;

const ID_MESSAGE =
  "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자예요. 다시 확인해 주세요.";
const STUDENT_SUFFIX = `@${STUDENT_EMAIL_DOMAIN}`;

export type AuthEmailResult =
  | { ok: true; email: string; kind: "admin" | "student" }
  | { ok: false; message: string };

function studentEmail(id: string): AuthEmailResult {
  return LOGIN_ID_RE.test(id)
    ? { ok: true, email: `${id}${STUDENT_SUFFIX}`, kind: "student" }
    : { ok: false, message: ID_MESSAGE };
}

// 입력 하나로 원장(이메일)과 학생(아이디)을 나눠요.
// 학생 도메인 이메일은 학생으로 다뤄서 TOTP 등록을 띄우지 않아요.
export function toAuthEmail(input: string): AuthEmailResult {
  const value = input.trim().toLowerCase();
  if (value.endsWith(STUDENT_SUFFIX)) {
    return studentEmail(value.slice(0, -STUDENT_SUFFIX.length));
  }
  if (value.includes("@")) return { ok: true, email: value, kind: "admin" };
  return studentEmail(value);
}

export type MfaFactor = {
  id: string;
  factor_type: string;
  status: "verified" | "unverified";
};

export type MfaStep =
  | { kind: "verify"; factorId: string }
  | { kind: "enroll"; unenrollIds: string[] };

export function planMfaStep(factors: MfaFactor[]): MfaStep {
  const totp = factors.filter((f) => f.factor_type === "totp");
  const verified = totp.find((f) => f.status === "verified");
  if (verified) return { kind: "verify", factorId: verified.id };
  return {
    kind: "enroll",
    unenrollIds: totp.filter((f) => f.status === "unverified").map((f) => f.id),
  };
}

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_sms_send_rate_limit",
]);

function field(error: unknown, key: "code" | "status"): unknown {
  return typeof error === "object" && error !== null && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

export function authErrorMessage(error: unknown): string {
  const code = field(error, "code");
  if (code === "mfa_verification_failed")
    return "인증 코드가 맞지 않아요. 앱에 보이는 6자리 숫자를 다시 입력해 주세요.";
  if (code === "mfa_challenge_expired")
    return "코드 입력 시간이 지났어요. 앱의 새 숫자로 다시 입력해 주세요.";
  if (
    (typeof code === "string" && RATE_LIMIT_CODES.has(code)) ||
    field(error, "status") === 429
  )
    return "로그인 시도가 너무 많아요. 5분 뒤 다시 시도해 주세요.";
  // invalid_credentials 포함: 계정이 있는지는 드러내지 않아요.
  return classifyError(error).message;
}

export const totpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "6자리 숫자를 입력해 주세요.");
