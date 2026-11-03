import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassSummary } from "@/features/classes";
import { TodayScreen } from "./TodayScreen";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const show = vi.fn();
vi.mock("@/design-system", async (orig) => ({
  ...(await orig<typeof import("@/design-system")>()),
  useToast: () => ({ show, dismiss: vi.fn() }),
}));

const mk = (
  id: string,
  name: string,
  days: number[],
  extra: Partial<ClassSummary> = {},
): ClassSummary => ({
  id,
  name,
  level: "middle",
  schedule: days.map((day) => ({ day, start: "17:00", end: "19:00" })),
  scheduleInvalid: false,
  capacity: null,
  memberCount: 4,
  ...extra,
});
let classList: ClassSummary[] = [];
vi.mock("@/features/classes", async (orig) => ({
  ...(await orig<typeof import("@/features/classes")>()),
  useClasses: () => ({ data: classList, isPending: false, isError: false }),
}));

let progress: Record<
  string,
  { sessionId: string; entered: number; total: number }
> = {};
vi.mock("@/features/attendance", () => ({
  useDayProgress: () => ({ data: progress, isError: false }),
}));

let newCount: number | undefined = 2;
vi.mock("@/features/consultations", () => ({
  useNewConsultationCount: () => ({
    data: newCount,
    isError: newCount === undefined,
  }),
}));

const mutateAsync = vi.fn();
vi.mock("@/features/sessions", async (orig) => ({
  ...(await orig<typeof import("@/features/sessions")>()),
  useStartSession: () => ({ mutateAsync, isPending: false }),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 4, 9));
  router.push.mockReset();
  show.mockReset();
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(undefined);
  progress = {};
  newCount = 2;
  classList = [
    mk("a", "수요반", [3, 5]),
    mk("b", "수요반2", [3]),
    mk("c", "목요반", [4]),
  ];
});
afterEach(() => {
  vi.useRealTimers();
});

describe("TodayScreen", () => {
  it("shows the heading, the summary cards and only today's classes", () => {
    render(<TodayScreen />);
    expect(screen.getByRole("heading", { name: "오늘" })).toBeInTheDocument();
    expect(screen.getByText("11월 4일 수요일")).toBeInTheDocument();
    expect(screen.getByText("2개")).toBeInTheDocument();
    expect(screen.getByText("0개")).toBeInTheDocument();
    expect(screen.getByText("2건")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /새 상담/ })).toHaveAttribute(
      "href",
      "/admin/consultations",
    );
    expect(screen.getByText("수요반")).toBeInTheDocument();
    expect(screen.getByText("수요반2")).toBeInTheDocument();
    expect(screen.queryByText("목요반")).not.toBeInTheDocument();
  });

  it("shows attendance progress and an attendance link once a session exists", () => {
    progress = { a: { sessionId: "s1", entered: 3, total: 4 } };
    render(<TodayScreen />);
    expect(screen.getByText("출결 3/4명 입력")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "수요반 출결 입력" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(bar).toHaveStyle({ width: "75%" });
    expect(screen.getByRole("link", { name: "출결 입력" })).toHaveAttribute(
      "href",
      "/admin/attendance?class=a",
    );
    expect(screen.getAllByRole("button", { name: "수업 시작" })).toHaveLength(
      1,
    );
    expect(
      screen.getByText("아직 수업을 시작하지 않았어요."),
    ).toBeInTheDocument();
  });

  it("starts today's session with the next schedule date and opens attendance", async () => {
    render(<TodayScreen />);
    await userEvent.click(
      screen.getAllByRole("button", { name: "수업 시작" })[0]!,
    );
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      classId: "a",
      date: "2026-11-04",
      homeworkDue: "2026-11-06",
    });
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/admin/attendance?class=a"),
    );
  });

  it("ignores a second click while the first start is pending", async () => {
    mutateAsync.mockReturnValue(new Promise(() => {}));
    render(<TodayScreen />);
    const button = screen.getAllByRole("button", { name: "수업 시작" })[0]!;
    await userEvent.click(button);
    await userEvent.click(button);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("shows a danger toast when starting fails", async () => {
    mutateAsync.mockRejectedValue(new Error("boom"));
    render(<TodayScreen />);
    await userEvent.click(
      screen.getAllByRole("button", { name: "수업 시작" })[0]!,
    );
    await waitFor(() =>
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({ tone: "danger" }),
      ),
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows a dash for the consultation count when it is unavailable", () => {
    newCount = undefined;
    render(<TodayScreen />);
    expect(screen.getByRole("link", { name: /새 상담/ })).toHaveTextContent(
      "-",
    );
  });

  it("explains when no class meets today", () => {
    classList = [mk("c", "목요반", [4])];
    render(<TodayScreen />);
    expect(
      screen.getByText(/오늘은 시간표에 있는 수업이 없어요/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "출결·숙제로" })).toHaveAttribute(
      "href",
      "/admin/attendance",
    );
  });

  it("warns about classes whose schedule could not be read", () => {
    classList = [mk("x", "깨진반", [], { scheduleInvalid: true })];
    render(<TodayScreen />);
    expect(screen.getByRole("alert")).toHaveTextContent("깨진반");
  });
});
