import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";

const signOut = vi.hoisted(() => vi.fn());
const count = vi.hoisted(() => ({ data: 0 as number | undefined }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/students/detail",
}));
vi.mock("@/core/auth", () => ({
  useAuthSession: () => ({
    status: "signedIn",
    session: { user: { email: "owner@heesu.test" } },
  }),
  useSignOut: () => signOut,
}));
vi.mock("@/features/consultations", () => ({
  useNewConsultationCount: () => ({ data: count.data }),
}));

describe("AdminShell", () => {
  beforeEach(() => {
    signOut.mockReset();
    count.data = 0;
  });

  it("marks the current menu and links to its href", () => {
    render(<AdminShell>내용</AdminShell>);
    const link = screen.getByRole("link", { name: "학생" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveAttribute("href", "/admin/students");
    expect(screen.getByText("owner")).toBeInTheDocument();
  });

  it("shows the new consultation count in the link name", () => {
    count.data = 2;
    render(<AdminShell>내용</AdminShell>);
    expect(screen.getByRole("link", { name: "상담 2건" })).toBeInTheDocument();
  });

  it("shows no badge when there are none", () => {
    render(<AdminShell>내용</AdminShell>);
    expect(screen.getByRole("link", { name: "상담" })).toBeInTheDocument();
  });

  it("signs out and renders children inside main", async () => {
    render(<AdminShell>내용</AdminShell>);
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("main")).toHaveTextContent("내용");
  });
});
