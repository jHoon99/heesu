// Edge Function 공통 HTTP 처리: Origin 허용 목록·CORS·JSON 응답·안전한 오류 로그(설계 13장 S4·S5).
// 공개 저장소: 누구나 읽는다는 전제로 쓴다. 허용 주소는 정확한 값만, 와일드카드 금지.

export const ALLOWED_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "https://dev.heesu.pages.dev",
  "https://heesu.pages.dev",
];

const MESSAGES = {
  forbiddenOrigin:
    "허용되지 않은 주소에서 보낸 요청이에요. 희수영어 관리 화면에서 다시 시도해 주세요.",
  method: "이 기능은 POST 요청으로만 받아요.",
} as const;

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/** origin이 null이면(허용되지 않은 주소) CORS 헤더를 붙이지 않는다. */
export function json(
  status: number,
  body: unknown,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(origin ? corsHeaders(origin) : { Vary: "Origin" }),
      "content-type": "application/json",
    },
  });
}

/** Origin 허용 목록 → OPTIONS 프리플라이트 → POST만. 통과하면 허용된 origin을 돌려준다. */
export function preflight(
  req: Request,
): { ok: true; origin: string } | { ok: false; response: Response } {
  const origin = req.headers.get("origin");
  if (origin === null || !ALLOWED_ORIGINS.includes(origin)) {
    return {
      ok: false,
      response: json(
        403,
        { error: "forbidden_origin", message: MESSAGES.forbiddenOrigin },
        null,
      ),
    };
  }
  if (req.method === "OPTIONS") {
    return {
      ok: false,
      response: new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      }),
    };
  }
  if (req.method !== "POST") {
    return {
      ok: false,
      response: json(
        405,
        { error: "method", message: MESSAGES.method },
        origin,
      ),
    };
  }
  return { ok: true, origin };
}

/** Postgres char_length와 같게 코드 포인트 단위로 센다. */
export function charLength(s: string): number {
  return [...s].length;
}

/** 로그에는 오류 종류와 코드만 남긴다(메시지·details에는 요청 값이 들어 있을 수 있다). */
export function describeError(err: unknown): {
  name: string;
  code: string | null;
} {
  const name = err instanceof Error ? err.name : typeof err;
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : null;
  return { name, code };
}
