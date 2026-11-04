import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";

const signOut = vi.hoisted(() => vi.fn());
const count = vi.hoisted(() => ({ data: 0 as number | undefined }));
const qs = vi.hoisted(() => ({ unanswered: 0, feed: vi.fn() }));

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

vi.mock("@/features/questions", () => ({
  useUnansweredQuestionCount: () => ({ data: qs.unanswered }),
  useAdminQuestionFeed: qs.feed,
}));

describe("AdminShell", () => {
  beforeEach(() => {
    signOut.mockReset();
    count.data = 0;
    qs.unanswered = 0;
    qs.feed.mockReset();
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

  it("shows the unanswered question count only when 1 or more", () => {
    qs.unanswered = 2;
    const { unmount } = render(<AdminShell>내용</AdminShell>);
    expect(screen.getByRole("link", { name: "질문 2건" })).toBeInTheDocument();
    unmount();
    qs.unanswered = 0;
    render(<AdminShell>내용</AdminShell>);
    expect(screen.getByRole("link", { name: "질문" })).toBeInTheDocument();
  });

  it("starts the question feed once", () => {
    render(<AdminShell>내용</AdminShell>);
    expect(qs.feed).toHaveBeenCalledTimes(1);
  });

  it("signs out and renders children inside main", async () => {
    render(<AdminShell>내용</AdminShell>);
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("main")).toHaveTextContent("내용");
  });
});
