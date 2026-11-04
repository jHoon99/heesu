import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallGuideCard } from "./InstallGuideCard";

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn() }),
  );
}

describe("InstallGuideCard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the guide in a browser tab", () => {
    mockMatchMedia(false);
    render(<InstallGuideCard />);
    expect(screen.getByText("홈 화면에 추가하기")).toBeInTheDocument();
    expect(
      screen.getByText(/아이폰: Safari 아래쪽 공유 버튼/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/안드로이드: Chrome 오른쪽 위 메뉴/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "카카오톡에서 열었다면 먼저 Safari나 Chrome으로 열어 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("tells iPhone users to sign in again inside the home-screen app", () => {
    mockMatchMedia(false);
    render(<InstallGuideCard />);
    expect(
      screen.getByText("추가한 뒤에는 홈 화면 앱에서 다시 로그인해요.", {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it("hides the guide when running standalone", () => {
    mockMatchMedia(true);
    render(<InstallGuideCard />);
    expect(screen.queryByText("홈 화면에 추가하기")).not.toBeInTheDocument();
  });
});
