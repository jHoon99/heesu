import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireRole } from "./RequireRole";

const replace = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ replace }));
const useAuthSession = vi.hoisted(() => vi.fn());
const useMyRole = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./session", () => ({
  useAuthSession,
  useMyRole,
  useSignOut: () => signOut,
}));

const session = { user: { id: "u1" } };

beforeEach(() => {
  replace.mockReset();
  useAuthSession.mockReset();
  useMyRole.mockReset();
  signOut.mockReset();
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

  it("waits instead of bouncing while a stale role is being refetched", () => {
    useAuthSession.mockReturnValue({ status: "signedIn", session });
    useMyRole.mockReturnValue({ data: null, isFetching: true });
    render(<RequireRole role="admin">관리 화면</RequireRole>);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("관리 화면")).not.toBeInTheDocument();
  });

  it("shows a retry/sign-out error when the role check fails", async () => {
    const refetch = vi.fn();
    useAuthSession.mockReturnValue({ status: "signedIn", session });
    useMyRole.mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
      refetch,
    });
    const user = userEvent.setup();
    render(<RequireRole role="admin">관리 화면</RequireRole>);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "권한을 확인하지 못했어요. 다시 시도하거나 로그아웃해 주세요.",
    );
    expect(screen.queryByText("관리 화면")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the offline message with retry when the role check fails on the network", async () => {
    const refetch = vi.fn();
    useAuthSession.mockReturnValue({ status: "signedIn", session });
    useMyRole.mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
      error: new TypeError("Failed to fetch"),
      refetch,
    });
    const user = userEvent.setup();
    render(<RequireRole role="admin">관리 화면</RequireRole>);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "인터넷에 연결되지 않았어요. 연결을 확인하고 다시 시도해 주세요.",
    );
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
