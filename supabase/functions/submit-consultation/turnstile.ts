// Cloudflare Turnstile 서버 검증. 네트워크 오류는 그대로 던져서 handler가 500으로 바꾼다.
const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetchFn(SITEVERIFY_URL, { method: "POST", body });
  if (!res.ok) throw new Error(`turnstile siteverify HTTP ${res.status}`);
  const data: unknown = await res.json();
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { success?: unknown }).success === true
  );
}
