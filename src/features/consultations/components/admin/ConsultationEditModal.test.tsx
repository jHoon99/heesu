import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { updateConsultation } from "../../data/adminConsultations";
import type { ConsultationRecord } from "../../model/adminConsultation";
import { ConsultationEditModal } from "./ConsultationEditModal";

vi.mock("../../data/adminConsultations");
const update = vi.mocked(updateConsultation);

const record: ConsultationRecord = {
  id: "c1",
  parentName: "김부모",
  phone: "010-0000-0091",
  grade: "중2",
  message: "x".repeat(1000),
  status: "new",
  memo: null,
  createdAt: "2026-11-03T15:05:00Z",
};

function setup(rec = record) {
  const onClose = vi.fn();
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ConsultationEditModal record={rec} open onClose={onClose} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { onClose, user: userEvent.setup() };
}

beforeEach(() => {
  vi.resetAllMocks();
  update.mockResolvedValue(undefined);
});

describe("ConsultationEditModal", () => {
  it("saves status and memo, toasts and closes", async () => {
    const { user, onClose } = setup();
    await user.selectOptions(screen.getByLabelText("상태"), "contacted");
    await user.type(screen.getByLabelText("메모"), "전화함");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith("c1", {
        status: "contacted",
        memo: "전화함",
      }),
    );
    expect(
      await screen.findByText("상담 기록을 저장했어요."),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the error in the modal when saving fails", async () => {
    update.mockRejectedValue(new SaveNotAppliedError());
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "저장하지 못했어요. 다시 로그인하거나 새로고침해 주세요.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("saves once on a double click", async () => {
    let resolve: () => void = () => {};
    update.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const { user } = setup();
    const save = screen.getByRole("button", { name: "저장" });
    await user.click(save);
    await user.click(save);
    resolve();
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });

  it("wraps a long unbroken message", () => {
    setup();
    expect(screen.getByTestId("consultation-message")).toHaveClass(
      "break-words",
    );
  });

  it("shows a placeholder when there is no message", async () => {
    setup({ ...record, message: null });
    expect(await screen.findByText("적은 내용이 없어요.")).toBeInTheDocument();
  });
});
