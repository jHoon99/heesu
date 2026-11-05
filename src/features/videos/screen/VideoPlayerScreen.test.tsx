import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMyVideo, usePlaybackUrl } from "../state/useMyVideos";
import { useWatchProgress } from "../state/useWatchProgress";
import { VideoPlayerScreen } from "./VideoPlayerScreen";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("id=v1"),
}));
vi.mock("@/features/auth", () => ({
  useMyStudent: () => ({ data: { id: "st1" } }),
}));
vi.mock("../state/useMyVideos");
vi.mock("../state/useWatchProgress", () => ({ useWatchProgress: vi.fn() }));

const myVideo = vi.mocked(useMyVideo);
const playback = vi.mocked(usePlaybackUrl);
const refresh = vi.fn();

const video = {
  id: "v1",
  classId: "c1",
  className: "A반",
  title: "1단원",
  storagePath: "c1/x.mp4",
  durationSeconds: 600,
  publishedAt: "2026-11-04T00:00:00+09:00",
  school: null,
  watchedSeconds: 60,
  positionSeconds: 60,
};

function setVideo(data: unknown, isFetchedAfterMount = true) {
  myVideo.mockReturnValue({
    data,
    isFetchedAfterMount,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useMyVideo>);
}

describe("VideoPlayerScreen", () => {
  beforeEach(() => {
    refresh.mockReset();
    refresh.mockResolvedValue(null);
    setVideo(video);
    playback.mockReturnValue({
      url: "https://s/v.mp4",
      isError: false,
      refresh,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the player with the signed url and a question link", () => {
    const { container } = render(<VideoPlayerScreen />);
    const el = container.querySelector("video");
    expect(el).toHaveAttribute("src", "https://s/v.mp4");
    expect(el).toHaveAttribute("controls");
    expect(el).toHaveAttribute("playsinline");
    expect(screen.getByRole("link", { name: "질문하기" })).toHaveAttribute(
      "href",
      "/s/questions?video=v1",
    );
  });

  it("refreshes the url on the first error, then gives up", () => {
    const { container } = render(<VideoPlayerScreen />);
    const el = container.querySelector("video") as HTMLVideoElement;
    fireEvent.error(el);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/영상을 열 수 없어요/)).toBeNull();
    fireEvent.error(container.querySelector("video") as HTMLVideoElement);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/영상을 열 수 없어요/)).toBeInTheDocument();
  });

  it("allows another refresh after playback recovers", () => {
    const { container } = render(<VideoPlayerScreen />);
    const el = () => container.querySelector("video") as HTMLVideoElement;
    fireEvent.error(el());
    expect(refresh).toHaveBeenCalledTimes(1);
    fireEvent.playing(el());
    fireEvent.error(el());
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/영상을 열 수 없어요/)).toBeNull();
  });

  it("shows the live watched seconds from the progress hook", () => {
    vi.mocked(useWatchProgress).mockReturnValue(125);
    render(<VideoPlayerScreen />);
    expect(screen.getByText(/2:05 \/ 10:00 봤어요/)).toBeInTheDocument();
  });

  it("explains when the video is missing", () => {
    setVideo(null);
    playback.mockReturnValue({ url: null, isError: false, refresh });
    render(<VideoPlayerScreen />);
    expect(
      screen.getByText("영상을 찾을 수 없어요. 목록에서 다시 골라 주세요."),
    ).toBeInTheDocument();
  });

  it("does not render the player from stale cache before the fresh fetch", () => {
    setVideo(video, false);
    const { container } = render(<VideoPlayerScreen />);
    expect(container.querySelector("video")).toBeNull();
    expect(playback).toHaveBeenLastCalledWith(null);
  });

  it("counts two error events fired before a re-render", () => {
    const { container } = render(<VideoPlayerScreen />);
    const el = container.querySelector("video") as HTMLVideoElement;
    fireEvent.error(el);
    fireEvent.error(el);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/영상을 열 수 없어요/)).toBeInTheDocument();
  });

  it("reloads the element when the refreshed url is the same string", async () => {
    // 같은 초에 다시 발급하면 토큰이 같아 src가 안 바뀌어요 — 그때는 직접 다시 읽어요.
    const load = vi
      .spyOn(HTMLMediaElement.prototype, "load")
      .mockImplementation(() => {});
    refresh.mockResolvedValue("https://s/v.mp4");
    const { container } = render(<VideoPlayerScreen />);
    fireEvent.error(container.querySelector("video") as HTMLVideoElement);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    load.mockRestore();
  });

  it("lets the new src load by itself when the refreshed url differs", async () => {
    const load = vi
      .spyOn(HTMLMediaElement.prototype, "load")
      .mockImplementation(() => {});
    refresh.mockResolvedValue("https://s/v2.mp4");
    const { container } = render(<VideoPlayerScreen />);
    fireEvent.error(container.querySelector("video") as HTMLVideoElement);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(load).not.toHaveBeenCalled();
    load.mockRestore();
  });
});
