import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { listPayableStudents, listPayments } from "../data/payments";
import { monthKeyOf } from "../model/payments";
import { PaymentsScreen } from "./PaymentsScreen";

vi.mock("../data/payments");
const students = vi.mocked(listPayableStudents);
const payments = vi.mocked(listPayments);

// staleTime은 앱의 QueryProvider와 같게 둘 수 있다(캐시된 달 범위로 돌아올 때를 재현).
function setup(staleTime = 0) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <PaymentsScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const thisMonth = monthKeyOf(new Date());

beforeEach(() => {
  vi.resetAllMocks();
  payments.mockResolvedValue([]);
});

describe("PaymentsScreen", () => {
  it("renders cells, left badge and aria labels", async () => {
    students.mockResolvedValue([
      { id: "a", name: "가나", status: "active" },
      { id: "b", name: "다라", status: "left" },
      { id: "c", name: "마바", status: "left" },
    ]);
    payments.mockResolvedValue([
      {
        id: "p1",
        studentId: "a",
        month: thisMonth,
        amount: 250000,
        paidAt: "2026-11-05",
        memo: null,
      },
      {
        id: "p2",
        studentId: "b",
        month: thisMonth,
        amount: 100000,
        paidAt: null,
        memo: null,
      },
    ]);
    setup();
    expect(await screen.findByText("250,000원")).toBeVisible();
    expect(screen.getByText("11/5 납부")).toBeVisible();
    expect(screen.getByText("미납")).toBeVisible();
    expect(screen.getByText("퇴원")).toBeVisible();
    expect(screen.queryByText("마바")).not.toBeInTheDocument();
    const m = Number(thisMonth.slice(5));
    expect(
      screen.getByRole("button", { name: `가나 ${m}월 결제 수정` }),
    ).toBeVisible();
    const other = m === 1 ? 12 : m - 1;
    expect(
      screen.getByRole("button", { name: `가나 ${other}월 결제 입력` }),
    ).toBeVisible();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("moves the window one month back", async () => {
    students.mockResolvedValue([{ id: "a", name: "가나", status: "active" }]);
    const user = setup();
    await screen.findByText("가나");
    expect(payments).toHaveBeenLastCalledWith(expect.any(String), thisMonth);
    const firstFrom = payments.mock.calls[0]![0];
    await user.click(screen.getByRole("button", { name: "이전 달" }));
    await within(document.body).findByText("가나");
    const last = payments.mock.calls.at(-1)!;
    expect(last[1] < thisMonth).toBe(true);
    expect(last[0] < firstFrom).toBe(true);
  });

  it("opens the entry modal", async () => {
    students.mockResolvedValue([{ id: "a", name: "가나", status: "active" }]);
    const user = setup();
    const m = Number(thisMonth.slice(5));
    await user.click(
      await screen.findByRole("button", { name: `가나 ${m}월 결제 입력` }),
    );
    expect(await screen.findByLabelText("금액(원)")).toBeInTheDocument();
  });

  it("opens the entry modal after moving back to a cached window", async () => {
    students.mockResolvedValue([{ id: "a", name: "가나", status: "active" }]);
    const user = setup(30_000);
    const m = Number(thisMonth.slice(5));
    await screen.findByRole("button", { name: `가나 ${m}월 결제 입력` });
    await user.click(screen.getByRole("button", { name: "이전 달" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: `가나 ${m}월 결제 입력` }),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "다음 달" }));
    await user.click(
      await screen.findByRole("button", { name: `가나 ${m}월 결제 입력` }),
    );
    expect(await screen.findByLabelText("금액(원)")).toBeInTheDocument();
  });

  it("shows the empty text", async () => {
    students.mockResolvedValue([]);
    setup();
    expect(
      await screen.findByText(
        "학생이 없어요. 학생 화면에서 먼저 추가해 주세요.",
      ),
    ).toBeVisible();
  });
});
