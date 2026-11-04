// 원장 전용 Edge Function 공통: 호출자 확인과 학생 계정 입력 규칙(설계 13장 S4·S5, v1 스펙 §11).
// 원장 확인 순서: getClaims(서명 검증된 클레임) → aal2 → private.admins(service_role RPC).
// 역할은 DB로만 판단한다. JWT의 user_metadata·app_metadata는 보지 않는다.
import { charLength } from "./http.ts";

export type AdminDeps = {
  /** 서명을 검증한 클레임. 검증 실패·만료면 null. */
  getClaims(jwt: string): Promise<{ sub: string; aal: string | null } | null>;
  /** public.admin_user_exists(sub). 조회 실패는 throw. */
  isAdmin(userId: string): Promise<boolean>;
};

export const ADMIN_MESSAGES = {
  unauthorized: "로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.",
  forbidden:
    "원장 계정(2단계 인증 완료)으로만 할 수 있어요. 다시 로그인해 주세요.",
  password: "비밀번호는 8자 이상, 영문 기준 72자 이하로 입력해 주세요.",
  server: "잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
} as const;

/** aal1과 원장 아님은 같은 403으로 돌려줘서 어느 단계에서 막혔는지 드러내지 않는다. */
export async function requireAdmin(
  req: Request,
  deps: AdminDeps,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: "unauthorized" | "forbidden" }
> {
  const match = /^Bearer\s+(\S+)$/i.exec(
    req.headers.get("authorization") ?? "",
  );
  if (!match) return { ok: false, status: 401, error: "unauthorized" };

  const claims = await deps.getClaims(match[1]);
  if (claims === null) return { ok: false, status: 401, error: "unauthorized" };
  if (claims.aal !== "aal2") {
    return { ok: false, status: 403, error: "forbidden" };
  }
  if (!(await deps.isAdmin(claims.sub))) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true, userId: claims.sub };
}

const encoder = new TextEncoder();

/** 8자(코드 포인트) 이상, UTF-8 72바이트 이하(bcrypt가 그 뒤를 버린다). */
export function isValidPassword(pw: string): boolean {
  return charLength(pw) >= 8 && encoder.encode(pw).length <= 72;
}

export const LOGIN_ID_RE = /^[a-z0-9_]{3,20}$/;
export const STUDENT_EMAIL_DOMAIN = "student.heesu.internal";

export const GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"] as const;
export type Grade = (typeof GRADES)[number];
