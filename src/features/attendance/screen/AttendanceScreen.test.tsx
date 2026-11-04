import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassSummary } from "@/features/classes";
import type { Board } from "../model/board";
import { AttendanceScreen } from "./AttendanceScreen";

const replace = vi.fn();
const router = { push: vi.fn(), replace };
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => search,
}));

const show = vi.fn();
vi.mock("@/design-system", async (orig) => ({
  ...(await orig<typeof import("@/design-system")>()),
  useToast: () => ({ show, dismiss: vi.fn() }),
}));

const mk = (id: string, name: string): ClassSummary => ({
  id,
  name,
  level: "middle",
  schedule: [
    { day: 2, start: "17:00", end: "19:00" },
    { day: 4, start: "17:00", end: "19:00" },
  ],
  scheduleInvalid: false,
  capacity: null,
  memberCount: 3,
});
let classList: ClassSummary[] = [];
vi.mock("@/features/classes", async (orig) => ({
  ...(await orig<typeof import("@/features/classes")>()),
  useClasses: () => ({ data: classList, isPending: false, isError: false }),
}));

const startMutate = vi.fn();
let startPending = false;
vi.mock("@/features/sessions", async (orig) => ({
  ...(await orig<typeof import("@/features/sessions")>()),
  useStartSession: () => ({ mutate: startMutate, isPending: startPending }),
}));

let boardData: Board | undefined;
const cellMutate = vi.fn();
vi.mock("../state/useBoard", async (orig) => ({
  ...(await orig<typeof import("../state/useBoard")>()),
  useBoard: () => ({
    data: boardData,
    isPending: boardData === undefined,
    isError: false,
  }),
  useSetCell: () => ({ mutate: cellMutate }),
}));

const session = (id: string, date: string) => ({
  id,
  classId: "a1",
  date,
  summary: null,
  homework: null,
  homeworkDue: null,
});

function setup() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <AttendanceScreen />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("AttendanceScreen", () => {
  beforeEach(() => {
    for (const m of [replace, show, startMutate, cellMutate]) m.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T10:00:00+09:00")); // 목요일
    classList = [mk("a1", "중등 A"), mk("b2", "고등 B")];
    search = new URLSearchParams("class=a1");
    startPending = false;
    boardData = {
      sessions: [session("s1", "2026-11-03")],
      students: [{ id: "u1", name: "김하늘", grade: "중1" }],
      records: {},
    };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to the first class for an unknown ?class=", async () => {
    search = new URLSearchParams("class=zzz");
    setup();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/attendance?class=a1"),
    );
  });

  it("hides 오늘 수업 추가 when today's session exists", () => {
    boardData = { ...boardData!, sessions: [session("s9", "2026-11-05")] };
    setup();
    expect(
      screen.queryByRole("button", { name: "오늘 수업 추가" }),
    ).not.toBeInTheDocument();
  });

  it("adds today's session with the next schedule date as due", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "오늘 수업 추가" }));
    expect(startMutate).toHaveBeenCalledTimes(1);
    expect(startMutate.mock.calls[0]?.[0]).toEqual({
      classId: "a1",
      date: "2026-11-05",
      homeworkDue: "2026-11-10",
    });
  });

  it("disables 오늘 수업 추가 while pending", () => {
    startPending = true;
    setup();
    expect(
      screen.getByRole("button", { name: "오늘 수업 추가" }),
    ).toBeDisabled();
  });

  it("explains when the class has no students", () => {
    boardData = { ...boardData!, students: [] };
    setup();
    expect(
      screen.getByText(
        "이 반에 배정된 학생이 없어요. 학생 상세에서 반을 배정해 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("explains when the class has no sessions", () => {
    boardData = { ...boardData!, sessions: [] };
    setup();
    expect(
      screen.getByText(
        "아직 수업이 없어요. 오늘 수업 추가를 눌러 시작해 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("saves a clicked cell with its previous value", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /김하늘 11\/3 출결/ }));
    expect(cellMutate).toHaveBeenCalledWith({
      sessionId: "s1",
      studentId: "u1",
      field: "att",
      value: "present",
      previous: "none",
      studentName: "김하늘",
      dateLabel: "11/3",
    });
  });

  it("links to the session log of the class", () => {
    setup();
    expect(screen.getByRole("link", { name: /수업일지/ })).toHaveAttribute(
      "href",
      "/admin/sessions?class=a1",
    );
  });

  it("asks to create a class first when there are none", () => {
    classList = [];
    setup();
    expect(screen.getByText("먼저 반을 만들어 주세요.")).toBeInTheDocument();
  });
});
