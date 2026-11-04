// 상담 신청 Edge Function의 요청 처리(설계 13장 S4·S6). 공개 저장소: 누구나 읽는다는 전제로 쓴다.
// 순서: Origin 허용 목록 → 메서드 → 본문 검증·정규화 → Turnstile → RPC.
// DB 오류 문구는 클라이언트에 보내지 않고, 서버 로그에도 요청 값(이름·번호 등)을 남기지 않는다.

import {
  ALLOWED_ORIGINS,
  charLength,
  corsHeaders,
  describeError,
  json,
} from "../_shared/http.ts";

export { ALLOWED_ORIGINS };

export const ACCEPTED_CONSENT_VERSIONS: readonly string[] = ["2026-11-05"];

const GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"] as const;
export type Grade = (typeof GRADES)[number];

export type SubmitInput = {
  parentName: string;
  phone: string;
  grade: Grade;
  message: string | null;
  consentVersion: string;
};

export type Deps = {
  verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean>;
  submit(input: SubmitInput): Promise<"ok" | "rate_limited">;
};

const MAX_BODY_CHARS = 16_000;
const MAX_TOKEN_CHARS = 2048;

const MESSAGES = {
  body: "신청 내용을 읽지 못했어요. 페이지를 새로고침한 뒤 다시 신청해 주세요.",
  parentName: "보호자 성함을 1~40자로 적어 주세요.",
  phone:
    "휴대전화 번호를 010-1234-5678처럼 010으로 시작하는 11자리로 적어 주세요.",
  grade: "학년을 중1부터 고3 중에서 골라 주세요.",
  message: "문의 내용을 1000자 이하로 줄여 주세요.",
  guardianConfirmed: "보호자가 직접 작성한다는 확인란에 체크해 주세요.",
  privacyAgreed: "개인정보 수집·이용에 동의해 주세요.",
  consentVersion:
    "동의 안내가 바뀌었어요. 페이지를 새로고침한 뒤 다시 신청해 주세요.",
  turnstileToken: "자동 입력 방지 확인을 마친 뒤 다시 신청해 주세요.",
  captcha: "자동 입력 방지 확인에 실패했어요. 확인을 다시 한 뒤 신청해 주세요.",
  rateLimited: "오늘은 이 번호로 더 신청할 수 없어요. 전화로 문의해 주세요.",
  forbiddenOrigin:
    "허용되지 않은 주소에서 보낸 요청이에요. 희수영어 홈페이지에서 신청해 주세요.",
  method: "신청은 POST 요청으로만 받아요.",
  server: "잠시 문제가 생겼어요. 잠시 후 다시 신청하거나 전화로 문의해 주세요.",
} as const;

type Invalid = { ok: false; message: string };
type Parsed = { ok: true; token: string; input: SubmitInput };

/** 숫자 사이 공백·하이픈만 허용하고 010-XXXX-XXXX로 맞춘다. 그 밖의 형식은 null. */
function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^[0-9][0-9 -]*$/.test(trimmed)) return null;
  const digits = trimmed.replace(/[ -]/g, "");
  if (!/^010[0-9]{8}$/.test(digits)) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function parseBody(raw: string): Parsed | Invalid {
  const fail = (message: string): Invalid => ({ ok: false, message });
  if (raw.length > MAX_BODY_CHARS) return fail(MESSAGES.body);

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail(MESSAGES.body);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return fail(MESSAGES.body);
  }
  const b = data as Record<string, unknown>;

  if (typeof b.parentName !== "string") return fail(MESSAGES.parentName);
  const parentName = b.parentName.trim();
  const nameLen = charLength(parentName);
  if (nameLen < 1 || nameLen > 40) return fail(MESSAGES.parentName);

  const phone = typeof b.phone === "string" ? normalizePhone(b.phone) : null;
  if (phone === null) return fail(MESSAGES.phone);

  const grade = GRADES.find((g) => g === b.grade);
  if (grade === undefined) return fail(MESSAGES.grade);

  let message: string | null;
  if (b.message === null || b.message === undefined) message = null;
  else if (typeof b.message === "string" && charLength(b.message) <= 1000)
    message = b.message;
  else return fail(MESSAGES.message);

  if (b.guardianConfirmed !== true) return fail(MESSAGES.guardianConfirmed);
  if (b.privacyAgreed !== true) return fail(MESSAGES.privacyAgreed);

  if (
    typeof b.consentVersion !== "string" ||
    !ACCEPTED_CONSENT_VERSIONS.includes(b.consentVersion)
  ) {
    return fail(MESSAGES.consentVersion);
  }

  if (
    typeof b.turnstileToken !== "string" ||
    b.turnstileToken.length === 0 ||
    b.turnstileToken.length > MAX_TOKEN_CHARS
  ) {
    return fail(MESSAGES.turnstileToken);
  }

  return {
    ok: true,
    token: b.turnstileToken,
    input: {
      parentName,
      phone,
      grade,
      message,
      consentVersion: b.consentVersion,
    },
  };
}

function firstForwardedIp(req: Request): string | null {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first ? first : null;
}

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  return async (req) => {
    const requestOrigin = req.headers.get("origin");
    if (requestOrigin === null || !ALLOWED_ORIGINS.includes(requestOrigin)) {
      return json(
        403,
        { error: "forbidden_origin", message: MESSAGES.forbiddenOrigin },
        null,
      );
    }
    const origin = requestOrigin;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== "POST") {
      return json(405, { error: "method", message: MESSAGES.method }, origin);
    }

    try {
      const parsed = parseBody(await req.text());
      if (!parsed.ok) {
        return json(400, { error: "invalid", message: parsed.message }, origin);
      }

      if (!(await deps.verifyTurnstile(parsed.token, firstForwardedIp(req)))) {
        return json(
          400,
          { error: "captcha", message: MESSAGES.captcha },
          origin,
        );
      }

      const result = await deps.submit(parsed.input);
      if (result === "rate_limited") {
        return json(
          429,
          { error: "rate_limited", message: MESSAGES.rateLimited },
          origin,
        );
      }
      return json(200, { ok: true }, origin);
    } catch (err) {
      console.error("submit-consultation failed", describeError(err));
      return json(500, { error: "server", message: MESSAGES.server }, origin);
    }
  };
}
