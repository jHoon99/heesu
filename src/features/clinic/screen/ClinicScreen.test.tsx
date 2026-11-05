import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { listClinicBoard, setClinicStatus } from "../data/clinic";
import type { ClinicBoardItem } from "../model/clinic";
import { ClinicScreen } from "./ClinicScreen";

vi.mock("../data/clinic");
const list = vi.mocked(listClinicBoard);
const setStatus = vi.mocked(setClinicStatus);

const item: ClinicBoardItem = {
  id: "c1",
  studentId: "s1",
  sessionId: "x1",
  sessionDate: "2026-11-05",
  testDate: null,
  kind: "word_retest",
  status: "open",
  memo: "Day 12",
  doneAt: null,
  createdAt: "2026-11-05T01:00:00Z",
  studentName: "김하늘",
  grade: "고1",
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ClinicScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("ClinicScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    list.mockResolvedValue({ open: [item], done: [] });
    setStatus.mockResolvedValue(undefined);
  });

  it("lists open items with the student link and source", async () => {
    setup();
    expect(
      await screen.findByRole("heading", { name: "해야 할 보완 1개" }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /김하늘/ });
    expect(link).toHaveAttribute(
      "href",
      "/admin/students/detail?id=s1&tab=clinic",
    );
    const row = link.closest("li") as HTMLElement;
    expect(within(row).getByText("단어 재시험")).toBeInTheDocument();
    expect(within(row).getByText("11/5 수업")).toBeInTheDocument();
    expect(within(row).getByText("Day 12")).toBeInTheDocument();
    expect(screen.getByText("아직 끝낸 보완이 없어요.")).toBeInTheDocument();
  });

  it("marks an item done", async () => {
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "끝냈어요" }));
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith("c1", "done"));
    expect(
      await screen.findByText("끝낸 보완으로 옮겼어요."),
    ).toBeInTheDocument();
  });

  it("shows the empty text", async () => {
    list.mockResolvedValue({ open: [], done: [] });
    setup();
    expect(
      await screen.findByText(
        "해야 할 보완이 없어요. 수업일지에서 학생별로 체크하면 여기에 생겨요.",
      ),
    ).toBeInTheDocument();
  });
});
