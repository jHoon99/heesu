import { assertEquals, assertFalse } from "@std/assert";
import { createHandler, type Deps } from "./handler.ts";

const ORIGIN = "http://localhost:3000";
const URL_ = "http://localhost/functions/v1/create-student";
const ADMIN_ID = "00000000-0000-4000-8000-0000000000a1";
const NEW_USER_ID = "00000000-0000-4000-8000-0000000000b1";
const STUDENT_ID = "10000000-0000-4000-8000-0000000000b1";
const PASSWORD = "first-pass-123";

const VALID = {
  loginId: "haneul",
  password: PASSWORD,
  name: "김하늘",
  grade: "중2",
  joinedAt: "2026-11-05",
};

const MSG = {
  body: "요청 내용을 읽지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
  loginId: "아이디는 영문 소문자·숫자·밑줄(_)로 3~20자로 입력해 주세요.",
  password: "비밀번호는 8자 이상, 영문 기준 72자 이하로 입력해 주세요.",
  name: "이름을 1~20자로 입력해 주세요.",
  grade: "학년을 중1부터 고3 중에서 골라 주세요.",
  joinedAt: "등록일을 2026-11-05 형식으로 입력해 주세요.",
};

type Calls = {
  getClaims: string[];
  isAdmin: string[];
  createAuthUser: Array<[string, string]>;
  insertStudent: Array<Parameters<Deps["insertStudent"]>[0]>;
  deleteAuthUser: string[];
};

function setup(overrides: Partial<Deps> = {}) {
  const calls: Calls = {
    getClaims: [],
    isAdmin: [],
    createAuthUser: [],
    insertStudent: [],
    deleteAuthUser: [],
  };
  const base: Deps = {
    getClaims() {
      return Promise.resolve({ sub: ADMIN_ID, aal: "aal2" });
    },
    isAdmin() {
      return Promise.resolve(true);
    },
    createAuthUser() {
      return Promise.resolve({ ok: true, userId: NEW_USER_ID });
    },
    insertStudent() {
      return Promise.resolve({ ok: true, id: STUDENT_ID });
    },
    deleteAuthUser() {
      return Promise.resolve();
    },
  };
  const impl = { ...base, ...overrides };
  const deps: Deps = {
    getClaims(jwt) {
      calls.getClaims.push(jwt);
      return impl.getClaims(jwt);
    },
    isAdmin(userId) {
      calls.isAdmin.push(userId);
      return impl.isAdmin(userId);
    },
    createAuthUser(email, password) {
      calls.createAuthUser.push([email, password]);
      return impl.createAuthUser(email, password);
    },
    insertStudent(row) {
      calls.insertStudent.push(row);
      return impl.insertStudent(row);
    },
    deleteAuthUser(userId) {
      calls.deleteAuthUser.push(userId);
      return impl.deleteAuthUser(userId);
    },
  };
  const total = () =>
    calls.getClaims.length +
    calls.isAdmin.length +
    calls.createAuthUser.length +
    calls.insertStudent.length +
    calls.deleteAuthUser.length;
  return { handler: createHandler(deps), calls, total };
}

function post(
  body: unknown,
  opts: { headers?: Record<string, string>; raw?: string } = {},
): Request {
  return new Request(URL_, {
    method: "POST",
    headers: {
      origin: ORIGIN,
      authorization: "Bearer admin.jwt",
      "content-type": "application/json",
      ...opts.headers,
    },
    body: opts.raw ?? JSON.stringify(body),
  });
}

async function expectError(res: Response, status: number, error: string) {
  assertEquals(res.status, status);
  const json = await res.json();
  assertEquals(json.error, error);
  return json as { error: string; message: string };
}

async function expectInvalid(body: unknown, message: string) {
  const { handler, calls } = setup();
  const json = await expectError(await handler(post(body)), 400, "invalid");
  assertEquals(json.message, message);
  assertEquals(calls.createAuthUser.length, 0);
}

Deno.test("disallowed origin is rejected before any dependency", async () => {
  const { handler, total } = setup();
  const res = await handler(
    post(VALID, { headers: { origin: "https://evil.example" } }),
  );
  await expectError(res, 403, "forbidden_origin");
  assertEquals(res.headers.get("access-control-allow-origin"), null);
  assertEquals(total(), 0);
});

