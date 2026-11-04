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

  it("hides the guide when running standalone", () => {
    mockMatchMedia(true);
    render(<InstallGuideCard />);
    expect(screen.queryByText("홈 화면에 추가하기")).not.toBeInTheDocument();
  });
});
