import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ answer: vi.fn(), show: vi.fn() }));
vi.mock("../../data/questions", () => ({
  answerQuestion: (...a: unknown[]) => h.answer(...a),
}));
vi.mock("@/design-system", async (orig) => ({
  ...(await orig<typeof import("@/design-system")>()),
  useToast: () => ({ show: h.show, dismiss: vi.fn() }),
}));

import { AnswerForm } from "./AnswerForm";

function render(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("AnswerForm", () => {
  beforeEach(() => {
    h.answer.mockReset();
    h.show.mockReset();
  });

  it("clears the box after a successful send", async () => {
    const user = userEvent.setup();
    h.answer.mockResolvedValue(undefined);
    render(<AnswerForm questionId="q1" />);
    await user.type(screen.getByLabelText("답변"), "이렇게 해요");
    await user.click(screen.getByRole("button", { name: "답변 보내기" }));
    await screen.findByDisplayValue("");
    expect(h.show).toHaveBeenCalledWith({
      tone: "success",
      message: "답변을 보냈어요.",
    });
  });

  it("keeps text typed while the send was in flight", async () => {
    const user = userEvent.setup();
    let release: (v?: unknown) => void = () => {};
    h.answer.mockReturnValue(new Promise((r) => (release = r)));
    render(<AnswerForm questionId="q1" />);
    const box = screen.getByLabelText("답변");
    await user.type(box, "첫 답변");
    await user.click(screen.getByRole("button", { name: "답변 보내기" }));
    await user.type(box, " 추가");
    release();
    await waitFor(() => expect(h.show).toHaveBeenCalled());
    expect(box).toHaveValue("첫 답변 추가");
  });
});
