import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyVideo } from "@/features/videos";
import {
  buildLinkOptions,
  initialLinkValue,
  parseLinkValue,
} from "../model/linkOptions";

const h = vi.hoisted(() => ({
  submit: vi.fn(),
  show: vi.fn(),
  videos: [] as unknown[],
  sessions: [] as unknown[],
}));
vi.mock("../data/questions", () => ({
  askQuestion: (...a: unknown[]) => h.submit(...a),
  listRecentSessions: () => Promise.resolve(h.sessions),
}));
vi.mock("@/features/videos", () => ({
  useMyVideos: () => ({ data: h.videos }),
}));
vi.mock("@/design-system", async (orig) => ({
  ...(await orig<typeof import("@/design-system")>()),
  useToast: () => ({ show: h.show, dismiss: vi.fn() }),
}));

import { QuestionForm } from "./QuestionForm";

function render(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const video = (id: string, title: string) => ({ id, title }) as MyVideo;
const sessions = [{ id: "s1", date: "2026-11-04", className: "A반" }];

describe("link options", () => {
  it("builds labels and values", () => {
    expect(buildLinkOptions([video("v1", "1단원")], sessions)).toEqual([
      { value: "", label: "연결 안 함" },
      { value: "video:v1", label: "영상 · 1단원" },
      { value: "session:s1", label: "수업 · 11/4(수) A반" },
    ]);
  });
  it("parses values", () => {
    expect(parseLinkValue("video:v1")).toEqual({
      videoId: "v1",
      sessionId: null,
    });
    expect(parseLinkValue("session:s1")).toEqual({
      videoId: null,
      sessionId: "s1",
    });
    expect(parseLinkValue("")).toEqual({ videoId: null, sessionId: null });
  });
  it("picks an initial value only when listed", () => {
    const opts = buildLinkOptions([video("v1", "t")], sessions);
    expect(initialLinkValue({ video: "v1", session: null }, opts)).toBe(
      "video:v1",
    );
    expect(initialLinkValue({ video: "v9", session: null }, opts)).toBe("");
    expect(initialLinkValue({ video: null, session: "s1" }, opts)).toBe(
      "session:s1",
    );
  });
});

beforeEach(() => {
  h.submit.mockReset();
  h.submit.mockResolvedValue(undefined);
  h.show.mockReset();
  h.videos = [video("v1", "1단원")];
  h.sessions = sessions;
});

describe("QuestionForm", () => {
  it("rejects an empty body without submitting", async () => {
    const user = userEvent.setup();
    render(
      <QuestionForm
        studentId="s"
        initialLink={{ video: null, session: null }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "질문 보내기" }));
    expect(await screen.findByText("내용을 입력해 주세요.")).toBeVisible();
    expect(h.submit).not.toHaveBeenCalled();
  });

  it("sends the parsed link and clears the body but keeps the link", async () => {
    const user = userEvent.setup();
    render(
      <QuestionForm
        studentId="s"
        initialLink={{ video: "v1", session: null }}
      />,
    );
    await user.type(screen.getByLabelText("질문 내용"), "모르겠어요");
    await user.click(screen.getByRole("button", { name: "질문 보내기" }));
    await screen.findByDisplayValue("");
    expect(h.submit).toHaveBeenCalledWith({
      body: "모르겠어요",
      videoId: "v1",
      sessionId: null,
    });
    expect(screen.getByLabelText("질문 내용")).toHaveValue("");
    expect(screen.getByLabelText("무엇에 대한 질문인가요?")).toHaveValue(
      "video:v1",
    );
    expect(h.show).toHaveBeenCalledWith({
      tone: "success",
      message: "질문을 보냈어요. 원장님이 답하면 여기에 보여요.",
    });
  });

  it("keeps text typed while the send was in flight", async () => {
    const user = userEvent.setup();
    let release: (v?: unknown) => void = () => {};
    h.submit.mockReturnValue(new Promise((r) => (release = r)));
    render(
      <QuestionForm
        studentId="s"
        initialLink={{ video: null, session: null }}
      />,
    );
    const box = screen.getByLabelText("질문 내용");
    await user.type(box, "첫 질문");
    await user.click(screen.getByRole("button", { name: "질문 보내기" }));
    await user.type(box, " 추가");
    release();
    await screen.findByDisplayValue("첫 질문 추가");
  });

  it("ignores a second submit while pending", async () => {
    const user = userEvent.setup();
    let release: (v?: unknown) => void = () => {};
    h.submit.mockImplementation(() => new Promise((r) => (release = r)));
    render(
      <QuestionForm
        studentId="s"
        initialLink={{ video: null, session: null }}
      />,
    );
    await user.type(screen.getByLabelText("질문 내용"), "질문");
    const btn = screen.getByRole("button", { name: "질문 보내기" });
    await user.click(btn);
    await user.click(btn);
    expect(h.submit).toHaveBeenCalledTimes(1);
    release();
  });

  it("shows the server message verbatim on failure", async () => {
    const user = userEvent.setup();
    h.submit.mockRejectedValue({
      code: "P0001",
      message: "내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.",
    });
    render(
      <QuestionForm
        studentId="s"
        initialLink={{ video: null, session: null }}
      />,
    );
    await user.type(screen.getByLabelText("질문 내용"), "질문");
    await user.click(screen.getByRole("button", { name: "질문 보내기" }));
    expect(h.show).toHaveBeenCalledWith({
      tone: "danger",
      message: "내 반 영상이나 수업만 연결할 수 있어요. 다시 골라 주세요.",
    });
    expect(screen.getByLabelText("질문 내용")).toHaveValue("질문");
  });
});
