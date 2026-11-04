import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { removeVideoObject, startVideoUpload } from "../data/upload";
import { createVideo } from "../data/videos";
import { videoKeys } from "./keys";
import { useUploadVideo } from "./useUploadVideo";

vi.mock("../data/upload");
vi.mock("../data/videos");
const startUpload = vi.mocked(startVideoUpload);
const remove = vi.mocked(removeVideoObject);
const create = vi.mocked(createVideo);

const file = new File(["0123456789"], "a.mp4", { type: "video/mp4" });
const input = {
  file,
  classId: "c1",
  title: "1단원",
  publishedDate: "2026-11-09",
  durationSeconds: 13,
};

type Progress = (sent: number, total: number) => void;

function deferred<T>() {
  let resolve: (v: T) => void = () => {};
  let reject: (e: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mockUpload() {
  const d = deferred<string>();
  const abort = vi.fn(async () => {});
  let progress: Progress = () => {};
  startUpload.mockImplementation((_f, _c, onProgress) => {
    progress = onProgress;
    return { done: d.promise, abort };
  });
  return { d, abort, progress: (s: number, t: number) => progress(s, t) };
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useUploadVideo(), { wrapper });
  return { hook, invalidate };
}

describe("useUploadVideo", () => {
  beforeEach(() => {
    startUpload.mockReset();
    remove.mockReset();
    create.mockReset();
  });

  it("uploads, saves the row and invalidates videos", async () => {
    const up = mockUpload();
    create.mockResolvedValue({ id: "v1" });
    const { hook, invalidate } = setup();
    let started: Promise<void> = Promise.resolve();
    act(() => {
      started = hook.result.current.start(input);
    });
    expect(hook.result.current.state.phase).toBe("uploading");
    expect(startUpload).toHaveBeenCalledWith(file, "c1", expect.any(Function));
    act(() => up.progress(3, 10));
    expect(hook.result.current.state).toMatchObject({ sent: 3, total: 10 });
    up.d.resolve("c1/x.mp4");
    await act(() => started);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      classId: "c1",
      title: "1단원",
      storagePath: "c1/x.mp4",
      publishedAt: "2026-11-09T00:00:00+09:00",
      durationSeconds: 13,
    });
    expect(hook.result.current.state).toMatchObject({
      phase: "done",
      videoId: "v1",
      error: null,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: videoKeys.all });
  });

  it("removes the uploaded object when the row insert fails", async () => {
    const up = mockUpload();
    create.mockRejectedValue({ code: "23514" });
    remove.mockResolvedValue();
    const { hook } = setup();
    up.d.resolve("c1/x.mp4");
    await act(() => hook.result.current.start(input));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("c1/x.mp4");
    expect(hook.result.current.state.phase).toBe("error");
    expect(hook.result.current.state.error).toContain("올린 파일은 지웠어요.");
  });

  it("warns with a toast when the cleanup also fails", async () => {
    const up = mockUpload();
    create.mockRejectedValue({ code: "23514" });
    remove.mockRejectedValue(new Error("x"));
    const { hook } = setup();
    up.d.resolve("c1/x.mp4");
    await act(() => hook.result.current.start(input));
    expect(hook.result.current.state.phase).toBe("error");
    expect(hook.result.current.state.error).not.toContain("지웠어요");
    expect(
      await screen.findByText(/올린 파일을 지우지 못했어요/),
    ).toBeInTheDocument();
  });

  it("shows the upload error and does not insert", async () => {
    const up = mockUpload();
    const { hook } = setup();
    up.d.reject({
      originalResponse: { getStatus: () => 413, getBody: () => "" },
    });
    await act(() => hook.result.current.start(input));
    expect(hook.result.current.state).toMatchObject({
      phase: "error",
      error: "파일이 너무 커요. 영상을 나누거나 화질을 낮춰 다시 올려 주세요.",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("ignores a second start while uploading", async () => {
    mockUpload();
    const { hook } = setup();
    act(() => {
      void hook.result.current.start(input);
    });
    act(() => {
      void hook.result.current.start(input);
    });
    expect(startUpload).toHaveBeenCalledTimes(1);
  });

  it("cancel aborts and returns to idle", async () => {
    const up = mockUpload();
    const { hook } = setup();
    act(() => {
      void hook.result.current.start(input);
    });
    await act(() => hook.result.current.cancel());
    expect(up.abort).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state.phase).toBe("idle");
    // 취소 뒤 늦게 온 결과는 무시해요.
    up.d.resolve("c1/x.mp4");
    await waitFor(() => expect(hook.result.current.state.phase).toBe("idle"));
    expect(create).not.toHaveBeenCalled();
  });

  it("warns before leaving while uploading", () => {
    mockUpload();
    const { hook } = setup();
    act(() => {
      void hook.result.current.start(input);
    });
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
