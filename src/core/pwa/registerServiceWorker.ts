import { SW_SCOPE, SW_URL } from "./constants";

// Production only, so a dev server never serves stale cached files.
export async function registerServiceWorker(
  opts: { enabled?: boolean } = {},
): Promise<void> {
  const enabled = opts.enabled ?? process.env.NODE_ENV === "production";
  if (!enabled || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  } catch {
    // The screens work without a service worker.
  }
}