Deno.test("OPTIONS from an allowed origin returns the preflight", async () => {
  const { handler, total } = setup();
  const res = await handler(
    new Request(URL_, { method: "OPTIONS", headers: { origin: ORIGIN } }),
  );
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("access-control-allow-origin"), ORIGIN);
  assertEquals(total(), 0);
});

Deno.test("missing Authorization is 401", async () => {
  const { handler, calls } = setup();
  const json = await expectError(
    await handler(post(VALID, { headers: { authorization: "" } })),
    401,
    "unauthorized",
  );
  assertEquals(
    json.message,
    "로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.",
  );
  assertEquals(calls.getClaims.length, 0);
  assertEquals(calls.createAuthUser.length, 0);
});

Deno.test("unverifiable JWT is 401", async () => {
  const { handler, calls } = setup({ getClaims: () => Promise.resolve(null) });
  await expectError(await handler(post(VALID)), 401, "unauthorized");
  assertEquals(calls.getClaims, ["admin.jwt"]);
  assertEquals(calls.createAuthUser.length, 0);
});

Deno.test("aal1 session is 403 without asking isAdmin", async () => {
  const { handler, calls } = setup({
    getClaims: () => Promise.resolve({ sub: ADMIN_ID, aal: "aal1" }),
  });
  const json = await expectError(await handler(post(VALID)), 403, "forbidden");
  assertEquals(
    json.message,
    "원장 계정(2단계 인증 완료)으로만 할 수 있어요. 다시 로그인해 주세요.",
  );
  assertEquals(calls.isAdmin.length, 0);
  assertEquals(calls.createAuthUser.length, 0);
});

Deno.test("aal2 non-admin is 403 with the same message", async () => {
  const { handler, calls } = setup({ isAdmin: () => Promise.resolve(false) });
  const json = await expectError(await handler(post(VALID)), 403, "forbidden");
  assertEquals(
    json.message,
    "원장 계정(2단계 인증 완료)으로만 할 수 있어요. 다시 로그인해 주세요.",
  );
  assertEquals(calls.isAdmin, [ADMIN_ID]);
  assertEquals(calls.createAuthUser.length, 0);
});

Deno.test("admin lookup failure is 500, not a silent pass", async () => {
  const origError = console.error;
  console.error = () => {};
  try {
    const { handler, calls } = setup({
      isAdmin: () => Promise.reject(new Error("rpc down")),
    });
    await expectError(await handler(post(VALID)), 500, "server");
    assertEquals(calls.createAuthUser.length, 0);
  } finally {
    console.error = origError;
  }
});

Deno.test("non-JSON body is 400 body", async () => {
  const { handler, calls } = setup();
  const json = await expectError(
    await handler(post(null, { raw: "not json" })),
    400,
    "invalid",
  );
  assertEquals(json.message, MSG.body);
  assertEquals(calls.createAuthUser.length, 0);
});

Deno.test("oversized body is 400 body", async () => {
  await expectInvalid({ ...VALID, name: "가".repeat(16_001) }, MSG.body);
});

Deno.test("loginId must match ^[a-z0-9_]{3,20}$", async () => {
  for (const loginId of ["Haneul", "ab", "a".repeat(21), "ha-neul", 7]) {
    await expectInvalid({ ...VALID, loginId }, MSG.loginId);
  }
});

Deno.test(
  "password must be 8+ code points and at most 72 UTF-8 bytes",
  async () => {
    await expectInvalid({ ...VALID, password: "1234567" }, MSG.password);
    await expectInvalid({ ...VALID, password: "가".repeat(25) }, MSG.password);
    await expectInvalid({ ...VALID, password: "a".repeat(73) }, MSG.password);

    const { handler } = setup();
    const res = await handler(post({ ...VALID, password: "a".repeat(72) }));
    assertEquals(res.status, 201);
  },
);

