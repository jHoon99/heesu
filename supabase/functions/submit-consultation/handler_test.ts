import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import { createHandler, type Deps, type SubmitInput } from "./handler.ts";

const ORIGIN = "https://heesu.pages.dev";
const URL_ = "http://localhost/functions/v1/submit-consultation";

const VALID = {
  parentName: "홍길동",
  phone: "010-1234-5678",
  grade: "중2",
  message: null,
  guardianConfirmed: true,
  privacyAgreed: true,
  consentVersion: "2026-11-05",
  turnstileToken: "tok",
};

type Calls = {
  verify: Array<[string, string | null]>;
  submit: SubmitInput[];
};

function setup(
  overrides: Partial<{
    verify: boolean;
    submit: () => Promise<"ok" | "rate_limited">;
  }> = {},
) {
  const calls: Calls = { verify: [], submit: [] };
  const deps: Deps = {
    verifyTurnstile(token, remoteIp) {
      calls.verify.push([token, remoteIp]);
      return Promise.resolve(overrides.verify ?? true);
    },
    submit(input) {
      calls.submit.push(input);
      return overrides.submit ? overrides.submit() : Promise.resolve("ok");
    },
  };
  return { handler: createHandler(deps), calls };
}

function post(
  body: unknown,
  headers: Record<string, string> = {},
  raw?: string,
): Request {
  return new Request(URL_, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body: raw ?? JSON.stringify(body),
  });
}

async function expectError(res: Response, status: number, error: string) {
  assertEquals(res.status, status);
  const json = await res.json();
  assertEquals(json.error, error);
  return json as { error: string; message?: string };
}

Deno.test(
  "OPTIONS from an allowed origin returns the CORS preflight",
  async () => {
    const { handler, calls } = setup();
    const res = await handler(
      new Request(URL_, { method: "OPTIONS", headers: { origin: ORIGIN } }),
    );
    assertEquals(res.status, 204);
    assertEquals(res.headers.get("access-control-allow-origin"), ORIGIN);
    assertStringIncludes(res.headers.get("vary") ?? "", "Origin");
    assertEquals(
      res.headers.get("access-control-allow-headers"),
      "authorization, x-client-info, apikey, content-type",
    );
    assertStringIncludes(
      res.headers.get("access-control-allow-methods") ?? "",
      "POST",
    );
    assertEquals(calls.verify.length + calls.submit.length, 0);
  },
);

for (const origin of [
  "http://localhost:3000",
  "https://dev.heesu.pages.dev",
  "https://heesu.pages.dev",
]) {
  Deno.test(`allowed origin ${origin} gets ACAO and JSON`, async () => {
    const { handler } = setup();
    const res = await handler(post(VALID, { origin }));
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("access-control-allow-origin"), origin);
    assertEquals(res.headers.get("content-type"), "application/json");
  });
}

for (const [label, headers] of [
  ["evil origin", { origin: "https://evil.pages.dev" }],
  ["lookalike suffix", { origin: "https://heesu.pages.dev.evil.com" }],
  ["preview subdomain", { origin: "https://abc123.heesu.pages.dev" }],
  ["trailing slash", { origin: "https://heesu.pages.dev/" }],
  ["null origin", { origin: "null" }],
] as const) {
  Deno.test(
    `POST with ${label} is 403 without ACAO and no deps called`,
    async () => {
      const { handler, calls } = setup();
      const res = await handler(post(VALID, headers));
      await expectError(res, 403, "forbidden_origin");
      assertEquals(res.headers.get("access-control-allow-origin"), null);
      assertEquals(calls.verify.length + calls.submit.length, 0);
    },
  );
}

Deno.test(
  "POST without Origin is 403 without ACAO and no deps called",
  async () => {
    const { handler, calls } = setup();
    const res = await handler(
      new Request(URL_, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(VALID),
      }),
    );
    await expectError(res, 403, "forbidden_origin");
    assertEquals(res.headers.get("access-control-allow-origin"), null);
    assertEquals(calls.verify.length + calls.submit.length, 0);
  },
);

Deno.test("OPTIONS from a disallowed origin is 403", async () => {
  const { handler } = setup();
  const res = await handler(
    new Request(URL_, {
      method: "OPTIONS",
      headers: { origin: "https://evil.pages.dev" },
    }),
  );
  await expectError(res, 403, "forbidden_origin");
  assertEquals(res.headers.get("access-control-allow-origin"), null);
});

Deno.test("GET from an allowed origin is 405", async () => {
  const { handler, calls } = setup();
  const res = await handler(
    new Request(URL_, { method: "GET", headers: { origin: ORIGIN } }),
  );
  await expectError(res, 405, "method");
  assertEquals(res.headers.get("access-control-allow-origin"), ORIGIN);
  assertEquals(calls.verify.length + calls.submit.length, 0);
});

