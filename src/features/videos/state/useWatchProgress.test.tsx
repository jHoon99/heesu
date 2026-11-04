import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveVideoProgress, type MyVideo } from "../data/videos";
import { videoKeys } from "./keys";
import { useWatchProgress } from "./useWatchProgress";

const show = vi.fn();
vi.mock("@/design-system", () => ({ useToast: () => ({ show }) }));
vi.mock("../data/videos", () => ({ saveVideoProgress: vi.fn() }));
const save = vi.mocked(saveVideoProgress);

class FakeVideo extends EventTarget {
  currentTime = 0;
  readyState = 0;
}

const video: MyVideo = {
  id: "v1",
  classId: "c1",
  className: "A반",
  title: "t",
  storagePath: "c1/x.mp4",
  durationSeconds: 600,
  publishedAt: "2026-11-04T00:00:00+09:00",
  watchedSeconds: 120,
  positionSeconds: 120,
};

function setup(opts: { readyState?: number; video?: MyVideo } = {}) {
  const el = new FakeVideo();
  el.readyState = opts.readyState ?? 0;
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    () =>
      useWatchProgress(el as unknown as HTMLVideoElement, opts.video ?? video),
    { wrapper },
  );
  const fire = (t: string) =>
    act(() => {
      if (t === "loadedmetadata") el.readyState = 4;
      el.dispatchEvent(new Event(t));
    });
  const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
  return { el, view, fire, tick, invalidate };
}

describe("useWatchProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    show.mockReset();
    save.mockReset();
    save.mockResolvedValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resumes, saves every 10s only when something changed", async () => {
    const { el, fire, tick } = setup();
    fire("loadedmetadata");
    expect(el.currentTime).toBe(120);
    fire("play");
    for (let t = 121; t <= 130; t += 1) {
      el.currentTime = t;
      fire("timeupdate");
    }
    tick(10_000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith("v1", 130, 130);
    tick(10_000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not count a skipped section as watched", () => {
    const { el, fire, tick } = setup();
    fire("loadedmetadata");
    fire("play");
    for (let t = 121; t <= 130; t += 1) {
      el.currentTime = t;
      fire("timeupdate");
    }
    el.currentTime = 590;
    fire("timeupdate");
    tick(10_000);
    expect(save).toHaveBeenLastCalledWith("v1", 590, 130);
  });

  it("saves on pause, hidden and unmount", () => {
    const { el, fire, view } = setup();
    fire("loadedmetadata");
    el.currentTime = 121;
    fire("timeupdate");
    fire("pause");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith("v1", 121, 121);
    el.currentTime = 122;
    fire("timeupdate");
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(save).toHaveBeenCalledTimes(2);
    el.currentTime = 123;
    fire("timeupdate");
    view.unmount();
    expect(save).toHaveBeenCalledTimes(3);
  });

  it("toasts once after 3 consecutive failures", async () => {
    save.mockRejectedValue(new Error("x"));
    const { el, fire } = setup();
    fire("loadedmetadata");
    for (let i = 1; i <= 4; i += 1) {
      el.currentTime = 120 + i;
      fire("timeupdate");
      fire("pause");
      await act(async () => {
        await Promise.resolve();
      });
    }
    expect(save).toHaveBeenCalledTimes(4);
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith({
      tone: "danger",
      message:
        "시청 위치를 저장하지 못하고 있어요. 인터넷 연결을 확인해 주세요.",
    });
  });

  it("shows the server message when saving fails with P0001", async () => {
    save.mockRejectedValue({
      code: "P0001",
      message: "공개 전 영상은 볼 수 없어요. 목록에서 다시 골라 주세요.",
    });
    const { el, fire } = setup();
    fire("loadedmetadata");
    for (let i = 1; i <= 4; i += 1) {
      el.currentTime = 120 + i;
      fire("timeupdate");
      fire("pause");
      await act(async () => {
        await Promise.resolve();
      });
    }
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith({
      tone: "danger",
      message: "공개 전 영상은 볼 수 없어요. 목록에서 다시 골라 주세요.",
    });
  });

  it("returns the furthest watched seconds after a successful save", async () => {
    const { el, view, fire } = setup();
    expect(view.result.current).toBeNull();
    fire("loadedmetadata");
    el.currentTime = 121;
    fire("timeupdate");
    fire("pause");
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.result.current).toBe(121);
  });

  it("keeps the session position when the url is refreshed", () => {
    const { el, fire } = setup();
    fire("loadedmetadata");
    fire("play");
    for (let t = 121; t <= 125; t += 1) {
      el.currentTime = t;
      fire("timeupdate");
    }
    // src changes: element resets before metadata loads
    el.readyState = 0;
    el.currentTime = 0;
    fire("timeupdate");
    fire("pause");
    expect(save).not.toHaveBeenCalled();
    fire("loadedmetadata");
    expect(el.currentTime).toBe(125);
    fire("pause");
    expect(save).toHaveBeenLastCalledWith("v1", 125, 125);
  });

  it("seeks immediately when metadata is already loaded on attach", () => {
    const { el } = setup({ readyState: 1 });
    expect(el.currentTime).toBe(120);
  });

  it("resumes from the watched frontier after a forward skip", () => {
    const { el, fire } = setup({
      video: { ...video, positionSeconds: 590, watchedSeconds: 100 },
    });
    fire("loadedmetadata");
    expect(el.currentTime).toBe(100);
  });

  it("stops the interval on pause and ignores events after unmount", () => {
    const { el, fire, tick, view } = setup();
    fire("loadedmetadata");
    fire("play");
    el.currentTime = 121;
    fire("timeupdate");
    fire("pause");
    expect(save).toHaveBeenCalledTimes(1);
    el.currentTime = 122;
    fire("timeupdate");
    tick(30_000);
    expect(save).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(save).toHaveBeenCalledTimes(2);
    el.currentTime = 150;
    fire("pause");
    fire("ended");
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("invalidates the my-videos list on unmount", async () => {
    const { view, invalidate, fire, el } = setup();
    fire("loadedmetadata");
    el.currentTime = 121;
    fire("timeupdate");
    view.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: videoKeys.allMine,
    });
  });
});
