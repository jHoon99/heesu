import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useClasses } from "@/features/classes";
import { useAdminVideos, useRoster } from "../state/useAdminVideos";
import { AdminVideoListScreen } from "./AdminVideoListScreen";

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => search,
}));
vi.mock("@/features/classes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/classes")>()),
  useClasses: vi.fn(),
}));
vi.mock("../state/useAdminVideos");

const classes = vi.mocked(useClasses);
const videos = vi.mocked(useAdminVideos);
const roster = vi.mocked(useRoster);

const ok = (data: unknown) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
});

const video = (over: Record<string, unknown>) => ({
  id: "v1",
  classId: "c1",
  title: "1단원",
  storagePath: "c1/x.mp4",
  durationSeconds: 600,
  publishedAt: "2026-11-04T00:00:00+09:00",
  views: [],
  ...over,
});

describe("AdminVideoListScreen", () => {
  beforeEach(() => {
    replace.mockReset();
    search = new URLSearchParams();
    classes.mockReturnValue(
      ok([
        { id: "c1", name: "A반" },
        { id: "c2", name: "B반" },
      ]) as unknown as ReturnType<typeof useClasses>,
    );
    roster.mockReturnValue(
      ok([
        { studentId: "s1", name: "가" },
        { studentId: "s2", name: "나" },
        { studentId: "s3", name: "다" },
      ]) as unknown as ReturnType<typeof useRoster>,
    );
    videos.mockReturnValue(
      ok([
        video({
          views: [
            {
              studentId: "s1",
              watchedSeconds: 600,
              updatedAt: "2026-11-04T01:00:00Z",
            },
            {
              studentId: "s2",
              watchedSeconds: 100,
              updatedAt: "2026-11-04T01:00:00Z",
            },
          ],
        }),
        video({
          id: "v2",
          title: "2단원",
          publishedAt: "2999-01-01T00:00:00+09:00",
        }),
      ]) as unknown as ReturnType<typeof useAdminVideos>,
    );
  });

  it("switches class tabs through router.replace", async () => {
    render(<AdminVideoListScreen />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    await userEvent.click(screen.getByRole("tab", { name: "B반" }));
    expect(replace).toHaveBeenCalledWith("/admin/videos?class=c2");
  });

  it("shows the scheduled badge, complete count and detail link", () => {
    render(<AdminVideoListScreen />);
    expect(screen.getAllByText("공개 예정")).toHaveLength(1);
    expect(screen.getByText("다 본 학생 1/3명")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1단원" })).toHaveAttribute(
      "href",
      "/admin/videos/detail?id=v1",
    );
    expect(screen.getByText(/^11\/4\(/)).toBeInTheDocument();
  });

  it("links the upload button with the selected class", () => {
    search = new URLSearchParams("class=c2");
    render(<AdminVideoListScreen />);
    expect(screen.getByRole("link", { name: "영상 올리기" })).toHaveAttribute(
      "href",
      "/admin/videos/new?class=c2",
    );
  });

  it("shows the empty copy", () => {
    videos.mockReturnValue(
      ok([]) as unknown as ReturnType<typeof useAdminVideos>,
    );
    render(<AdminVideoListScreen />);
    expect(
      screen.getByText(
        "이 반에 올린 영상이 없어요. '영상 올리기'로 첫 영상을 올려 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("asks to create a class first when there are none", () => {
    classes.mockReturnValue(ok([]) as unknown as ReturnType<typeof useClasses>);
    videos.mockReturnValue(
      ok(undefined) as unknown as ReturnType<typeof useAdminVideos>,
    );
    render(<AdminVideoListScreen />);
    expect(screen.getByText("먼저 반을 만들어 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "반 관리로" })).toHaveAttribute(
      "href",
      "/admin/classes",
    );
  });
});
