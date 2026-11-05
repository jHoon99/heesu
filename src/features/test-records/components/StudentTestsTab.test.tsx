import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import {
  addTestResult,
  deleteTestResult,
  listTestResults,
} from "../data/testRecords";
import { StudentTestsTab } from "./StudentTestsTab";

vi.mock("../data/testRecords");
const list = vi.mocked(listTestResults);
const add = vi.mocked(addTestResult);
const del = vi.mocked(deleteTestResult);

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <StudentTestsTab studentId="s1" />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("StudentTestsTab", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    list.mockResolvedValue([]);
    add.mockResolvedValue(undefined);
    del.mockResolvedValue(undefined);
  });

  it("adds a result", async () => {
    const user = setup();
    expect(
      await screen.findByText(
        "아직 테스트 기록이 없어요. 아래에서 결과를 추가해 주세요.",
      ),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("종류"), "grammar");
    await user.type(screen.getByLabelText("제목"), "시제");
    await user.type(screen.getByLabelText("점수"), "7");
    await user.type(screen.getByLabelText("만점"), "10");
    await user.click(screen.getByRole("button", { name: "추가" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0]?.[0]).toBe("s1");
    expect(add.mock.calls[0]?.[1]).toMatchObject({
      kind: "grammar",
      title: "시제",
      score: 7,
      maxScore: 10,
      passScore: 8,
      memo: null,
    });
    expect(
      await screen.findByText(
        "테스트 결과를 추가했어요. 기준보다 낮아서 클리닉에 넣었어요.",
      ),
    ).toBeInTheDocument();
  });

  it("fills 80% as the pass score until it is changed by hand", async () => {
    const user = setup();
    const max = await screen.findByLabelText("만점");
    const pass = screen.getByLabelText("통과 기준");
    await user.type(max, "25");
    expect(pass).toHaveValue("20");
    await user.clear(pass);
    await user.type(max, "0");
    expect(pass).toHaveValue("");
    await user.type(screen.getByLabelText("제목"), "Day 1");
    await user.type(screen.getByLabelText("점수"), "3");
    await user.click(screen.getByRole("button", { name: "추가" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0]?.[1]).toMatchObject({
      maxScore: 250,
      passScore: null,
    });
    expect(
      await screen.findByText("테스트 결과를 추가했어요."),
    ).toBeInTheDocument();
  });

  it("does not add when the score is above the max", async () => {
    const user = setup();
    await user.type(await screen.findByLabelText("제목"), "Day 1");
    await user.type(screen.getByLabelText("점수"), "21");
    await user.type(screen.getByLabelText("만점"), "20");
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(
      await screen.findByText(
        "점수가 만점보다 클 수 없어요. 숫자를 확인해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });

  it("lists results and deletes after a confirm", async () => {
    list.mockResolvedValue([
      {
        id: "t1",
        takenOn: "2026-11-05",
        kind: "word",
        title: "Day 12",
        score: 18,
        maxScore: 20,
        passScore: 16,
        memo: null,
      },
    ]);
    const user = setup();
    expect(await screen.findByText("18/20 (90%)")).toBeInTheDocument();
    expect(screen.getByText("기준 16")).toBeInTheDocument();
    expect(screen.queryByText("재시험")).toBeNull();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(del).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "지우기" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("t1"));
  });
});
