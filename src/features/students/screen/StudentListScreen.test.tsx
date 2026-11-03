import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStudents } from "../data/students";
import type { StudentSummary } from "../model/students";
import { StudentListScreen } from "./StudentListScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../data/students");
let pointsResult: {
  data?: { studentId: string; total: number }[];
  isError?: boolean;
} = {};
vi.mock("@/features/points", () => ({ usePointTotals: () => pointsResult }));
const list = vi.mocked(listStudents);

const mk = (over: Partial<StudentSummary>): StudentSummary => ({
  id: "1",
  loginId: "haneul",
  name: "김하늘",
  grade: "중1",
  status: "active",
  joinedAt: "2026-11-05",
  school: null,
  classes: [{ id: "c1", name: "중등 A" }],
  ...over,
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <StudentListScreen />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("StudentListScreen", () => {
  beforeEach(() => {
    push.mockReset();
    pointsResult = { data: [{ studentId: "1", total: 12 }] };
    list.mockReset();
    list.mockResolvedValue([
      mk({}),
      mk({ id: "2", loginId: "minjun", name: "이민준", classes: [] }),
      mk({ id: "3", loginId: "old", name: "박퇴원", status: "left" }),
    ]);
  });

  it("starts on active students with counts", async () => {
    setup();
    expect(await screen.findByRole("tab", { name: "재원 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
    expect(screen.getByText("미배정")).toBeInTheDocument();
  });

  it("switches tabs and searches", async () => {
    const user = setup();
    await user.click(await screen.findByRole("tab", { name: "퇴원 1" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.click(screen.getByRole("tab", { name: "재원 2" }));
    await user.type(
      screen.getByPlaceholderText("이름이나 아이디로 찾기"),
      "minjun",
    );
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.clear(screen.getByPlaceholderText("이름이나 아이디로 찾기"));
    await user.type(
      screen.getByPlaceholderText("이름이나 아이디로 찾기"),
      "zzz",
    );
    expect(screen.getByText("조건에 맞는 학생이 없어요.")).toBeInTheDocument();
  });

  it("shows points after the status column, 0점 for students without rows", async () => {
    setup();
    await screen.findByRole("table");
    const heads = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(heads.indexOf("포인트")).toBe(heads.indexOf("상태") + 1);
    const rowOf = (name: string) =>
      screen.getByText(name).closest("tr") as HTMLElement;
    expect(within(rowOf("김하늘")).getByText("12점")).toBeInTheDocument();
    expect(within(rowOf("이민준")).getByText("0점")).toBeInTheDocument();
  });

  it("shows - and keeps the list when points are unavailable", async () => {
    pointsResult = {};
    setup();
    const row = (await screen.findByText("김하늘")).closest(
      "tr",
    ) as HTMLElement;
    const cells = within(row).getAllByRole("cell");
    expect(cells[6]).toHaveTextContent("-"); // 포인트 열(학교도 "-"이라 칸 번호로)
    expect(cells[6]).not.toHaveTextContent("점");
    expect(screen.getByText("이민준")).toBeInTheDocument();
  });

  it("shows - in every points cell and keeps the list when the points query errors", async () => {
    pointsResult = { data: undefined, isError: true };
    setup();
    await screen.findByRole("table");
    for (const name of ["김하늘", "이민준"]) {
      const row = screen.getByText(name).closest("tr") as HTMLElement;
      const cell = within(row).getAllByRole("cell")[6];
      expect(cell).toHaveTextContent("-");
      expect(cell).not.toHaveTextContent("점");
    }
  });

  it("opens the detail on Enter", async () => {
    const user = setup();
    const row = within(await screen.findByRole("table"))
      .getByText("김하늘")
      .closest("tr") as HTMLElement;
    row.focus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/admin/students/detail?id=1");
  });

  it("shows the empty state", async () => {
    list.mockResolvedValue([]);
    setup();
    expect(
      await screen.findByText(
        "아직 학생이 없어요. 학생 추가를 눌러 첫 학생을 등록해 주세요.",
      ),
    ).toBeInTheDocument();
  });
});
