import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://heesu.pages.dev";
const SRC = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

type Handler = (event: unknown) => void;

function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (r: string | { url: string }) =>
    typeof r === "string" ? new URL(r, ORIGIN).href : r.url;
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const s = stores.get(name)!;
    return {
      put: async (req: { url: string }, res: Response) => {
        s.set(keyOf(req), res);
      },
      match: async (req: string | { url: string }) => {
        const hit = s.get(keyOf(req));
        return hit ? hit.clone() : undefined;
      },
      keys: async () => [...s.keys()].map((url) => ({ url })),
      delete: async (req: string | { url: string }) => s.delete(keyOf(req)),
      addAll: async (urls: string[]) => {
        for (const u of urls) s.set(keyOf(u), new Response("shell"));
      },
    };
  };
  return {
    stores,
    open,
    match: async (req: { url: string }) => {
      for (const s of stores.values()) {
        const hit = s.get(keyOf(req));
        if (hit) return hit.clone();
      }
      return undefined;
    },
    keys: async () => [...stores.keys()],
    delete: async (n: string) => stores.delete(n),
  };
}

function load() {
  const handlers = {} as Record<"fetch" | "install" | "activate", Handler>;
  const caches = fakeCaches();
  const fetchMock = vi.fn();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (t: keyof typeof handlers, fn: Handler) => {
      handlers[t] = fn;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  vm.runInNewContext(SRC, {
    self,
    caches,
    fetch: fetchMock,
    Response,
    URL,
    Promise,
  });
  return { handlers, caches, fetchMock, self };
}

function fetchEvent(
  url: string,
  method = "GET",
  mode = "navigate",
  headers: Record<string, string> = {},
) {
  let pending: Promise<Response> | undefined;
  const event = {
    request: {
      url,
      method,
      mode,
      headers: { has: (k: string) => k.toLowerCase() in headers },
    },
    respondWith: vi.fn((p: Promise<Response>) => {
      pending = Promise.resolve(p);
    }),
    waitUntil: vi.fn(),
  };
  return { event, response: () => pending! };
}

let sw: ReturnType<typeof load>;
beforeEach(() => {
  sw = load();
});

describe("public/sw.js passes through", () => {
  it.each([
    ["GET", "https://pudxtxzcftehxicfthmf.supabase.co/rest/v1/points", "cors"],
    ["GET", "http://127.0.0.1:56321/auth/v1/user", "cors"],
    ["POST", `${ORIGIN}/s`, "navigate"],
    ["GET", `${ORIGIN}/`, "navigate"],
    ["GET", `${ORIGIN}/login`, "navigate"],
    ["GET", `${ORIGIN}/admin`, "navigate"],
    ["GET", `${ORIGIN}/admin/students`, "navigate"],
    ["GET", `${ORIGIN}/g`, "navigate"],
    ["GET", `${ORIGIN}/sitemap.xml`, "navigate"],
    ["GET", `${ORIGIN}/sw.js`, "same-origin"],
    ["GET", `${ORIGIN}/favicon.ico`, "no-cors"],
    ["GET", `${ORIGIN}/s/homework?_rsc=abc`, "cors"],
  ])("%s %s (%s) is not handled", (method, url, mode) => {
    const { event } = fetchEvent(url, method, mode);
    sw.handlers.fetch(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });
});

describe("public/sw.js student pages (network first)", () => {
  const url = `${ORIGIN}/s/homework`;

  it("returns and caches an ok network response", async () => {
    sw.fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
    const { event, response } = fetchEvent(url);
    sw.handlers.fetch(event);
    expect(await (await response()).text()).toBe("ok");
    expect(sw.caches.stores.get("hs-shell-v1")?.has(url)).toBe(true);
  });

  it("serves the cached page when the network fails", async () => {
    sw.fetchMock.mockResolvedValueOnce(new Response("cached", { status: 200 }));
    const first = fetchEvent(url);
    sw.handlers.fetch(first.event);
    await first.response();
    sw.fetchMock.mockRejectedValue(new Error("offline"));
    const { event, response } = fetchEvent(url);
    sw.handlers.fetch(event);
    expect(await (await response()).text()).toBe("cached");
  });

  it("serves the offline page when network fails and nothing is cached", async () => {
    sw.fetchMock.mockRejectedValue(new Error("offline"));
    const { event, response } = fetchEvent(`${ORIGIN}/s`);
    sw.handlers.fetch(event);
    const res = await response();
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("인터넷에 연결되지 않았어요");
  });

  it("does not cache a redirected response", async () => {
    const redirected = new Response("login", { status: 200 });
    Object.defineProperty(redirected, "redirected", { value: true });
    sw.fetchMock.mockResolvedValue(redirected);
    const { event, response } = fetchEvent(url);
    sw.handlers.fetch(event);
    expect(await (await response()).text()).toBe("login");
    expect(sw.caches.stores.get("hs-shell-v1")?.has(url) ?? false).toBe(false);
  });
});

describe("public/sw.js never intercepts storage or Range", () => {
  it("does not handle a cross-origin Storage signed URL", () => {
    const { event } = fetchEvent(
      "https://pudxtxzcftehxicfthmf.supabase.co/storage/v1/object/sign/videos/a.mp4",
      "GET",
      "no-cors",
    );
    sw.handlers.fetch(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("does not handle a same-origin Range request", () => {
    const { event } = fetchEvent(
      `${ORIGIN}/_next/static/chunks/a.js`,
      "GET",
      "no-cors",
      { range: "bytes=0-" },
    );
    sw.handlers.fetch(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });
});

describe("public/sw.js navigation cache key", () => {
  it("keeps one entry for different ?id= and serves it offline", async () => {
    sw.fetchMock.mockResolvedValueOnce(new Response("shellA", { status: 200 }));
    const a = fetchEvent(`${ORIGIN}/s/videos/watch?id=A`);
    sw.handlers.fetch(a.event);
    await a.response();
    sw.fetchMock.mockResolvedValueOnce(new Response("shellB", { status: 200 }));
    const b = fetchEvent(`${ORIGIN}/s/videos/watch?id=B`);
    sw.handlers.fetch(b.event);
    await b.response();
    const shell = sw.caches.stores.get("hs-shell-v1")!;
    expect(
      [...shell.keys()].filter((k) => k.includes("/s/videos/watch")),
    ).toEqual([`${ORIGIN}/s/videos/watch`]);
    sw.fetchMock.mockRejectedValue(new Error("offline"));
    const c = fetchEvent(`${ORIGIN}/s/videos/watch?id=C`);
    sw.handlers.fetch(c.event);
    expect(await (await c.response()).text()).toBe("shellB");
  });
});

describe("public/sw.js static assets", () => {
  function basic(body: string) {
    const r = new Response(body, { status: 200 });
    Object.defineProperty(r, "type", { value: "basic" });
    return r;
  }

  it("serves /_next/static cache first", async () => {
    const url = `${ORIGIN}/_next/static/chunks/a.js`;
    sw.fetchMock.mockResolvedValue(basic("chunk"));
    const a = fetchEvent(url, "GET", "no-cors");
    sw.handlers.fetch(a.event);
    expect(await (await a.response()).text()).toBe("chunk");
    const b = fetchEvent(url, "GET", "no-cors");
    sw.handlers.fetch(b.event);
    expect(await (await b.response()).text()).toBe("chunk");
    expect(sw.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps hs-static-v1 at 120 entries, dropping the oldest", async () => {
    sw.fetchMock.mockImplementation(async () => basic("x"));
    for (let i = 0; i < 121; i++) {
      const e = fetchEvent(`${ORIGIN}/_next/static/x${i}.js`, "GET", "no-cors");
      sw.handlers.fetch(e.event);
      await e.response();
    }
    const st = sw.caches.stores.get("hs-static-v1")!;
    expect(st.size).toBe(120);
    expect(st.has(`${ORIGIN}/_next/static/x0.js`)).toBe(false);
    expect(st.has(`${ORIGIN}/_next/static/x120.js`)).toBe(true);
    expect(sw.caches.stores.get("hs-shell-v1")?.size ?? 0).toBe(0);
  });

  it.each([
    "/icons/icon-192.png",
    "/brand/hs_beige.svg",
    "/manifest.webmanifest",
  ])("%s is network first so updates arrive", async (path) => {
    const url = `${ORIGIN}${path}`;
    sw.fetchMock.mockResolvedValueOnce(basic("v1"));
    const a = fetchEvent(url, "GET", "no-cors");
    sw.handlers.fetch(a.event);
    await a.response();
    sw.fetchMock.mockResolvedValueOnce(basic("v2"));
    const b = fetchEvent(url, "GET", "no-cors");
    sw.handlers.fetch(b.event);
    expect(await (await b.response()).text()).toBe("v2");
    sw.fetchMock.mockRejectedValue(new Error("offline"));
    const c = fetchEvent(url, "GET", "no-cors");
    sw.handlers.fetch(c.event);
    expect(await (await c.response()).text()).toBe("v2");
  });
});

describe("public/sw.js lifecycle", () => {
  it("install precaches the shell and skips waiting", async () => {
    const waits: Promise<unknown>[] = [];
    sw.handlers.install({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
    expect(sw.caches.stores.get("hs-shell-v1")?.size).toBe(3);
    expect(sw.self.skipWaiting).toHaveBeenCalled();
  });

  it("activate deletes only old hs-shell/hs-static caches and claims clients", async () => {
    await sw.caches.open("hs-shell-v0");
    await sw.caches.open("hs-static-v0");
    await sw.caches.open("other");
    await sw.caches.open("hs-shell-v1");
    await sw.caches.open("hs-static-v1");
    const waits: Promise<unknown>[] = [];
    sw.handlers.activate({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
    expect([...sw.caches.stores.keys()].sort()).toEqual([
      "hs-shell-v1",
      "hs-static-v1",
      "other",
    ]);
    expect(sw.self.clients.claim).toHaveBeenCalled();
  });
});
