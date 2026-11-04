import { StrictMode } from "react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { celebrate } from "@/design-system";
import { useGoalCelebration } from "./useGoalCelebration";

vi.mock("@/design-system", () => ({ celebrate: vi.fn() }));
const fire = vi.mocked(celebrate);

describe("useGoalCelebration", () => {
  beforeEach(() => {
    fire.mockReset();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("fires once and records the goal", () => {
    const { rerender } = renderHook(
      ({ p, g }) => useGoalCelebration("s1", p, g),
      {
        initialProps: {
          p: 30 as number | undefined,
          g: 30 as number | undefined,
        },
      },
    );
    expect(fire).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("heesu:celebrated-goals:s1")).toBe("[30]");
    rerender({ p: 30, g: 30 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it("does not fire again after remount", () => {
    renderHook(() => useGoalCelebration("s1", 30, 30)).unmount();
    renderHook(() => useGoalCelebration("s1", 40, 30));
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it("fires once under StrictMode", () => {
    renderHook(() => useGoalCelebration("s1", 30, 30), { wrapper: StrictMode });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it("celebrates a raised goal separately", () => {
    const { rerender } = renderHook(
      ({ p, g }) => useGoalCelebration("s1", p, g),
      {
        initialProps: { p: 30, g: 50 },
      },
    );
    expect(fire).not.toHaveBeenCalled();
    rerender({ p: 50, g: 50 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a storage write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() =>
      renderHook(() => useGoalCelebration("s1", 30, 30)),
    ).not.toThrow();
    expect(fire).not.toHaveBeenCalled();
  });

  it("does nothing while points or goal are unknown", () => {
    renderHook(() => useGoalCelebration("s1", undefined, 30));
    renderHook(() => useGoalCelebration("s1", 30, undefined));
    expect(fire).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });
});
