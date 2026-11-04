import { assertEquals, assertRejects } from "@std/assert";
import { SITEVERIFY_TIMEOUT_MS, verifyTurnstile } from "./turnstile.ts";

function fakeFetch(response: unknown) {
  const seen: Request[] = [];
  const fetchFn: typeof fetch = (input, init) => {
    seen.push(new Request(input, init));
    return Promise.resolve(Response.json(response));
  };
  return { fetchFn, seen };
}

Deno.test(
  "posts secret, response and remoteip as a form to siteverify",
  async () => {
    const { fetchFn, seen } = fakeFetch({ success: true });
    assertEquals(
      await verifyTurnstile("sek", "tok", "203.0.113.7", fetchFn),
      true,
    );
    assertEquals(seen.length, 1);
    const req = seen[0]!;
    assertEquals(req.method, "POST");
    assertEquals(
      req.url,
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    const form = new URLSearchParams(await req.text());
    assertEquals(form.get("secret"), "sek");
    assertEquals(form.get("response"), "tok");
    assertEquals(form.get("remoteip"), "203.0.113.7");
  },
);

Deno.test("omits remoteip when unknown", async () => {
  const { fetchFn, seen } = fakeFetch({ success: true });
  await verifyTurnstile("sek", "tok", null, fetchFn);
  const form = new URLSearchParams(await seen[0]!.text());
  assertEquals(form.has("remoteip"), false);
});

Deno.test("success false is false", async () => {
  const { fetchFn } = fakeFetch({
    success: false,
    "error-codes": ["invalid-input-response"],
  });
  assertEquals(await verifyTurnstile("sek", "tok", null, fetchFn), false);
});

Deno.test("a non-boolean success is false", async () => {
  const { fetchFn } = fakeFetch({ success: "true" });
  assertEquals(await verifyTurnstile("sek", "tok", null, fetchFn), false);
});

Deno.test("fetch throwing propagates", async () => {
  const fetchFn: typeof fetch = () =>
    Promise.reject(new TypeError("network down"));
  await assertRejects(
    () => verifyTurnstile("sek", "tok", null, fetchFn),
    TypeError,
  );
});

Deno.test("passes an abort signal to fetch", async () => {
  let signal: AbortSignal | null | undefined;
  const fetchFn: typeof fetch = (_input, init) => {
    signal = init?.signal;
    return Promise.resolve(Response.json({ success: true }));
  };
  await verifyTurnstile("sek", "tok", null, fetchFn);
  assertEquals(signal instanceof AbortSignal, true);
});

Deno.test("non-2xx throws", async () => {
  const fetchFn: typeof fetch = () =>
    Promise.resolve(new Response("x", { status: 502 }));
  await assertRejects(() => verifyTurnstile("sek", "tok", null, fetchFn));
});

Deno.test("non-JSON body throws", async () => {
  const fetchFn: typeof fetch = () =>
    Promise.resolve(new Response("<html>", { status: 200 }));
  await assertRejects(() => verifyTurnstile("sek", "tok", null, fetchFn));
});

Deno.test("timeout is 5 seconds", () => {
  assertEquals(SITEVERIFY_TIMEOUT_MS, 5000);
});
