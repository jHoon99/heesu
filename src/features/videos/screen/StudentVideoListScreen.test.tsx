import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMyVideos } from "../state/useMyVideos";
import { StudentVideoListScreen } from "./StudentVideoListScreen";

vi.mock("@/features/auth", () => ({
  useMyStudent: () => ({ data: { id: "st1" } }),
}));
vi.mock("../state/useMyVideos");
const videos = vi.mocked(useMyVideos);

const v = (over: Record<string, unknown>) => ({
  id: "v1",
  classId: "c1",
  className: "A반",
  title: "1단원",
  storagePath: "c1/x.mp4",
  durationSeconds: 600,
  publishedAt: "2020-11-04T00:00:00+09:00",
  school: null,
  watchedSeconds: 0,
  positionSeconds: 0,
  ...over,
});

function setData(data: unknown) {
  videos.mockReturnValue({
    data,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useMyVideos>);
}

describe("StudentVideoListScreen", () => {
  beforeEach(() => {
    videos.mockReset();
  });

  it("links rows to the player and shows progress", () => {
    setData([
      v({ id: "v1", watchedSeconds: 600 }),
      v({ id: "v2", title: "2단원", watchedSeconds: 300 }),
    ]);
    render(<StudentVideoListScreen />);
    expect(screen.getByRole("link", { name: /1단원/ })).toHaveAttribute(
      "href",
      "/s/videos/watch?id=v1",
    );
    expect(screen.getByText("다 봤어요")).toBeInTheDocument();
    expect(screen.getByText("50% 봤어요")).toBeInTheDocument();
  });

  it("shows both empty messages", () => {
    setData([]);
    render(<StudentVideoListScreen />);
    expect(
      screen.getByText(
        "아직 올라온 수업 영상이 없어요. 원장님이 올리면 여기에 보여요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "아직 내 학교 내신 영상이 없어요. 올라오면 여기에 모여요.",
      ),
    ).toBeInTheDocument();
  });

  it("puts school-tagged videos in 내신 강의실", () => {
    setData([
      v({ id: "v1", title: "1단원" }),
      v({ id: "v2", title: "양현고 기출", school: "양현고" }),
    ]);
    render(<StudentVideoListScreen />);
    const school = screen.getByRole("region", { name: "내신 강의실" });
    expect(
      within(school).getByRole("link", { name: /양현고 기출/ }),
    ).toBeInTheDocument();
    expect(within(school).getByText(/양현고 내신 ·/)).toBeInTheDocument();
    const lessons = screen.getByRole("region", { name: "수업 영상" });
    expect(
      within(lessons).getByRole("link", { name: /1단원/ }),
    ).toBeInTheDocument();
    expect(within(lessons).queryByText(/양현고 기출/)).toBeNull();
  });
});
