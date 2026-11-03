export type ApiErrorKind =
  | "notFound"
  | "forbidden"
  | "network"
  | "server"
  | "conflict"
  | "invalid"
  | "unknown";

const MESSAGES: Record<ApiErrorKind, string> = {
  notFound: "이미 삭제되었거나 찾을 수 없어요.",
  forbidden: "접근 권한이 없어요.",
  network: "네트워크 상태를 확인해 주세요.",
  server: "잠시 후 다시 시도해 주세요.",
  conflict: "이미 처리된 요청이에요.",
  invalid: "입력한 내용을 다시 확인해 주세요.",
  unknown: "문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
};

const result = (kind: ApiErrorKind) => ({ kind, message: MESSAGES[kind] });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function kindFromCode(code: string): ApiErrorKind | null {
  if (code === "PGRST116") return "notFound";
  if (code === "42501") return "forbidden";
  if (code === "23505") return "conflict";
  if (code === "23514" || code === "22001") return "invalid";
  return null;
}

function toStatus(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  return null;
}

function kindFromStatus(status: number): ApiErrorKind | null {
  if (status >= 500 && status <= 599) return "server";
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  return null;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return /failed to fetch|load failed|networkerror|network request failed/i.test(error.message);
  }
  return isRecord(error) && error.name === "FunctionsFetchError";
}

export function classifyError(error: unknown): { kind: ApiErrorKind; message: string } {
  if (isNetworkError(error)) return result("network");
  if (!isRecord(error)) return result("unknown");

  if (typeof error.code === "string") {
    const kind = kindFromCode(error.code);
    if (kind) return result(kind);
  }

  const status = toStatus(error.status) ?? toStatus(error.statusCode);
  if (status !== null) {
    const kind = kindFromStatus(status);
    if (kind) return result(kind);
  }

  return result("unknown");
}
