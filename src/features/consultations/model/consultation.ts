import { z } from "zod";
import { classifyError } from "@/core/supabase/error";

export const GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"] as const;
export type Grade = (typeof GRADES)[number];

export const CONSENT_VERSION = "2026-11-05";
// 둘 다 공개값이에요. 운영(heesu.pages.dev, dev.heesu.pages.dev)은 실제 키를 써요.
// 로컬(localhost)은 실제 키 도메인에 없어서, 로컬 Edge Function의 테스트 비밀 키와 맞는 테스트 키를 써요.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFzKIcojRfibxs9W";
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export function turnstileSiteKeyFor(hostname: string): string {
  return hostname === "localhost" || hostname === "127.0.0.1"
    ? TURNSTILE_TEST_SITE_KEY
    : TURNSTILE_SITE_KEY;
}

/** 입력 중인 값을 010-1234-5678 모양으로 맞춘다. 숫자 외 문자는 버린다. */
export function formatPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8210") && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  }
  digits = digits.slice(0, 11);
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)]
    .filter(Boolean)
    .join("-");
}

export const consultFormSchema = z.object({
  parentName: z
    .string()
    .trim()
    .min(1, "학부모 성함을 입력해 주세요.")
    .max(40, "성함은 40자까지 입력할 수 있어요."),
  phone: z
    .string()
    .regex(/^010-\d{4}-\d{4}$/, "010-0000-0000 형식으로 입력해 주세요."),
  grade: z.enum(GRADES, { error: "학생 학년을 골라 주세요." }),
  message: z
    .string()
    .max(1000, "궁금한 점은 1000자까지 쓸 수 있어요.")
    .transform((s) => s.trim() || null),
  guardianConfirmed: z.literal(true, {
    error: "보호자만 신청할 수 있어요. 확인란을 체크해 주세요.",
  }),
  privacyAgreed: z.literal(true, {
    error: "개인정보 수집·이용에 동의해 주세요.",
  }),
});

export type ConsultFormInput = z.input<typeof consultFormSchema>;
export type ConsultFormOutput = z.output<typeof consultFormSchema>;
export type SubmitConsultationPayload = ConsultFormOutput & {
  consentVersion: string;
  turnstileToken: string;
};

export type SubmitErrorCode =
  "invalid" | "captcha" | "rate_limited" | "forbidden_origin" | "server";

const SUBMIT_ERROR_CODES: readonly string[] = [
  "invalid",
  "captcha",
  "rate_limited",
  "forbidden_origin",
  "server",
] satisfies SubmitErrorCode[];

export function isSubmitErrorCode(value: unknown): value is SubmitErrorCode {
  return typeof value === "string" && SUBMIT_ERROR_CODES.includes(value);
}

export class SubmitConsultationError extends Error {
  override name = "SubmitConsultationError";
  constructor(
    readonly code: SubmitErrorCode,
    /** 서버가 보낸 안내 문구. `invalid`일 때만 화면에 쓴다. */
    readonly serverMessage?: string,
  ) {
    super(code);
  }
}

const SEND_FAILED =
  "신청을 보내지 못했어요. 잠시 후 다시 시도하거나 전화로 문의해 주세요.";

const CODE_MESSAGES: Record<SubmitErrorCode, string> = {
  captcha:
    "자동 입력 방지 확인이 끝나지 않았어요. 확인 상자를 다시 눌러 주세요.",
  rate_limited: "오늘은 이 번호로 더 신청할 수 없어요. 전화로 문의해 주세요.",
  invalid: "입력한 내용을 다시 확인해 주세요.",
  server: SEND_FAILED,
  forbidden_origin: SEND_FAILED,
};

export function submitErrorMessage(error: unknown): string {
  if (error instanceof SubmitConsultationError) {
    if (error.code === "invalid" && error.serverMessage) {
      return error.serverMessage;
    }
    return CODE_MESSAGES[error.code];
  }
  return classifyError(error).message;
}
