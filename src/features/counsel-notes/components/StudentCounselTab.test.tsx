import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import {
  addCounselNote,
  deleteCounselNote,
  listCounselNotes,
} from "../data/counselNotes";
import { StudentCounselTab } from "./StudentCounselTab";

vi.mock("../data/counselNotes");
const list = vi.mocked(listCounselNotes);
const add = vi.mocked(addCounselNote);
const del = vi.mocked(deleteCounselNote);

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <StudentCounselTab studentId="s1" />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("StudentCounselTab", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    list.mockResolvedValue([]);
    add.mockResolvedValue(undefined);
    del.mockResolvedValue(undefined);
  });

  it("adds a note with the default method and party", async () => {
    const user = setup();
    await user.type(await screen.findByLabelText("내용"), " 숙제 양 조절 ");
    await user.click(screen.getByRole("button", { name: "추가" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0]?.[1]).toMatchObject({
      method: "phone",
      party: "guardian",
      body: "숙제 양 조절",
    });
    expect(
      await screen.findByText("상담 기록을 추가했어요."),
    ).toBeInTheDocument();
  });

  it("requires the body", async () => {
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "추가" }));
    expect(
      await screen.findByText("상담 내용을 1~2000자로 입력해 주세요."),
    ).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });

  it("lists notes with labels and deletes after a confirm", async () => {
    list.mockResolvedValue([
      {
        id: "n1",
        counseledOn: "2026-11-05",
        method: "kakao",
        party: "student",
        body: "첫 줄\n둘째 줄",
      },
    ]);
    const user = setup();
    const row = (await screen.findByText(/첫 줄/)).closest("li") as HTMLElement;
    expect(within(row).getByText("카톡")).toBeInTheDocument();
    expect(within(row).getByText("학생")).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "지우기" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("n1"));
  });
});
