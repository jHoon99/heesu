// Shell-only service worker for the student app (scope /s).
// Never touches non-GET or cross-origin requests (all Supabase traffic).
const CACHE = "hs-shell-v1";
const PRECACHE = ["/s", "/manifest.webmanifest", "/icons/icon-192.png"];
const OFFLINE_HTML =
  '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>희수영어</title></head>" +
  '<body style="font-family:sans-serif;background:#f2eadc;padding:2rem;text-align:center">' +
  "<p>인터넷에 연결되지 않았어요. 연결되면 다시 열어 주세요.</p></body></html>";

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function isStudentPath(p) {
  return p === "/s" || p.startsWith("/s/");
}

async function networkFirst(request, fallback, canStore) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (canStore(res)) await cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await caches.match(request);
    return hit || fallback();
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    const cache = await caches.open(CACHE);
    await cache.put(request, res.clone());
  }
  return res;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith("hs-shell-") && n !== CACHE)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;

  if (request.mode === "navigate" && isStudentPath(p)) {
    event.respondWith(
      networkFirst(
        request,
        offlineResponse,
        (res) => res.ok && !res.redirected,
      ),
    );
    return;
  }
  // Content-hashed, so a cached copy is never stale.
  if (p.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Not hashed: always try the network so updates arrive.
  if (
    p.startsWith("/icons/") ||
    p.startsWith("/brand/") ||
    p === "/manifest.webmanifest"
  ) {
    event.respondWith(
      networkFirst(
        request,
        () => Response.error(),
        (res) => res.ok && res.type === "basic",
      ),
    );
  }
  // Everything else (/, /login, /admin*, /g*, ...) is not handled.
});
