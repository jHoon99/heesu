import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "@/core/pwa";
import { StudentShell } from "./StudentShell";

vi.mock("next/navigation", () => ({ usePathname: () => "/s/homework" }));
vi.mock("@/core/pwa", () => ({ registerServiceWorker: vi.fn() }));

describe("StudentShell", () => {
  beforeEach(() => {
    vi.mocked(registerServiceWorker).mockReset();
  });

  it("marks the current tab, shows children and registers the worker once", () => {
    render(
      <StudentShell>
        <p>본문</p>
      </StudentShell>,
    );
    expect(screen.getByText("본문")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "나의 수업" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "기록" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(registerServiceWorker).toHaveBeenCalledTimes(1);
  });
});
