import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireRole } from "./RequireRole";

const replace = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ replace }));
const useAuthSession = vi.hoisted(() => vi.fn());
const useMyRole = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./session", () => ({ useAuthSession, useMyRole }));

const session = { user: { id: "u1" } };

beforeEach(() => {
  replace.mockReset();
  useAuthSession.mockReset();
  useMyRole.mockReset();
});

describe("RequireRole", () => {
  it("sends a student away from admin screens without rendering them", () => {
    useAuthSession.mockReturnValue({ status: "signedIn", session });
    useMyRole.mockReturnValue({ data: "student" });
    render(<RequireRole role="admin">관리 화면</RequireRole>);
    expect(replace).toHaveBeenCalledWith("/s");
    expect(screen.queryByText("관리 화면")).not.toBeInTheDocument();
  });

  it("sends signed-out visitors to /login", () => {
    useAuthSession.mockReturnValue({ status: "signedOut" });
    useMyRole.mockReturnValue({ data: undefined });
    render(<RequireRole role="student">학생 화면</RequireRole>);
    expect(useMyRole).toHaveBeenCalledWith(null);
    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("학생 화면")).not.toBeInTheDocument();
  });

  it("waits while the role is loading", () => {
    useAuthSession.mockReturnValue({ status: "signedIn", session });
    useMyRole.mockReturnValue({ data: undefined });
    const { container } = render(
      <RequireRole role="admin">관리 화면</RequireRole>,
    );
    expect(replace).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText("관리 화면")).not.toBeInTheDocument();
  });

  it("renders children when the role matches", () => {
    useAuthSession.mockReturnValue({ status: "signedIn", session });
    useMyRole.mockReturnValue({ data: "admin" });
    render(<RequireRole role="admin">관리 화면</RequireRole>);
    expect(useMyRole).toHaveBeenCalledWith(session);
    expect(screen.getByText("관리 화면")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
