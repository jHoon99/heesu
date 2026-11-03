import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { getStudent, updateStudent } from "../data/students";
import type { StudentSummary } from "../model/students";
import { StudentEditScreen } from "./StudentEditScreen";

const push = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search,
}));
vi.mock("../data/students");
const get = vi.mocked(getStudent);
const update = vi.mocked(updateStudent);

const UUID = "6f1c2b3a-1111-4222-8333-444455556666";
const NOT_FOUND = "학생을 찾을 수 없어요. 목록에서 다시 골라 주세요.";
const student: StudentSummary = {
  id: UUID,
  loginId: "haneul",
  name: "김하늘",
  grade: "중1",
  status: "active",
  joinedAt: "2026-11-05",
  school: null,
  classes: [],
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <StudentEditScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("StudentEditScreen", () => {
  beforeEach(() => {
    push.mockReset();
    get.mockReset();
    update.mockReset();
    search = new URLSearchParams(`id=${UUID}`);
    get.mockResolvedValue(student);
    update.mockResolvedValue(undefined);
  });

  it.each([[""], ["id=x"]])("shows the not-found card for %j", (qs) => {
    search = new URLSearchParams(qs);
    setup();
    expect(screen.getByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "학생 목록으로" })).toHaveAttribute(
      "href",
      "/admin/students",
    );
    expect(get).not.toHaveBeenCalled();
  });

  it("saves name and grade changes and goes to the detail", async () => {
    const user = setup();
    const name = await screen.findByLabelText(/이름/);
    await user.clear(name);
    await user.type(name, "김하늘2");
    await user.selectOptions(screen.getByLabelText("학년"), "중2");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/admin/students/detail?id=${UUID}`),
    );
    expect(update).toHaveBeenCalledWith(UUID, {
      name: "김하늘2",
      grade: "중2",
      status: "active",
      joinedAt: "2026-11-05",
    });
  });

  it("asks for confirmation before marking 퇴원", async () => {
    const user = setup();
    await user.click(await screen.findByRole("radio", { name: "퇴원" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("퇴원 처리할까요?")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "퇴원 처리" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[1]).toMatchObject({ status: "left" });
  });

  it("keeps the form when the modal is cancelled", async () => {
    const user = setup();
    await user.click(await screen.findByRole("radio", { name: "퇴원" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("퇴원 처리할까요?");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("퇴원 처리할까요?")).not.toBeInTheDocument(),
    );
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "퇴원" })).toBeChecked();
  });

  it("shows the not-applied message", async () => {
    update.mockRejectedValue(new SaveNotAppliedError());
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "저장하지 못했어요. 다시 로그인하거나 새로고침해 주세요.",
    );
  });
});
