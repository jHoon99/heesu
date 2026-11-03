// 학생 비밀번호 초기화(원장 전용, v1 스펙 §11). 공개 저장소: 누구나 읽는다는 전제로 쓴다.
// 순서: Origin·메서드 → 원장 확인(getClaims → aal2 → admins) → 본문 검증 → 학생 확인 → 플래그 → 비밀번호.
// must_change_password를 먼저 켠다: 비밀번호만 바뀌고 첫 로그인 변경 강제가 빠지는 일이 없게.
// 로그에는 오류 종류·코드만 남긴다(비밀번호·JWT 금지).
import {
  ADMIN_MESSAGES,
  type AdminDeps,
  isValidPassword,
  requireAdmin,
} from "../_shared/admin.ts";
import { describeError, json, preflight } from "../_shared/http.ts";

export type Deps = AdminDeps & {
  findStudent(id: string): Promise<{
    userId: string | null;
    status: "active" | "paused" | "left";
  } | null>;
  markMustChange(id: string): Promise<void>;
  setPassword(userId: string, password: string): Promise<void>;
};

const MAX_BODY_CHARS = 16_000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGES = {
  ...ADMIN_MESSAGES,
  studentId:
    "학생 정보를 읽지 못했어요. 목록을 새로고침한 뒤 다시 시도해 주세요.",
  notFound: "학생을 찾을 수 없어요. 목록을 새로고침한 뒤 다시 시도해 주세요.",
  studentLeft:
    "퇴원한 학생은 비밀번호를 바꿀 수 없어요. 상태를 재원으로 바꾼 뒤 시도해 주세요.",
} as const;

function parseBody(
  raw: string,
):
  | { ok: true; studentId: string; password: string }
  | { ok: false; message: string } {
  const fail = (message: string) => ({ ok: false as const, message });
  if (raw.length > MAX_BODY_CHARS) return fail(MESSAGES.studentId);

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail(MESSAGES.studentId);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return fail(MESSAGES.studentId);
  }
  const b = data as Record<string, unknown>;

  if (typeof b.studentId !== "string" || !UUID_RE.test(b.studentId)) {
    return fail(MESSAGES.studentId);
  }
  if (typeof b.password !== "string" || !isValidPassword(b.password)) {
    return fail(MESSAGES.password);
  }
  return { ok: true, studentId: b.studentId, password: b.password };
}

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  return async (req) => {
    const pre = preflight(req);
    if (!pre.ok) return pre.response;
    const { origin } = pre;

    try {
      const auth = await requireAdmin(req, deps);
      if (!auth.ok) {
        return json(
          auth.status,
          { error: auth.error, message: MESSAGES[auth.error] },
          origin,
        );
      }

      const parsed = parseBody(await req.text());
      if (!parsed.ok) {
        return json(400, { error: "invalid", message: parsed.message }, origin);
      }

      const student = await deps.findStudent(parsed.studentId);
      if (student === null || student.userId === null) {
        return json(
          404,
          { error: "not_found", message: MESSAGES.notFound },
          origin,
        );
      }
      if (student.status === "left") {
        return json(
          409,
          { error: "student_left", message: MESSAGES.studentLeft },
          origin,
        );
      }

      await deps.markMustChange(parsed.studentId);
      await deps.setPassword(student.userId, parsed.password);
      return json(200, { ok: true }, origin);
    } catch (err) {
      console.error("reset-student-password failed", describeError(err));
      return json(500, { error: "server", message: MESSAGES.server }, origin);
    }
  };
}
