import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMyVideo, usePlaybackUrl } from "../state/useMyVideos";
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
  watchedSeconds: 60,
  positionSeconds: 60,
};

function setVideo(data: unknown) {
  myVideo.mockReturnValue({
    data,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useMyVideo>);
}

describe("VideoPlayerScreen", () => {
  beforeEach(() => {
    refresh.mockReset();
    setVideo(video);
    playback.mockReturnValue({
      url: "https://s/v.mp4",
      isError: false,
      refresh,
    });
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

  it("explains when the video is missing", () => {
    setVideo(null);
    playback.mockReturnValue({ url: null, isError: false, refresh });
    render(<VideoPlayerScreen />);
    expect(
      screen.getByText("영상을 찾을 수 없어요. 목록에서 다시 골라 주세요."),
    ).toBeInTheDocument();
  });
});
