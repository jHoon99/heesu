// 학생 계정 만들기(원장 전용, 설계 13장 S4·S5, v1 스펙 §11). 공개 저장소: 누구나 읽는다는 전제로 쓴다.
// 순서: Origin·메서드 → 원장 확인(getClaims → aal2 → admins) → 본문 검증 → Auth 사용자 → students 행.
// 이메일 도메인은 함수가 고정하고, 역할은 students.user_id로만 생긴다(app/user_metadata 없음).
// students 행을 못 만들면 방금 만든 Auth 사용자를 지워서 로그인만 되는 계정을 남기지 않는다.
// 로그에는 오류 종류·코드만 남긴다(비밀번호·이름·JWT 금지).
import {
  ADMIN_MESSAGES,
  type AdminDeps,
  type Grade,
  GRADES,
  isValidPassword,
  LOGIN_ID_RE,
  requireAdmin,
  STUDENT_EMAIL_DOMAIN,
} from "../_shared/admin.ts";
import { charLength, describeError, json, preflight } from "../_shared/http.ts";

export type StudentRow = {
  userId: string;
  loginId: string;
  name: string;
  grade: Grade;
  joinedAt: string;
};

export type Deps = AdminDeps & {
  createAuthUser(
    email: string,
    password: string,
  ): Promise<{ ok: true; userId: string } | { ok: false; reason: "exists" }>;
  insertStudent(
    row: StudentRow,
  ): Promise<{ ok: true; id: string } | { ok: false; reason: "exists" }>;
  deleteAuthUser(userId: string): Promise<void>;
};

type Input = Omit<StudentRow, "userId"> & { password: string };

const MAX_BODY_CHARS = 16_000;

const MESSAGES = {
  ...ADMIN_MESSAGES,
  body: "요청 내용을 읽지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
  loginId: "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자로 입력해 주세요.",
  name: "이름을 1~20자로 입력해 주세요.",
  grade: "학년을 중1부터 고3 중에서 골라 주세요.",
  joinedAt: "등록일을 2026-11-05 형식으로 입력해 주세요.",
  loginTaken: "이미 쓰고 있는 아이디예요. 다른 아이디를 입력해 주세요.",
} as const;

function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function parseBody(
  raw: string,
): { ok: true; input: Input } | { ok: false; message: string } {
  const fail = (message: string) => ({ ok: false as const, message });
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

  if (typeof b.loginId !== "string" || !LOGIN_ID_RE.test(b.loginId)) {
    return fail(MESSAGES.loginId);
  }
  if (typeof b.password !== "string" || !isValidPassword(b.password)) {
    return fail(MESSAGES.password);
  }
  if (typeof b.name !== "string") return fail(MESSAGES.name);
  const name = b.name.trim();
  const nameLen = charLength(name);
  if (nameLen < 1 || nameLen > 20) return fail(MESSAGES.name);

  const grade = GRADES.find((g) => g === b.grade);
  if (grade === undefined) return fail(MESSAGES.grade);

  if (!isDate(b.joinedAt)) return fail(MESSAGES.joinedAt);

  return {
    ok: true,
    input: {
      loginId: b.loginId,
      password: b.password,
      name,
      grade,
      joinedAt: b.joinedAt,
    },
  };
}

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  return async (req) => {
    const pre = preflight(req);
    if (!pre.ok) return pre.response;
    const { origin } = pre;

    let createdUserId: string | null = null;
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
      const { password, ...student } = parsed.input;
      const loginTaken = () =>
        json(
          409,
          { error: "login_taken", message: MESSAGES.loginTaken },
          origin,
        );

      const created = await deps.createAuthUser(
        `${student.loginId}@${STUDENT_EMAIL_DOMAIN}`,
        password,
      );
      if (!created.ok) return loginTaken();
      createdUserId = created.userId;

      const inserted = await deps.insertStudent({
        userId: created.userId,
        ...student,
      });
      if (!inserted.ok) {
        await removeAuthUser(deps, created.userId);
        return loginTaken();
      }
      return json(201, { id: inserted.id }, origin);
    } catch (err) {
      console.error("create-student failed", describeError(err));
      if (createdUserId !== null) await removeAuthUser(deps, createdUserId);
      return json(500, { error: "server", message: MESSAGES.server }, origin);
    }
  };
}

/** 정리 실패는 로그만 남기고 삼킨다(응답은 원래 결과대로). */
async function removeAuthUser(deps: Deps, userId: string): Promise<void> {
  try {
    await deps.deleteAuthUser(userId);
  } catch (err) {
    console.error(
      "create-student: auth user cleanup failed",
      describeError(err),
    );
  }
}
