import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { saveSiteContent } from "../../data/saveSiteContent";
import type { EditableClass } from "../../model/siteContentWrite";
import { ClassesEditor } from "./ClassesEditor";
import { ContactEditor } from "./ContactEditor";
import { NoticeEditor } from "./NoticeEditor";
import { PointsGoalEditor } from "./PointsGoalEditor";

vi.mock("../../data/saveSiteContent");
const save = vi.mocked(saveSiteContent);

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

const cls = (n: string): EditableClass => ({
  name: n,
  grades: "",
  schedule: "",
  capacity: "",
});

beforeEach(() => {
  save.mockReset();
});

describe("ClassesEditor", () => {
  it("moves a row down and saves the new order", async () => {
    save.mockResolvedValue();
    const user = userEvent.setup();
    wrap(<ClassesEditor initial={[cls("A"), cls("B"), cls("C")]} />);
    await user.click(
      screen.getAllByRole("button", { name: "아래로 옮기기" })[0]!,
    );
    await user.click(screen.getByRole("button", { name: "반·시간표 저장" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const [key, value] = save.mock.calls[0]!;
    expect(key).toBe("classes");
    expect((value as { name: string }[]).map((c) => c.name)).toEqual([
      "B",
      "A",
      "C",
    ]);
  });

  it("disables add at 10 rows and deletes a row", async () => {
    const user = userEvent.setup();
    wrap(
      <ClassesEditor
        initial={Array.from({ length: 10 }, (_, i) => cls(`반${i}`))}
      />,
    );
    expect(screen.getByRole("button", { name: "반 추가" })).toBeDisabled();
    expect(
      screen.getByText("반은 10개까지 넣을 수 있어요."),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "이 반 지우기" })[0]!,
    );
    expect(screen.getAllByLabelText("반 이름")).toHaveLength(9);
    expect(screen.getByRole("button", { name: "반 추가" })).toBeEnabled();
  });

  it("shows a field error and does not save a blank name", async () => {
    const user = userEvent.setup();
    wrap(<ClassesEditor initial={[cls("")]} />);
    await user.click(screen.getByRole("button", { name: "반·시간표 저장" }));
    expect(
      await screen.findByText("반 이름을 입력해 주세요."),
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  it("saves once while pending and toasts on success", async () => {
    let resolve!: () => void;
    save.mockImplementation(() => new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    wrap(<PointsGoalEditor initial="30" />);
    const button = screen.getByRole("button", { name: "목표 저장" });
    await user.click(button);
    await user.click(button);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("points_goal", 30);
    await waitFor(() => expect(button).toBeDisabled());
    resolve();
    expect(await screen.findByText("랜딩에 반영했어요.")).toBeInTheDocument();
  });

  it("shows the failure in the card", async () => {
    save.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    wrap(<ContactEditor initial={{ phone: "", address: "" }} />);
    await user.click(screen.getByRole("button", { name: "연락처 저장" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("does not save an invalid phone", async () => {
    const user = userEvent.setup();
    wrap(<ContactEditor initial={{ phone: "", address: "" }} />);
    await user.type(screen.getByLabelText("전화번호"), "010-1234");
    await user.click(screen.getByRole("button", { name: "연락처 저장" }));
    expect(
      await screen.findByText(
        "전화번호는 063-000-0000처럼 숫자와 -로 입력해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("saves the notice shape", async () => {
    save.mockResolvedValue();
    const user = userEvent.setup();
    wrap(<NoticeEditor initial={{ title: "", body: "", visible: false }} />);
    await user.type(screen.getByLabelText("제목"), "설명회");
    await user.click(screen.getByLabelText("랜딩에 공지 띠 보이기"));
    await user.click(screen.getByRole("button", { name: "공지 저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("notice", {
        title: "설명회",
        body: null,
        visible: true,
      }),
    );
  });
});
