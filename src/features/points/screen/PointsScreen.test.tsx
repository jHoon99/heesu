import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import {
  addManualPoints,
  listPointHistory,
  listPointTotals,
} from "../data/points";
import type { PointTotal } from "../model/points";
import { PointsScreen } from "./PointsScreen";

vi.mock("../data/points");

const totals = vi.mocked(listPointTotals);
const history = vi.mocked(listPointHistory);
const add = vi.mocked(addManualPoints);

const t = (
  studentId: string,
  name: string,
  total: number,
  status: PointTotal["status"] = "active",
): PointTotal => ({ studentId, name, grade: "중1", status, total });

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <PointsScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  totals.mockReset();
  history.mockReset();
  add.mockReset();
  totals.mockResolvedValue([
    t("s1", "김하늘", 12),
    t("s2", "이바다", 20),
    t("s3", "박구름", 5),
    t("s4", "최노을", 1),
    t("s5", "퇴원생", 99, "left"),
  ]);
  history.mockResolvedValue([]);
  add.mockResolvedValue();
});

async function pick(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("row", { name: /김하늘/ }));
}

describe("PointsScreen", () => {
  it("badges ranks 1 to 3 and leaves 4th as plain text", async () => {
    setup();
    const fourth = await screen.findByRole("row", { name: /최노을/ });
    expect(within(fourth).getByText("4등")).toBeInTheDocument();
    expect(fourth.querySelector("span.rounded-full")).toBeNull();
    const first = screen.getByRole("row", { name: /이바다/ });
    expect(within(first).getByText("1등").className).toContain("rounded-full");
    expect(screen.getByText("2등")).toBeInTheDocument();
    expect(screen.queryByText("퇴원생")).toBeNull();
  });

  it("shows the selected student's title", async () => {
    const user = setup();
    expect(
      await screen.findByText("왼쪽 순위표에서 학생을 골라 주세요."),
    ).toBeInTheDocument();
    await pick(user);
    expect(
      screen.getByRole("heading", { name: "김하늘 · 12점" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("아직 포인트 내역이 없어요."),
    ).toBeInTheDocument();
  });

  it("submits a manual adjustment once and toasts", async () => {
    const user = setup();
    await pick(user);
    await user.type(screen.getByLabelText("포인트"), "-2");
    await user.type(screen.getByLabelText("사유"), " 지각 정정 ");
    await user.click(screen.getByRole("button", { name: "반영하기" }));
    await waitFor(() => {
      expect(add).toHaveBeenCalledTimes(1);
    });
    expect(add).toHaveBeenCalledWith("s1", { amount: -2, reason: "지각 정정" });
    expect(
      await screen.findByText("김하늘 학생에게 -2점을 반영했어요."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("사유")).toHaveValue("");
  });

  it("shows the reason message and does not call on empty reason", async () => {
    const user = setup();
    await pick(user);
    await user.type(screen.getByLabelText("포인트"), "3");
    await user.click(screen.getByRole("button", { name: "반영하기" }));
    expect(
      await screen.findByText("사유를 1~100자로 입력해 주세요."),
    ).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });

  it("ignores a second submit while pending", async () => {
    let release: () => void = () => undefined;
    add.mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const user = setup();
    await pick(user);
    await user.type(screen.getByLabelText("포인트"), "3");
    await user.type(screen.getByLabelText("사유"), "발표{Enter}{Enter}");
    expect(add).toHaveBeenCalledTimes(1);
    release();
    await screen.findByText("김하늘 학생에게 +3점을 반영했어요.");
  });
});
