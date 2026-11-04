import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminQuestion } from "../model/questions";

const h = vi.hoisted(() => ({
  list: {
    data: [] as unknown[],
    isPending: false,
    isError: false,
    error: null,
  },
  submit: vi.fn(),
  show: vi.fn(),
}));
vi.mock("../state/useQuestions", () => ({
  useAdminQuestions: () => h.list,
  useAnswerQuestion: () => ({ submit: h.submit, isPending: false }),
}));
vi.mock("@/design-system", async (orig) => ({
  ...(await orig<typeof import("@/design-system")>()),
  useToast: () => ({ show: h.show, dismiss: vi.fn() }),
}));

import { AdminQuestionsScreen } from "./AdminQuestionsScreen";

const q = (over: Partial<AdminQuestion>): AdminQuestion => ({
  id: "q1",
  body: "질문 내용",
  createdAt: "2026-11-04T08:05:00Z",
  answeredAt: null,
  link: null,
  answers: [],
  studentName: "김학생",
  ...over,
});

beforeEach(() => {
  h.submit.mockReset();
  h.submit.mockResolvedValue(true);
  h.show.mockReset();
  h.list.data = [
    q({
      id: "q1",
      link: { kind: "video", videoId: "v", title: "1단원" },
    }),
    q({
      id: "q2",
      body: "답변된 질문",
      studentName: "이학생",
      answeredAt: "2026-11-04T09:00:00Z",
      answers: [
        { id: "a1", body: "이렇게 하세요", createdAt: "2026-11-04T09:00:00Z" },
      ],
    }),
  ];
});

describe("AdminQuestionsScreen", () => {
  it("shows only unanswered by default, with student name and link badge", async () => {
    render(<AdminQuestionsScreen />);
    expect(screen.getByRole("heading", { name: "질문" })).toBeInTheDocument();
    expect(screen.getByText(/김학생 · 11\/4 17:05/)).toBeInTheDocument();
    expect(screen.getByText("영상 · 1단원")).toBeInTheDocument();
    expect(screen.queryByText("답변된 질문")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /전체/ }));
    expect(screen.getByText("답변된 질문")).toBeInTheDocument();
    expect(screen.getByText("이렇게 하세요")).toBeInTheDocument();
  });

  it("renders a long unbroken body as break-words plain text", () => {
    const long = "가".repeat(2000);
    h.list.data = [q({ body: long })];
    render(<AdminQuestionsScreen />);
    const p = screen.getByText(long);
    expect(p.tagName).toBe("P");
    expect(p).toHaveClass("break-words");
  });

  it("sends an answer and clears the field", async () => {
    render(<AdminQuestionsScreen />);
    await userEvent.type(screen.getByLabelText("답변"), "  좋아요 ");
    await userEvent.click(screen.getByRole("button", { name: "답변 보내기" }));
    expect(h.submit).toHaveBeenCalledWith({ questionId: "q1", body: "좋아요" });
    expect(h.show).toHaveBeenCalledWith({
      tone: "success",
      message: "답변을 보냈어요.",
    });
    expect(screen.getByLabelText("답변")).toHaveValue("");
  });

  it("shows the empty-answer message and does not submit", async () => {
    render(<AdminQuestionsScreen />);
    await userEvent.click(screen.getByRole("button", { name: "답변 보내기" }));
    expect(screen.getByText("내용을 입력해 주세요.")).toBeInTheDocument();
    expect(h.submit).not.toHaveBeenCalled();
  });

  it("shows a danger toast when sending fails", async () => {
    h.submit.mockRejectedValue(new Error("x"));
    render(<AdminQuestionsScreen />);
    await userEvent.type(screen.getByLabelText("답변"), "답");
    await userEvent.click(screen.getByRole("button", { name: "답변 보내기" }));
    expect(h.show).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "danger" }),
    );
  });

  it("explains when there are no unanswered questions", () => {
    h.list.data = [];
    render(<AdminQuestionsScreen />);
    expect(
      screen.getByText("새 질문이 없어요. 학생이 질문하면 여기에 바로 떠요."),
    ).toBeInTheDocument();
  });
});
