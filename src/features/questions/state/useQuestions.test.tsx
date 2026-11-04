import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ answer: vi.fn() }));
vi.mock("../data/questions", () => ({
  answerQuestion: h.answer,
  listAdminQuestions: vi.fn(),
  countUnansweredQuestions: vi.fn(),
}));

import { useAnswerQuestion } from "./useQuestions";

beforeEach(() => {
  h.answer.mockReset();
});

describe("useAnswerQuestion", () => {
  it("ignores a second submit while the first is pending", async () => {
    let done!: () => void;
    h.answer.mockReturnValue(new Promise<void>((r) => (done = r)));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useAnswerQuestion(), { wrapper });
    const v = { questionId: "q1", body: "b" };
    let first!: Promise<boolean>;
    let second = true;
    await act(async () => {
      first = result.current.submit(v);
      second = await result.current.submit(v);
      done();
      await first;
    });
    expect(second).toBe(false);
    expect(h.answer).toHaveBeenCalledTimes(1);
  });
});
