import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { deletePayment, savePayment } from "../data/payments";
import type { PaymentRecord } from "../model/payments";
import { PaymentEditModal } from "./PaymentEditModal";

vi.mock("../data/payments");
const save = vi.mocked(savePayment);
const del = vi.mocked(deletePayment);

const student = { id: "s1", name: "김하늘" };
const record: PaymentRecord = {
  id: "p1",
  studentId: "s1",
  month: "2026-11",
  amount: 250000,
  paidAt: "2026-11-05",
  memo: "현금",
};

function setup(rec: PaymentRecord | null = null) {
  const onClose = vi.fn();
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <PaymentEditModal
          open
          student={student}
          month="2026-11"
          record={rec}
          onClose={onClose}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { onClose, user: userEvent.setup() };
}

beforeEach(() => {
  vi.resetAllMocks();
  save.mockResolvedValue(undefined);
  del.mockResolvedValue(undefined);
});

describe("PaymentEditModal", () => {
  it("saves a new cell", async () => {
    const { user, onClose } = setup();
    expect(screen.getByText("김하늘 · 2026년 11월")).toBeInTheDocument();
    await user.type(screen.getByLabelText("금액(원)"), "250,000");
    await user.type(screen.getByLabelText("납부일"), "2026-11-05");
    await user.type(screen.getByLabelText("메모"), "현금");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        studentId: "s1",
        month: "2026-11",
        amount: 250000,
        paidAt: "2026-11-05",
        memo: "현금",
      }),
    );
    expect(
      await screen.findByText("결제 기록을 저장했어요."),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it("saves null paidAt when the date is cleared", async () => {
    const { user } = setup(record);
    await user.clear(screen.getByLabelText("납부일"));
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ paidAt: null, amount: 250000 }),
      ),
    );
  });

  it("shows validation errors without saving", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("금액(원)"), "abc");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "금액은 0~10,000,000원 사이 숫자로 입력해 주세요.",
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("needs two clicks to delete", async () => {
    const { user, onClose } = setup(record);
    await user.click(screen.getByRole("button", { name: "기록 지우기" }));
    expect(del).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "한 번 더 누르면 지워져요" }),
    );
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(del).toHaveBeenCalledWith("p1");
    expect(
      await screen.findByText("결제 기록을 지웠어요."),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it("has no delete button for a new cell", () => {
    setup();
    expect(
      screen.queryByRole("button", { name: "기록 지우기" }),
    ).not.toBeInTheDocument();
  });

  it("shows the error in the modal when saving fails", async () => {
    save.mockRejectedValue(new SaveNotAppliedError());
    const { user, onClose } = setup(record);
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "저장하지 못했어요. 다시 로그인하거나 새로고침해 주세요.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("saves once on a double click", async () => {
    let resolve: () => void = () => {};
    save.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const { user } = setup(record);
    const button = screen.getByRole("button", { name: "저장" });
    await user.click(button);
    await user.click(button);
    resolve();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  });
});
