import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { useClasses } from "@/features/classes";
import {
  useAdminVideo,
  useDeleteVideo,
  useRoster,
  useUpdateVideo,
} from "../state/useAdminVideos";
import { AdminVideoDetailScreen } from "./AdminVideoDetailScreen";

const push = vi.fn();
let search = new URLSearchParams("id=v1");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search,
}));
vi.mock("@/features/classes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/classes")>()),
  useClasses: vi.fn(),
}));
vi.mock("../state/useAdminVideos");

const video = vi.mocked(useAdminVideo);
const roster = vi.mocked(useRoster);
const update = vi.mocked(useUpdateVideo);
const del = vi.mocked(useDeleteVideo);
const classes = vi.mocked(useClasses);
const updateAsync = vi.fn(async () => {});
const deleteAsync = vi.fn(async () => ({ fileRemoved: true }));

const fetched = (data: unknown) =>
  ({
    data,
    isPending: false,
    isError: false,
    error: null,
    isFetchedAfterMount: true,
  }) as unknown as ReturnType<typeof useAdminVideo>;

const current = {
  id: "v1",
  classId: "c1",
  title: "1단원",
  storagePath: "c1/x.mp4",
  durationSeconds: 600,
  publishedAt: "2026-11-04T00:00:00+09:00",
  views: [
    { studentId: "s2", watchedSeconds: 600, updatedAt: "2026-11-04T01:30:00Z" },
  ],
};

const ui = () => (
  <ToastProvider>
    <AdminVideoDetailScreen />
  </ToastProvider>
);

describe("AdminVideoDetailScreen", () => {
  beforeEach(() => {
    push.mockReset();
    updateAsync.mockClear();
    deleteAsync.mockClear();
    search = new URLSearchParams("id=v1");
    video.mockReturnValue(fetched(current));
    classes.mockReturnValue({
      data: [{ id: "c1", name: "A반" }],
    } as unknown as ReturnType<typeof useClasses>);
    roster.mockReturnValue({
      data: [
        { studentId: "s1", name: "가" },
        { studentId: "s2", name: "나" },
      ],
      isError: false,
    } as unknown as ReturnType<typeof useRoster>);
    update.mockReturnValue({
      mutateAsync: updateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateVideo>);
    del.mockReturnValue({
      mutateAsync: deleteAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteVideo>);
  });

  it("shows watch status with a not-watched row", () => {
    render(ui());
    expect(
      screen.getByRole("heading", { level: 1, name: "1단원" }),
    ).toBeInTheDocument();
    expect(screen.getByText("다 본 학생 1/2명")).toBeInTheDocument();
    expect(screen.getByText("아직 안 봤어요")).toBeInTheDocument();
    expect(screen.getByText("11/4 10:30")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("rejects a 101 character title without saving", async () => {
    render(ui());
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "가".repeat(101) },
    });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(
      await screen.findByText("제목은 100자까지 쓸 수 있어요."),
    ).toBeInTheDocument();
    expect(updateAsync).not.toHaveBeenCalled();
  });

  it("saves title and published date", async () => {
    render(ui());
    const title = screen.getByLabelText(/제목/);
    await userEvent.clear(title);
    await userEvent.type(title, "새 제목");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1));
    expect(updateAsync).toHaveBeenCalledWith({
      id: "v1",
      patch: { title: "새 제목", publishedAt: undefined },
    });
    expect(await screen.findByText("저장했어요.")).toBeInTheDocument();
  });

  it("sends published_at only when the date changed", async () => {
    render(ui());
    fireEvent.change(screen.getByLabelText(/공개일/), {
      target: { value: "2026-11-10" },
    });
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1));
    expect(updateAsync).toHaveBeenCalledWith({
      id: "v1",
      patch: { title: "1단원", publishedAt: "2026-11-10T00:00:00+09:00" },
    });
  });

  it("shows the error and stays when the delete is not applied", async () => {
    deleteAsync.mockRejectedValueOnce(new SaveNotAppliedError());
    render(ui());
    await userEvent.click(screen.getByRole("button", { name: "영상 지우기" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "지우기" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "저장하지 못했어요",
    );
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText("영상을 지웠어요.")).toBeNull();
  });

  it("confirms, deletes once, then goes back to the class list", async () => {
    render(ui());
    await userEvent.click(screen.getByRole("button", { name: "영상 지우기" }));
    expect(
      await screen.findByRole("dialog", { name: "이 영상을 지울까요?" }),
    ).toBeInTheDocument();
    expect(deleteAsync).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "지우기" }));
    await waitFor(() => expect(deleteAsync).toHaveBeenCalledTimes(1));
    expect(deleteAsync).toHaveBeenCalledWith({
      id: "v1",
      storagePath: "c1/x.mp4",
    });
    expect(push).toHaveBeenCalledWith("/admin/videos?class=c1");
    expect(await screen.findByText("영상을 지웠어요.")).toBeInTheDocument();
  });

  it("tells when the file could not be removed", async () => {
    deleteAsync.mockResolvedValueOnce({ fileRemoved: false });
    render(ui());
    await userEvent.click(screen.getByRole("button", { name: "영상 지우기" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "지우기" }),
    );
    expect(
      await screen.findByText(
        "영상은 지웠어요. 파일 정리는 실패했지만 학생에게는 보이지 않아요.",
      ),
    ).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/admin/videos?class=c1");
  });

  it("shows not-found copy for an unknown id", () => {
    video.mockReturnValue(fetched(null));
    render(ui());
    expect(
      screen.getByText("영상을 찾을 수 없어요. 목록에서 다시 골라 주세요."),
    ).toBeInTheDocument();
  });
});
