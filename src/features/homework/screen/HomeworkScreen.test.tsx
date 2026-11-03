import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { useMyStudent } from "@/features/auth";
import { listMyHomework, submitHomework } from "../data/homework";
import type { HomeworkItem } from "../model/homework";
import { HomeworkScreen } from "./HomeworkScreen";

vi.mock("../data/homework");
vi.mock("@/features/auth", () => ({ useMyStudent: vi.fn() }));

const list = vi.mocked(listMyHomework);
const submit = vi.mocked(submitHomework);

const item = (id: string, over: Partial<HomeworkItem> = {}): HomeworkItem => ({
  sessionId: id,
  classId: "c",
  className: "A반",
  date: "2026-11-04",
  homework: `숙제 ${id}`,
  due: null,
  status: "none",
  submittedAt: null,
  ...over,
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <HomeworkScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("HomeworkScreen", () => {
  beforeEach(() => {
    list.mockReset();
    submit.mockReset();
    vi.mocked(useMyStudent).mockReturnValue({
      data: { id: "st1", name: "하늘", mustChangePassword: false },
    } as never);
  });

  it("shows the missing item first with the 미완료 chip", async () => {
    list.mockResolvedValue([
      item("m", { status: "missing", date: "2026-10-28" }),
      item("n"),
    ]);
    setup();
    const rows = await screen.findAllByRole("listitem");
    expect(within(rows[0]!).getByText("미완료")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("숙제 m")).toBeInTheDocument();
  });

  it("shows 완료 without a submit button for done items", async () => {
    list.mockResolvedValue([item("d", { status: "done" })]);
    setup();
    const row = await screen.findByRole("listitem");
    expect(within(row).getByText("완료")).toBeInTheDocument();
    expect(
      within(row).queryByRole("button", { name: "제출했어요" }),
    ).not.toBeInTheDocument();
  });

  it("shows the submitted time for a submitted item", async () => {
    list.mockResolvedValue([
      item("a", { submittedAt: "2026-11-04T06:30:00Z" }),
    ]);
    setup();
    expect(await screen.findByText(/제출했어요 · 11\/4 15:30/)).toBeVisible();
  });

  it("submits once even if clicked twice while pending", async () => {
    list.mockResolvedValue([item("a")]);
    submit.mockReturnValue(new Promise(() => {}));
    const user = setup();
    const button = await screen.findByRole("button", { name: "제출했어요" });
    await user.dblClick(button);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "제출했어요" })).toBeNull(),
    );
    expect(submit).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/제출했어요 · /)).toBeInTheDocument();
  });

  it("shows the empty message", async () => {
    list.mockResolvedValue([]);
    setup();
    expect(await screen.findByText("아직 숙제가 없어요.")).toBeVisible();
  });

  it("shows an error with a retry button when there is no data", async () => {
    list.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    list.mockResolvedValue([]);
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("아직 숙제가 없어요.")).toBeVisible();
  });
});
