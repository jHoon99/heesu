import { describe, expect, it, vi } from "vitest";
import {
  canPromptInstall,
  listenForInstallPrompt,
  promptInstall,
  subscribeInstallPrompt,
} from "./installPrompt";

describe("install prompt", () => {
  it("keeps the browser's install event and shows it once on demand", async () => {
    listenForInstallPrompt();
    expect(canPromptInstall()).toBe(false);
    expect(await promptInstall()).toBe("unavailable");

    const changed = vi.fn();
    const off = subscribeInstallPrompt(changed);
    const prompt = vi.fn(() => Promise.resolve());
    const event = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt,
        userChoice: Promise.resolve({ outcome: "accepted" as const }),
      },
    );
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(canPromptInstall()).toBe(true);
    expect(changed).toHaveBeenCalled();

    expect(await promptInstall()).toBe("accepted");
    expect(prompt).toHaveBeenCalledOnce();
    expect(canPromptInstall()).toBe(false);
    off();
  });
});
