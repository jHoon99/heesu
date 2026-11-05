import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { saveLessonNote } from "../data/clinic";
import { LessonNoteEditor } from "./LessonNoteEditor";

vi.mock("../data/clinic");
const save = vi.mocked(saveLessonNote);

function setup(
  initial = { note: null, wordRetest: false, conceptReview: false },
) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <LessonNoteEditor
          sessionId="x"
          studentId="s"
          initial={initial}
          heading="11/5 · 고1 A반"
          context="관계대명사"
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("LessonNoteEditor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    save.mockResolvedValue(undefined);
  });

  it("enables save only after a change and sends the checks", async () => {
    const user = setup();
    const button = screen.getByRole("button", { name: "저장" });
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "단어 재시험" }));
    expect(button).toBeEnabled();
    await user.type(screen.getByLabelText("학생 메모"), " 단어 약함 ");
    await user.click(button);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith("x", "s", {
      note: "단어 약함",
      wordRetest: true,
      conceptReview: false,
    });
    expect(
      await screen.findByText(
        "저장했어요. 체크한 보완은 클리닉 명단에 들어갔어요.",
      ),
    ).toBeInTheDocument();
  });

  it("says just saved when nothing is checked", async () => {
    const user = setup({ note: null, wordRetest: true, conceptReview: false });
    await user.click(screen.getByRole("checkbox", { name: "단어 재시험" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("메모를 저장했어요.")).toBeInTheDocument();
  });

  it("shows the not-applied message", async () => {
    save.mockRejectedValue(new SaveNotAppliedError());
    const user = setup();
    await user.click(screen.getByRole("checkbox", { name: "개념 보완" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(
      await screen.findByText(
        "저장하지 못했어요. 다시 로그인하거나 새로고침해 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("blocks control characters before saving", async () => {
    const user = setup();
    await user.type(screen.getByLabelText("학생 메모"), "a");
    // 붙여넣기로만 들어오는 보이지 않는 문자
    await user.click(screen.getByLabelText("학생 메모"));
    await user.paste("\u0007");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(
      await screen.findByText(
        "보이지 않는 특수 문자가 들어 있어요. 지우고 다시 입력해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
