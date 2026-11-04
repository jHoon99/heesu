import { act, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast, type ToastInput } from "./ToastProvider";

function Trigger({ toasts }: { toasts: ToastInput[] }) {
  const { show } = useToast();
  return (
    <button
      type="button"
      onClick={() => toasts.forEach((toast) => show(toast))}
    >
      띄우기
    </button>
  );
}

function setup(toasts: ToastInput[]) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <ToastProvider>
      <Trigger toasts={toasts} />
    </ToastProvider>,
  );
  return user;
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // jump the clock without waiting on the (fake-timer driven) frame loop
    MotionGlobalConfig.skipAnimations = true;
  });
  afterEach(() => {
    MotionGlobalConfig.skipAnimations = false;
    vi.useRealTimers();
  });

  it("shows a status toast and removes it after 4000ms", async () => {
    const user = setup([{ message: "저장했어요." }]);
    await user.click(screen.getByRole("button", { name: "띄우기" }));
    expect(screen.getByRole("status")).toHaveTextContent("저장했어요.");
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("replaces the current toast with the newest one", async () => {
    const user = setup([
      { message: "첫 번째예요." },
      { message: "두 번째예요." },
    ]);
    await user.click(screen.getByRole("button", { name: "띄우기" }));
    await waitFor(() => {
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.getByRole("status")).toHaveTextContent("두 번째예요.");
    });
    expect(screen.queryByText("첫 번째예요.")).toBeNull();
  });

  it("keeps a danger toast until it is closed", async () => {
    const user = setup([
      { tone: "danger", message: "신청을 보내지 못했어요." },
    ]);
    await user.click(screen.getByRole("button", { name: "띄우기" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "신청을 보내지 못했어요.",
    );
    for (let elapsed = 0; elapsed < 10000; elapsed += 100) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("calls onAction once when the action button is clicked", async () => {
    const onAction = vi.fn();
    const user = setup([
      { message: "지웠어요.", actionLabel: "되돌리기", onAction },
    ]);
    await user.click(screen.getByRole("button", { name: "띄우기" }));
    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger toasts={[]} />)).toThrow(
      "useToast는 ToastProvider 안에서만 쓸 수 있어요.",
    );
    spy.mockRestore();
  });
});
