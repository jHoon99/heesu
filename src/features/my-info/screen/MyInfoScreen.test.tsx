import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSignOut } from "@/core/auth";
import { useMyProfile } from "@/features/student-shell";
import { MyInfoScreen } from "./MyInfoScreen";

vi.mock("@/core/auth", () => ({ useSignOut: vi.fn() }));
vi.mock("@/features/student-shell", () => ({ useMyProfile: vi.fn() }));
vi.mock("@/features/auth", () => ({
  ChangePasswordCard: () => (
    <section aria-label="비밀번호 변경">
      <button type="submit">비밀번호 바꾸기</button>
    </section>
  ),
}));
vi.mock("@/features/points", () => ({
  PointHistoryList: ({ studentId }: { studentId: string }) => (
    <div>내역 {studentId}</div>
  ),
}));
vi.mock("../components/InstallGuideCard", () => ({
  InstallGuideCard: () => <div>설치 안내</div>,
}));

const signOut = vi.fn();

function profile(classes: { id: string; name: string }[]) {
  vi.mocked(useMyProfile).mockReturnValue({
    data: {
      id: "st1",
      name: "김하늘",
      grade: "중2",
      loginId: "haneul",
      classes,
    },
  } as never);
}

describe("MyInfoScreen", () => {
  beforeEach(() => {
    signOut.mockReset();
    vi.mocked(useSignOut).mockReturnValue(signOut);
    profile([{ id: "c1", name: "중등 기초반" }]);
  });

  it("shows name, grade, login id and classes", () => {
    render(<MyInfoScreen />);
    expect(
      screen.getByRole("heading", { name: "내 정보" }),
    ).toBeInTheDocument();
    expect(screen.getByText("김하늘")).toBeInTheDocument();
    expect(screen.getByText("중2 · 아이디 haneul")).toBeInTheDocument();
    expect(screen.getByText("중등 기초반")).toBeInTheDocument();
  });

  it("says so when there is no class", () => {
    profile([]);
    render(<MyInfoScreen />);
    expect(screen.getByText("아직 배정된 반이 없어요.")).toBeInTheDocument();
  });

  it("renders the points history for the student inside the points card", () => {
    render(<MyInfoScreen />);
    const title = screen.getByText("포인트 내역");
    const card = title.parentElement!.parentElement!.parentElement!;
    expect(card).toContainElement(screen.getByText("내역 st1"));
  });

  it("signs out on click", async () => {
    render(<MyInfoScreen />);
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the password button as the only primary action", () => {
    render(<MyInfoScreen />);
    expect(
      screen.getAllByRole("button", { name: "비밀번호 바꾸기" }),
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: "로그아웃" })).not.toBe(
      screen.getByRole("button", { name: "비밀번호 바꾸기" }),
    );
  });
});
