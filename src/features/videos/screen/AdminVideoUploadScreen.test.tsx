import type React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { useClasses } from "@/features/classes";
import { readVideoDuration } from "../data/duration";
import { useUploadVideo, type UploadState } from "../state/useUploadVideo";
import { AdminVideoUploadScreen } from "./AdminVideoUploadScreen";

const push = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search,
}));
vi.mock("@/features/classes", () => ({ useClasses: vi.fn() }));
vi.mock("../data/duration");
vi.mock("../state/useUploadVideo");

const classes = vi.mocked(useClasses);
const duration = vi.mocked(readVideoDuration);
const upload = vi.mocked(useUploadVideo);
const start = vi.fn(async () => {});
const cancel = vi.fn(async () => {});

const idle: UploadState = {
  phase: "idle",
  sent: 0,
  total: 0,
  error: null,
  videoId: null,
};

function withState(state: Partial<UploadState>) {
  upload.mockReturnValue({ state: { ...idle, ...state }, start, cancel });
}

const mp4 = new File(["x".repeat(2048)], "lesson.mp4", { type: "video/mp4" });

const ui = () => (
  <ToastProvider>
    <AdminVideoUploadScreen />
  </ToastProvider>
);

let rerender: (node: React.ReactElement) => void = () => {};
function setup() {
  rerender = render(ui()).rerender;
  return userEvent.setup({ applyAccept: false });
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/제목/), " 1단원 ");
  await user.selectOptions(screen.getByLabelText(/^반/), "c1");
  await user.upload(screen.getByLabelText(/영상 파일/), mp4);
  await screen.findByText(/길이 12:40/);
}

describe("AdminVideoUploadScreen", () => {
  beforeEach(() => {
    push.mockReset();
    start.mockClear();
    cancel.mockClear();
    duration.mockReset();
    duration.mockResolvedValue(760);
    search = new URLSearchParams();
    classes.mockReturnValue({
      data: [
        { id: "c1", name: "A반" },
        { id: "c2", name: "B반" },
      ],
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useClasses>);
    withState({});
  });

  it("rejects a non-mp4 file and keeps the upload button disabled", async () => {
    const user = setup();
    expect(
      screen.getByRole("heading", { name: "영상 올리기" }),
    ).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText(/영상 파일/),
      new File(["x"], "a.mov", { type: "video/quicktime" }),
    );
    expect(
      await screen.findByText(
        "mp4 파일만 올릴 수 있어요. 파일 형식을 확인해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "올리기" })).toBeDisabled();
    expect(duration).not.toHaveBeenCalled();
  });

  it("shows the duration and size of an mp4 file", async () => {
    const user = setup();
    await user.upload(screen.getByLabelText(/영상 파일/), mp4);
    expect(await screen.findByText(/길이 12:40/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "올리기" })).toBeEnabled();
  });

  it("shows the duration error on the file field", async () => {
    duration.mockRejectedValue(
      new Error("영상 길이를 읽지 못했어요. mp4 파일이 맞는지 확인해 주세요."),
    );
    const user = setup();
    await user.upload(screen.getByLabelText(/영상 파일/), mp4);
    expect(
      await screen.findByText(
        "영상 길이를 읽지 못했어요. mp4 파일이 맞는지 확인해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "올리기" })).toBeDisabled();
  });

  it("requires a title", async () => {
    const user = setup();
    await user.selectOptions(screen.getByLabelText(/^반/), "c1");
    await user.upload(screen.getByLabelText(/영상 파일/), mp4);
    await screen.findByText(/길이 12:40/);
    await user.click(screen.getByRole("button", { name: "올리기" }));
    expect(
      await screen.findByText("제목을 입력해 주세요."),
    ).toBeInTheDocument();
    expect(start).not.toHaveBeenCalled();
  });

  it("defaults the class from the query and starts the upload", async () => {
    search = new URLSearchParams("class=c2");
    const user = setup();
    expect(screen.getByLabelText(/^반/)).toHaveValue("c2");
    expect((screen.getByLabelText(/공개일/) as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    await user.type(screen.getByLabelText(/제목/), " 1단원 ");
    await user.upload(screen.getByLabelText(/영상 파일/), mp4);
    await screen.findByText(/길이 12:40/);
    await user.click(screen.getByRole("button", { name: "올리기" }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        file: mp4,
        classId: "c2",
        title: "1단원",
        durationSeconds: 760,
      }),
    );
  });

  it("shows progress and cancel while uploading", async () => {
    const user = setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "올리기" }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    withState({ phase: "uploading", sent: 3 * 1048576, total: 10 * 1048576 });
    rerender(ui());
    const bar = await screen.findByRole("progressbar", { name: "업로드 진행" });
    expect(bar).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByText("30% · 3.0/10.0MB")).toBeInTheDocument();
    expect(screen.getByLabelText(/제목/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "올리기" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("shows the error and retries with the same input", async () => {
    const user = setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "올리기" }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    withState({ phase: "error", error: "인터넷 연결이 끊겼어요." });
    rerender(ui());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "인터넷 연결이 끊겼어요.",
    );
    expect(screen.queryByRole("button", { name: "올리기" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "다시 올리기" }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[1]).toEqual(start.mock.calls[0]);
  });

  it("shows one primary button at a time", () => {
    const primaries = () =>
      screen
        .queryAllByRole("button")
        .filter((b) => b.className.split(" ").includes("bg-primary"));
    setup();
    expect(primaries()).toHaveLength(1);
    withState({ phase: "error", error: "x" });
    rerender(ui());
    expect(primaries()).toHaveLength(1);
    withState({ phase: "uploading", sent: 1, total: 2 });
    rerender(ui());
    expect(primaries()).toHaveLength(0);
  });

  it("toasts and goes to the uploaded class list when done", async () => {
    const user = setup();
    await fill(user);
    await user.click(screen.getByRole("button", { name: "올리기" }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    withState({ phase: "done", videoId: "v1" });
    rerender(ui());
    expect(await screen.findByText("영상을 올렸어요.")).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/admin/videos?class=c1");
  });
});