const INVALID_CASES: Array<[string, Request]> = [
  ["malformed JSON", post(null, {}, "{not json")],
  ["JSON array", post([VALID])],
  ["JSON null", post(null)],
  ["phone 011 prefix", post({ ...VALID, phone: "011-1234-5678" })],
  ["phone too short", post({ ...VALID, phone: "010-1234-567" })],
  ["phone with letters", post({ ...VALID, phone: "010-1234-567a" })],
  ["phone +82", post({ ...VALID, phone: "+82-10-1234-5678" })],
  ["phone not a string", post({ ...VALID, phone: 1012345678 })],
  ["grade 초6", post({ ...VALID, grade: "초6" })],
  ["message 1001 chars", post({ ...VALID, message: "가".repeat(1001) })],
  ["message not string/null", post({ ...VALID, message: 42 })],
  ["guardianConfirmed false", post({ ...VALID, guardianConfirmed: false })],
  [
    "guardianConfirmed truthy string",
    post({ ...VALID, guardianConfirmed: "true" }),
  ],
  ["privacyAgreed missing", post({ ...VALID, privacyAgreed: undefined })],
  [
    "consentVersion 2020-01-01",
    post({ ...VALID, consentVersion: "2020-01-01" }),
  ],
  ["turnstileToken empty", post({ ...VALID, turnstileToken: "" })],
  [
    "turnstileToken too long",
    post({ ...VALID, turnstileToken: "t".repeat(2049) }),
  ],
  ["parentName blank", post({ ...VALID, parentName: "   " })],
  ["parentName 41 chars", post({ ...VALID, parentName: "가".repeat(41) })],
  ["parentName missing", post({ ...VALID, parentName: undefined })],
  ["body too large", post({ ...VALID, pad: "x".repeat(20_000) })],
];

for (const [label, req] of INVALID_CASES) {
  Deno.test(
    `${label} is 400 invalid with a Korean fix message, no deps called`,
    async () => {
      const { handler, calls } = setup();
      const res = await handler(req);
      const json = await expectError(res, 400, "invalid");
      assertEquals(typeof json.message, "string");
      assertStringIncludes(json.message ?? "", "요");
      assertEquals(res.headers.get("access-control-allow-origin"), ORIGIN);
      assertEquals(calls.verify.length + calls.submit.length, 0);
    },
  );
}

Deno.test("phone message tells the user the expected format", async () => {
  const { handler } = setup();
  const res = await handler(post({ ...VALID, phone: "011-1234-5678" }));
  const json = await expectError(res, 400, "invalid");
  assertStringIncludes(json.message ?? "", "010-1234-5678");
});

for (const phone of [
  "01012345678",
  "010 1234 5678",
  " 010-1234-5678 ",
  "010-12345678",
]) {
  Deno.test(`phone "${phone}" is normalized to 010-1234-5678`, async () => {
    const { handler, calls } = setup();
    const res = await handler(post({ ...VALID, phone }));
    assertEquals(res.status, 200);
    assertEquals(calls.submit[0]?.phone, "010-1234-5678");
  });
}

Deno.test("parentName is trimmed and a 40-char name passes", async () => {
  const { handler, calls } = setup();
  const name = "가".repeat(40);
  const res = await handler(post({ ...VALID, parentName: `  ${name} ` }));
  assertEquals(res.status, 200);
  assertEquals(calls.submit[0]?.parentName, name);
});

Deno.test("a 1000-char message passes", async () => {
  const { handler, calls } = setup();
  const message = "가".repeat(1000);
  const res = await handler(post({ ...VALID, message }));
  assertEquals(res.status, 200);
  assertEquals(calls.submit[0]?.message, message);
});

Deno.test(
  "failed Turnstile is 400 captcha and submit is not called",
  async () => {
    const { handler, calls } = setup({ verify: false });
    const res = await handler(post(VALID));
    await expectError(res, 400, "captcha");
    assertEquals(calls.verify.length, 1);
    assertEquals(calls.submit.length, 0);
  },
);

Deno.test("rate limited submit is 429", async () => {
  const { handler } = setup({ submit: () => Promise.resolve("rate_limited") });
  const res = await handler(post(VALID));
  const json = await expectError(res, 429, "rate_limited");
  assertStringIncludes(json.message ?? "", "요");
});

Deno.test("submit throwing is 500 server with no error details", async () => {
  const secret =
    'new row violates check constraint "consultations_phone_check"';
  const { handler } = setup({
    submit: () => Promise.reject(new Error(secret)),
  });
  const origError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    const res = await handler(post(VALID));
    assertEquals(res.status, 500);
    const text = await res.text();
    assertEquals(JSON.parse(text).error, "server");
    assertFalse(text.includes("constraint"));
    assertFalse(text.includes("consultations"));
    assertEquals(res.headers.get("access-control-allow-origin"), ORIGIN);
  } finally {
    console.error = origError;
  }
  assertEquals(logged.length, 1);
  // Server log carries no PII from the request.
  const line = JSON.stringify(logged[0]);
  assertFalse(line.includes("홍길동"));
  assertFalse(line.includes("1234-5678"));
});

Deno.test("Turnstile throwing is 500 server", async () => {
  const deps: Deps = {
    verifyTurnstile: () => Promise.reject(new Error("network")),
    submit: () => Promise.resolve("ok"),
  };
  const origError = console.error;
  console.error = () => {};
  try {
    const res = await createHandler(deps)(post(VALID));
    await expectError(res, 500, "server");
  } finally {
    console.error = origError;
  }
});

Deno.test(
  "valid request is 200 ok and calls deps once with normalized input",
  async () => {
    const { handler, calls } = setup();
    const res = await handler(
      post(VALID, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
    );
    assertEquals(res.status, 200);
    assertEquals(await res.json(), { ok: true });
    assertEquals(res.headers.get("access-control-allow-origin"), ORIGIN);
    assertEquals(res.headers.get("content-type"), "application/json");
    assertEquals(calls.verify, [["tok", "203.0.113.7"]]);
    assertEquals(calls.submit, [
      {
        parentName: "홍길동",
        phone: "010-1234-5678",
        grade: "중2",
        message: null,
        consentVersion: "2026-11-05",
      },
    ]);
  },
);

Deno.test("missing x-forwarded-for passes null as remote IP", async () => {
  const { handler, calls } = setup();
  await handler(post(VALID));
  assertEquals(calls.verify, [["tok", null]]);
});
