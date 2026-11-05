import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listenForInstallPrompt } from "@/core/pwa";
import { InstallAppButton } from "./InstallAppButton";
import { InstallBanner } from "./InstallBanner";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const KAKAO =
  "Mozilla/5.0 (Linux; Android 14; SM-S921N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0 Mobile Safari/537.36 KAKAOTALK 10.8.0";
const GALAXY =
  "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36";

function setup(ua: string, standalone = false) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: standalone, addEventListener: vi.fn() }),
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("InstallAppButton", () => {
  it("shows the iPhone share-sheet steps and the sign-in-again note", async () => {
    setup(IPHONE);
    const user = userEvent.setup();
    render(<InstallAppButton />);
    await user.click(screen.getByRole("button", { name: "앱으로 설치하기" }));
    const dialog = await screen.findByRole("dialog", {
      name: "홈 화면에 앱 추가하기",
    });
    expect(within(dialog).getByText(/공유 버튼/)).toBeInTheDocument();
    expect(within(dialog).getByText(/홈 화면에 추가/)).toBeInTheDocument();
    expect(within(dialog).getByText(/한 번 더 로그인/)).toBeInTheDocument();
  });

  it("sends KakaoTalk users to their own browser", async () => {
    setup(KAKAO);
    const user = userEvent.setup();
    render(<InstallAppButton />);
    await user.click(screen.getByRole("button", { name: "앱으로 설치하기" }));
    const link = await screen.findByRole("link", { name: "브라우저로 열기" });
    expect(link.getAttribute("href")).toMatch(
      /^kakaotalk:\/\/web\/openExternal\?url=http/,
    );
  });

  it("opens Android's own install window when the browser offers one", async () => {
    setup(GALAXY);
    listenForInstallPrompt();
    const prompt = vi.fn(() => Promise.resolve());
    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt,
        userChoice: Promise.resolve({ outcome: "accepted" as const }),
      }),
    );
    const user = userEvent.setup();
    render(<InstallAppButton />);
    await user.click(screen.getByRole("button", { name: "앱으로 설치하기" }));
    expect(prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows nothing inside the home-screen app", () => {
    setup(IPHONE, true);
    render(<InstallAppButton />);
    expect(
      screen.queryByRole("button", { name: "앱으로 설치하기" }),
    ).toBeNull();
  });
});

describe("InstallBanner", () => {
  it("can be closed and stays closed for a week", async () => {
    setup(IPHONE);
    const user = userEvent.setup();
    const { unmount } = render(<InstallBanner />);
    await user.click(screen.getByRole("button", { name: "설치 안내 닫기" }));
    expect(screen.queryByRole("region", { name: "앱 설치 안내" })).toBeNull();
    unmount();
    render(<InstallBanner />);
    expect(screen.queryByRole("region", { name: "앱 설치 안내" })).toBeNull();
    expect(
      Number(localStorage.getItem("hs-install-banner-hidden-until")),
    ).toBeGreaterThan(Date.now() + 6 * 86_400_000);
  });

  it("shows on a phone browser", () => {
    setup(IPHONE);
    render(<InstallBanner />);
    expect(
      screen.getByRole("region", { name: "앱 설치 안내" }),
    ).toBeInTheDocument();
  });
});