Deno.test("name must be 1-20 characters after trim", async () => {
  await expectInvalid({ ...VALID, name: "  " }, MSG.name);
  await expectInvalid({ ...VALID, name: "가".repeat(21) }, MSG.name);

  const { handler, calls } = setup();
  const res = await handler(post({ ...VALID, name: "  김하늘 " }));
  assertEquals(res.status, 201);
  assertEquals(calls.insertStudent[0].name, "김하늘");
});

Deno.test("grade must be 중1-고3", async () => {
  await expectInvalid({ ...VALID, grade: "초6" }, MSG.grade);
});

Deno.test("joinedAt must be a real YYYY-MM-DD date", async () => {
  for (const joinedAt of ["2026-13-01", "2026-02-30", "20261105", undefined]) {
    await expectInvalid({ ...VALID, joinedAt }, MSG.joinedAt);
  }
});

Deno.test("success creates the auth user then the student row", async () => {
  const { handler, calls } = setup();
  const res = await handler(post(VALID));
  assertEquals(res.status, 201);
  assertEquals(res.headers.get("access-control-allow-origin"), ORIGIN);
  assertEquals(await res.json(), { id: STUDENT_ID });
  assertEquals(calls.createAuthUser, [
    ["haneul@student.heesu.internal", PASSWORD],
  ]);
  assertEquals(calls.insertStudent, [
    {
      userId: NEW_USER_ID,
      loginId: "haneul",
      name: "김하늘",
      grade: "중2",
      joinedAt: "2026-11-05",
    },
  ]);
  assertEquals(calls.deleteAuthUser.length, 0);
});

Deno.test("existing auth email is 409 login_taken", async () => {
  const { handler, calls } = setup({
    createAuthUser: () => Promise.resolve({ ok: false, reason: "exists" }),
  });
  const json = await expectError(
    await handler(post(VALID)),
    409,
    "login_taken",
  );
  assertEquals(
    json.message,
    "이미 쓰고 있는 아이디예요. 다른 아이디를 입력해 주세요.",
  );
  assertEquals(calls.insertStudent.length, 0);
});

Deno.test(
  "existing login_id row is 409 and the new auth user is removed",
  async () => {
    const { handler, calls } = setup({
      insertStudent: () => Promise.resolve({ ok: false, reason: "exists" }),
    });
    await expectError(await handler(post(VALID)), 409, "login_taken");
    assertEquals(calls.deleteAuthUser, [NEW_USER_ID]);
  },
);

Deno.test(
  "insert failure is 500 and the new auth user is removed",
  async () => {
    const origError = console.error;
    console.error = () => {};
    try {
      const { handler, calls } = setup({
        insertStudent: () => Promise.reject(new Error("db down")),
      });
      const json = await expectError(await handler(post(VALID)), 500, "server");
      assertEquals(
        json.message,
        "잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      );
      assertEquals(calls.deleteAuthUser, [NEW_USER_ID]);
    } finally {
      console.error = origError;
    }
  },
);

Deno.test("cleanup failure is still a plain 500", async () => {
  const origError = console.error;
  console.error = () => {};
  try {
    const { handler, calls } = setup({
      insertStudent: () => Promise.reject(new Error("db down")),
      deleteAuthUser: () => Promise.reject(new Error("auth down")),
    });
    const res = await handler(post(VALID));
    const text = await res.text();
    assertEquals(res.status, 500);
    assertEquals(JSON.parse(text), {
      error: "server",
      message: "잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
    });
    assertFalse(text.includes("down"));
    assertEquals(calls.deleteAuthUser, [NEW_USER_ID]);
  } finally {
    console.error = origError;
  }
});

Deno.test("logs never contain the password, name or JWT", async () => {
  const logged: unknown[][] = [];
  const origError = console.error;
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    const err = Object.assign(
      new Error(`failed for ${VALID.name} ${PASSWORD}`),
      { code: "XX000" },
    );
    const { handler } = setup({
      insertStudent: () => Promise.reject(err),
      deleteAuthUser: () => Promise.reject(err),
    });
    await handler(post(VALID));
  } finally {
    console.error = origError;
  }
  const text = JSON.stringify(logged);
  assertEquals(logged.length > 0, true);
  assertFalse(text.includes(PASSWORD));
  assertFalse(text.includes(VALID.name));
  assertFalse(text.includes("admin.jwt"));
});
