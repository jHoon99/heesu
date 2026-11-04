import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { submitHomework } from "../data/homework";
import type { HomeworkItem } from "../model/homework";
import { homeworkKeys, useSubmitHomework } from "./useHomework";

vi.mock("../data/homework");
const submit = vi.mocked(submitHomework);

const item = (id: string): HomeworkItem => ({
  sessionId: id,
  classId: "c",
  className: "A반",
  date: "2026-11-04",
  homework: "숙제",
  due: null,
  status: "none",
  submittedAt: null,
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(homeworkKeys.mine("st1"), [item("s1"), item("s2")]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useSubmitHomework("st1"), { wrapper });
  const at = (id: string) =>
    client
      .getQueryData<HomeworkItem[]>(homeworkKeys.mine("st1"))
      ?.find((i) => i.sessionId === id)?.submittedAt;
  return { hook, at };
}

describe("useSubmitHomework", () => {
  beforeEach(() => {
    submit.mockReset();
  });

  it("sets submittedAt right away, while the rpc is pending", async () => {
    submit.mockReturnValue(new Promise(() => {}));
    const { hook, at } = setup();
    act(() => hook.result.current.submit("s1"));
    await waitFor(() => expect(at("s1")).not.toBeNull());
    expect(at("s2")).toBeNull();
  });

  it("calls the rpc once for two calls while pending", async () => {
    submit.mockReturnValue(new Promise(() => {}));
    const { hook } = setup();
    act(() => {
      hook.result.current.submit("s1");
      hook.result.current.submit("s1");
    });
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });

  it("reverts only the failed item and shows the DB message verbatim", async () => {
    const msg =
      "내 반 수업의 숙제만 제출할 수 있어요. 수업을 다시 골라 주세요.";
    let rejectS1: (e: unknown) => void = () => {};
    let resolveS2: (v: string) => void = () => {};
    submit.mockImplementation((id) =>
      id === "s1"
        ? new Promise((_, rej) => (rejectS1 = rej))
        : new Promise((res) => (resolveS2 = res)),
    );
    const { hook, at } = setup();
    act(() => {
      hook.result.current.submit("s1");
      hook.result.current.submit("s2");
    });
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    await act(async () => rejectS1({ code: "P0001", message: msg }));
    await waitFor(() => expect(at("s1")).toBeNull());
    expect(await screen.findByText(msg)).toBeInTheDocument();
    expect(at("s2")).not.toBeNull();
    await act(async () => resolveS2("2026-11-04T06:30:00Z"));
    await waitFor(() => expect(at("s2")).toBe("2026-11-04T06:30:00Z"));
  });

  it("reverts on a network error", async () => {
    submit.mockRejectedValue(new TypeError("Failed to fetch"));
    const { hook, at } = setup();
    act(() => hook.result.current.submit("s1"));
    await waitFor(() => expect(at("s1")).toBeNull());
    expect(
      await screen.findByText("네트워크 상태를 확인해 주세요."),
    ).toBeInTheDocument();
  });
});
