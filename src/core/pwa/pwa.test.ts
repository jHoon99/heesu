import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStandalone, registerServiceWorker } from "./index";

function setSW(value: unknown) {
  Object.defineProperty(navigator, "serviceWorker", {
    value,
    configurable: true,
  });
}

describe("registerServiceWorker", () => {
  afterEach(() => {
    // @ts-expect-error cleanup of the test stub
    delete navigator.serviceWorker;
  });

  it("registers /sw.js with scope /s", async () => {
    const register = vi.fn().mockResolvedValue({});
    setSW({ register });
    await registerServiceWorker({ enabled: true });
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/s" });
  });

  it("swallows a registration failure", async () => {
    setSW({ register: vi.fn().mockRejectedValue(new Error("nope")) });
    await expect(
      registerServiceWorker({ enabled: true }),
    ).resolves.toBeUndefined();
  });

  it("does nothing when disabled", async () => {
    const register = vi.fn();
    setSW({ register });
    await registerServiceWorker({ enabled: false });
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing outside production by default", async () => {
    const register = vi.fn();
    setSW({ register });
    await registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing without serviceWorker support", async () => {
    await expect(
      registerServiceWorker({ enabled: true }),
    ).resolves.toBeUndefined();
  });
});

describe("isStandalone", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "standalone", {
      value: undefined,
      configurable: true,
    });
  });
  const media = (matches: boolean) =>
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches }));
  afterEach(() => vi.unstubAllGlobals());

  it("is true for display-mode standalone", () => {
    media(true);
    expect(isStandalone()).toBe(true);
  });

  it("is true for iOS navigator.standalone", () => {
    media(false);
    Object.defineProperty(navigator, "standalone", {
      value: true,
      configurable: true,
    });
    expect(isStandalone()).toBe(true);
  });

  it("is false in a normal tab", () => {
    media(false);
    expect(isStandalone()).toBe(false);
  });
});
