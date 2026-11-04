import { assertEquals } from "@std/assert";
import { createHandler, type Deps } from "./handler.ts";

const ORIGIN = "https://dev.heesu.pages.dev";
const URL_ = "http://localhost/functions/v1/reset-student-password";
const ADMIN_ID = "00000000-0000-4000-8000-0000000000a1";
const STUDENT_ID = "10000000-0000-4000-8000-0000000000c1";
const STUDENT_USER_ID = "00000000-0000-4000-8000-0000000000c1";
const PASSWORD = "new-pass-123";
const VALID = { studentId: STUDENT_ID, password: PASSWORD };

type Student = Awaited<ReturnType<Deps["findStudent"]>>;

function setup(overrides: Partial<Deps> = {}) {
  const log: string[] = [];
  const base: Deps = {
    getClaims: () => Promise.resolve({ sub: ADMIN_ID, aal: "aal2" }),
    isAdmin: (userId) => Promise.resolve(userId === ADMIN_ID),
    findStudent: () =>
      Promise.resolve<Student>({ userId: STUDENT_USER_ID, status: "active" }),
    markMustChange: () => Promise.resolve(),
    setPassword: () => Promise.resolve(),
  };
  const impl = { ...base, ...overrides };
  const deps: Deps = {
    getClaims(jwt) {
      log.push(`getClaims:${jwt}`);
      return impl.getClaims(jwt);
    },
    isAdmin(userId) {
      log.push(`isAdmin:${userId}`);
      return impl.isAdmin(userId);
    },
    findStudent(id) {
      log.push(`findStudent:${id}`);
      return impl.findStudent(id);
    },
    markMustChange(id) {
      log.push(`markMustChange:${id}`);
      return impl.markMustChange(id);
    },
    setPassword(userId, password) {
      log.push(`setPassword:${userId}:${password}`);
      return impl.setPassword(userId, password);
    },
  };
  const called = (name: string) =>
    log.filter((l) => l.startsWith(`${name}:`)).length;
  return { handler: createHandler(deps), log, called };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(URL_, {
    method: "POST",
    headers: {
      origin: ORIGIN,
      authorization: "Bearer admin.jwt",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function expectError(res: Response, status: number, error: string) {
  assertEquals(res.status, status);
  const json = await res.json();
  assertEquals(json.error, error);
  return json as { error: string; message: string };
}

Deno.test("disallowed origin is rejected before any dependency", async () => {
  const { handler, log } = setup();
  await expectError(
    await handler(post(VALID, { origin: "https://x.heesu.pages.dev" })),
    403,
    "forbidden_origin",
  );
  assertEquals(log, []);
});

Deno.test("missing Authorization is 401", async () => {
  const { handler, log } = setup();
  await expectError(
    await handler(post(VALID, { authorization: "" })),
    401,
    "unauthorized",
  );
  assertEquals(log, []);
});

Deno.test("aal1 session is 403 without asking isAdmin", async () => {
  const { handler, called } = setup({
    getClaims: () => Promise.resolve({ sub: ADMIN_ID, aal: "aal1" }),
  });
  const json = await expectError(await handler(post(VALID)), 403, "forbidden");
  assertEquals(
    json.message,
    "원장 계정(2단계 인증 완료)으로만 할 수 있어요. 다시 로그인해 주세요.",
  );
  assertEquals(called("isAdmin"), 0);
  assertEquals(called("setPassword"), 0);
});

Deno.test("studentId must be a uuid", async () => {
  const { handler, called } = setup();
  const json = await expectError(
    await handler(post({ ...VALID, studentId: "haneul" })),
    400,
    "invalid",
  );
  assertEquals(
    json.message,
    "학생 정보를 읽지 못했어요. 목록을 새로고침한 뒤 다시 시도해 주세요.",
  );
  assertEquals(called("findStudent"), 0);
});

Deno.test("password shorter than 8 is 400", async () => {
  const { handler, called } = setup();
  const json = await expectError(
    await handler(post({ ...VALID, password: "1234567" })),
    400,
    "invalid",
  );
  assertEquals(
    json.message,
    "비밀번호는 8자 이상, 영문 기준 72자 이하로 입력해 주세요.",
  );
  assertEquals(called("findStudent"), 0);
});

Deno.test("unknown student or student without login is 404", async () => {
  for (const found of [null, { userId: null, status: "active" as const }]) {
    const { handler, called } = setup({
      findStudent: () => Promise.resolve<Student>(found),
    });
    const json = await expectError(
      await handler(post(VALID)),
      404,
      "not_found",
    );
    assertEquals(
      json.message,
      "학생을 찾을 수 없어요. 목록을 새로고침한 뒤 다시 시도해 주세요.",
    );
    assertEquals(called("markMustChange") + called("setPassword"), 0);
  }
});

Deno.test("student who left is 409", async () => {
  const { handler, called } = setup({
    findStudent: () =>
      Promise.resolve<Student>({ userId: STUDENT_USER_ID, status: "left" }),
  });
  const json = await expectError(
    await handler(post(VALID)),
    409,
    "student_left",
  );
  assertEquals(
    json.message,
    "퇴원한 학생은 비밀번호를 바꿀 수 없어요. 상태를 재원으로 바꾼 뒤 시도해 주세요.",
  );
  assertEquals(called("markMustChange") + called("setPassword"), 0);
});

Deno.test("a student row linked to an admin account is 409", async () => {
  const { handler, called } = setup({
    isAdmin: () => Promise.resolve(true),
  });
  const json = await expectError(
    await handler(post(VALID)),
    409,
    "student_is_admin",
  );
  assertEquals(json.message, "관리자 계정은 여기서 바꿀 수 없어요.");
  assertEquals(called("markMustChange") + called("setPassword"), 0);
});

Deno.test(
  "success flags must_change_password before setting the password",
  async () => {
    const { handler, log } = setup();
    const res = await handler(post(VALID));
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("access-control-allow-origin"), ORIGIN);
    assertEquals(await res.json(), { ok: true });
    assertEquals(log, [
      "getClaims:admin.jwt",
      `isAdmin:${ADMIN_ID}`,
      `findStudent:${STUDENT_ID}`,
      `isAdmin:${STUDENT_USER_ID}`,
      `markMustChange:${STUDENT_ID}`,
      `setPassword:${STUDENT_USER_ID}:${PASSWORD}`,
    ]);
  },
);

Deno.test(
  "setPassword failure is 500 and is not logged with the password",
  async () => {
    const logged: unknown[][] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => logged.push(args);
    try {
      const { handler } = setup({
        setPassword: () =>
          Promise.reject(
            Object.assign(new Error(`bad ${PASSWORD}`), { code: "weak" }),
          ),
      });
      const json = await expectError(await handler(post(VALID)), 500, "server");
      assertEquals(
        json.message,
        "잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      console.error = origError;
    }
    assertEquals(logged.length > 0, true);
    assertEquals(JSON.stringify(logged).includes(PASSWORD), false);
  },
);
