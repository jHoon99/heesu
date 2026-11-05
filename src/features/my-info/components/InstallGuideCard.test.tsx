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

  it("offers the install button in a browser tab", () => {
    mockMatchMedia(false);
    render(<InstallGuideCard />);
    expect(screen.getByText("홈 화면에 추가하기")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "앱으로 설치하기" }),
    ).toBeInTheDocument();
  });

  it("hides when running as the home-screen app", () => {
    mockMatchMedia(true);
    render(<InstallGuideCard />);
    expect(screen.queryByText("홈 화면에 추가하기")).not.toBeInTheDocument();
  });
});
