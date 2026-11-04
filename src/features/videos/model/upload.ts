import { FILE_TOO_LARGE_MESSAGE, MP4_ONLY_MESSAGE } from "./videos";

const LOGIN_MESSAGE =
  "로그인이 만료됐거나 권한이 없어요. 다시 로그인한 뒤 올려 주세요.";
const NETWORK_MESSAGE =
  "인터넷 연결이 끊겼어요. 연결되면 '다시 올리기'를 눌러 이어서 올려 주세요.";
const FALLBACK_MESSAGE = "업로드하지 못했어요. 잠시 후 다시 올려 주세요.";

type ResponseLike = { getStatus(): number; getBody(): string };

function isResponseLike(value: unknown): value is ResponseLike {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.getStatus === "function" && typeof r.getBody === "function";
}

/** tus 업로드 오류(DetailedError 모양)를 원장에게 보여 줄 문구로 바꿔요. */
export function uploadErrorMessage(e: unknown): string {
  if (typeof e !== "object" || e === null || !("originalResponse" in e)) {
    return FALLBACK_MESSAGE;
  }
  const res = (e as { originalResponse: unknown }).originalResponse;
  if (res === null || res === undefined) return NETWORK_MESSAGE;
  if (!isResponseLike(res)) return FALLBACK_MESSAGE;
  const status = res.getStatus();
  // 응답 없이 끊긴 XHR은 status 0이에요.
  if (status === 0) return NETWORK_MESSAGE;
  if (status === 413) return FILE_TOO_LARGE_MESSAGE;
  let body = "";
  try {
    body = res.getBody() ?? "";
  } catch {
    body = "";
  }
  if (status === 415 || /mime/i.test(body)) return MP4_ONLY_MESSAGE;
  if (status === 401 || status === 403) return LOGIN_MESSAGE;
  return FALLBACK_MESSAGE;
}
