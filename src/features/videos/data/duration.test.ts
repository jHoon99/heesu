import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readVideoDuration } from "./duration";

const MESSAGE = "영상 길이를 읽지 못했어요. mp4 파일이 맞는지 확인해 주세요.";

class FakeVideo extends EventTarget {
  duration = NaN;
  preload = "";
  muted = false;
  src = "";
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
  load() {}
}

let video: FakeVideo;
const create = vi.fn(() => "blob:fake");
const revoke = vi.fn();
const file = new File(["x"], "a.mp4", { type: "video/mp4" });

describe("readVideoDuration", () => {
  beforeEach(() => {
    video = new FakeVideo();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) =>
      tag === "video"
        ? (video as unknown as HTMLVideoElement)
        : realCreate(tag)) as typeof document.createElement);
    create.mockClear();
    revoke.mockClear();
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("rounds the metadata duration and revokes the url", async () => {
    const p = readVideoDuration(file);
    expect(video.preload).toBe("metadata");
    expect(video.src).toBe("blob:fake");
    video.duration = 12.6;
    video.dispatchEvent(new Event("loadedmetadata"));
    await expect(p).resolves.toBe(13);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:fake");
  });

  it("is at least 1 second", async () => {
    const p = readVideoDuration(file);
    video.duration = 0.2;
    video.dispatchEvent(new Event("loadedmetadata"));
    await expect(p).resolves.toBe(1);
  });

  it("rejects a non-finite duration", async () => {
    const p = readVideoDuration(file);
    video.duration = Infinity;
    video.dispatchEvent(new Event("loadedmetadata"));
    await expect(p).rejects.toThrow(MESSAGE);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it("rejects on a media error and revokes", async () => {
    const p = readVideoDuration(file);
    video.dispatchEvent(new Event("error"));
    await expect(p).rejects.toThrow(MESSAGE);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it("times out after 15 seconds", async () => {
    vi.useFakeTimers();
    const p = readVideoDuration(file);
    const assertion = expect(p).rejects.toThrow(MESSAGE);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
    expect(revoke).toHaveBeenCalledTimes(1);
  });
});
