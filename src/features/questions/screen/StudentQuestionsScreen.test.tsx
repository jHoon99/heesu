import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyVideo } from "@/features/videos";
import type { Question } from "../model/questions";

const h = vi.hoisted(() => ({
  list: {
    data: [] as unknown[] | undefined,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  realtime: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("?video=v1"),
}));
vi.mock("@/features/auth", () => ({
  useMyStudent: () => ({ data: { id: "s1", name: "하늘" } }),
}));
vi.mock("@/features/videos", () => ({
  useMyVideos: () => ({ data: [{ id: "v1", title: "1단원" } as MyVideo] }),
}));
vi.mock("@/design-system", async (orig) => ({
  ...(await orig<typeof import("@/design-system")>()),
  useToast: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock("../state/useQuestions", () => ({
  useMyQuestions: () => h.list,
  useRecentSessions: () => ({ data: [] }),
  useAskQuestion: () => ({ submit: vi.fn(), isPending: false }),
}));
vi.mock("../state/useQuestionsRealtime", () => ({
  useQuestionsRealtime: h.realtime,
}));

import { StudentQuestionsScreen } from "./StudentQuestionsScreen";

const q = (over: Partial<Question>): Question => ({
  id: "q1",
  body: "질문 내용",
  createdAt: "2026-11-04T08:05:00Z",
  answeredAt: null,
  link: null,
  answers: [],
  ...over,
});

beforeEach(() => {
  h.realtime.mockReset();
  h.list.isError = false;
  h.list.data = [
    q({
      id: "q1",
      answeredAt: "2026-11-04T09:00:00Z",
      answers: [
        { id: "a", body: "이렇게 해요", createdAt: "2026-11-04T09:00:00Z" },
      ],
    }),
    q({ id: "q2", body: "두번째" }),
  ];
});

describe("StudentQuestionsScreen", () => {
  it("preselects the video from the url", () => {
    render(<StudentQuestionsScreen />);
    expect(screen.getByLabelText("무엇에 대한 질문인가요?")).toHaveValue(
      "video:v1",
    );
  });
  it("shows answers and the waiting note", () => {
    render(<StudentQuestionsScreen />);
    expect(screen.getByText(/원장님 답변/)).toBeVisible();
    expect(screen.getByText("이렇게 해요")).toBeVisible();
    expect(screen.getByText("아직 답변을 기다리고 있어요.")).toBeVisible();
  });
  it("subscribes to the student channel", () => {
    render(<StudentQuestionsScreen />);
    expect(h.realtime).toHaveBeenCalledWith({
      kind: "student",
      studentId: "s1",
    });
  });
  it("shows the empty copy", () => {
    h.list.data = [];
    render(<StudentQuestionsScreen />);
    expect(
      screen.getByText(
        "아직 한 질문이 없어요. 궁금한 게 생기면 위에서 물어봐요.",
      ),
    ).toBeVisible();
  });
  it("keeps the list when a background refetch failed", () => {
    h.list.isError = true;
    render(<StudentQuestionsScreen />);
    expect(screen.getByText("두번째")).toBeVisible();
  });
});
