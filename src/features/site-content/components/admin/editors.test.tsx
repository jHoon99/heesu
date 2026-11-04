import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { saveSiteContent } from "../../data/saveSiteContent";
import { AboutEditor } from "./AboutEditor";
import { ContactEditor } from "./ContactEditor";
import { NoticeEditor } from "./NoticeEditor";
import { DEFAULT_POINTS_GOAL } from "../../model/siteContent";
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

beforeEach(() => {
  save.mockReset();
});

describe("saving", () => {
  it("shows the default goal as the placeholder", () => {
    wrap(<PointsGoalEditor initial="" />);
    expect(screen.getByLabelText("목표 포인트")).toHaveAttribute(
      "placeholder",
      String(DEFAULT_POINTS_GOAL),
    );
  });

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
    expect(
      await screen.findByText("홈페이지에 반영했어요."),
    ).toBeInTheDocument();
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
    await user.click(screen.getByLabelText("홈페이지에 공지 띠 보이기"));
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

describe("AboutEditor", () => {
  const card = (title = "", url = "", teaser = "") => ({ title, url, teaser });
  const START = { intro: "", items: [card(), card(), card()] };

  it("starts with three empty cards and saves an untouched form as no cards", async () => {
    save.mockResolvedValue();
    const user = userEvent.setup();
    wrap(<AboutEditor initial={START} />);
    expect(screen.getAllByLabelText("제목")).toHaveLength(3);
    expect(screen.getAllByLabelText("짧은 소개")[0]?.tagName).toBe("TEXTAREA");
    expect(screen.getAllByLabelText("블로그 주소")[0]).toHaveAttribute(
      "inputmode",
      "url",
    );
    await user.click(screen.getByRole("button", { name: "소개 저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("about", { intro: null, items: [] }),
    );
  });

  it("adds, reorders and removes cards, then saves them in order", async () => {
    save.mockResolvedValue();
    const user = userEvent.setup();
    wrap(<AboutEditor initial={{ intro: "", items: [card()] }} />);
    await user.type(screen.getByLabelText("소개 글"), "전주 영어학원이에요.");
    await user.type(screen.getAllByLabelText("제목")[0]!, "희수영어 소개");
    await user.type(
      screen.getAllByLabelText("짧은 소개")[0]!,
      "무엇일까요?{enter}기준을 이야기해요.",
    );
    await user.type(
      screen.getAllByLabelText("블로그 주소")[0]!,
      "https://blog.naver.com/heesu/1",
    );
    await user.click(screen.getByRole("button", { name: "링크 추가" }));
    await user.type(screen.getAllByLabelText("제목")[1]!, "수업 이야기");
    await user.type(
      screen.getAllByLabelText("블로그 주소")[1]!,
      "https://blog.naver.com/heesu/2",
    );
    await user.click(screen.getByRole("button", { name: "링크 추가" }));
    await user.type(screen.getAllByLabelText("제목")[2]!, "지울 카드");
    await user.click(
      screen.getByRole("button", { name: "2번째 링크 위로 옮기기" }),
    );
    await user.click(screen.getByRole("button", { name: "3번째 링크 지우기" }));
    expect(screen.getAllByLabelText("제목")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "소개 저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("about", {
        intro: "전주 영어학원이에요.",
        items: [
          {
            title: "수업 이야기",
            url: "https://blog.naver.com/heesu/2",
            teaser: null,
          },
          {
            title: "희수영어 소개",
            url: "https://blog.naver.com/heesu/1",
            teaser: "무엇일까요?\n기준을 이야기해요.",
          },
        ],
      }),
    );
  });

  it("does not save a javascript: link and says how to fix it", async () => {
    const user = userEvent.setup();
    wrap(<AboutEditor initial={{ intro: "", items: [card()] }} />);
    await user.type(screen.getByLabelText("제목"), "위험");
    await user.type(
      screen.getByLabelText("블로그 주소"),
      "javascript:alert(1)",
    );
    await user.click(screen.getByRole("button", { name: "소개 저장" }));
    expect(
      await screen.findByText("https://로 시작하는 주소를 붙여 넣어 주세요."),
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("stops adding at 10 cards", async () => {
    const user = userEvent.setup();
    wrap(
      <AboutEditor
        initial={{
          intro: "",
          items: Array.from({ length: 9 }, (_, i) =>
            card(`t${i}`, "https://a.example"),
          ),
        }}
      />,
    );
    const add = screen.getByRole("button", { name: "링크 추가" });
    await user.click(add);
    expect(add).toBeDisabled();
    expect(
      screen.getByText("링크는 10개까지 넣을 수 있어요."),
    ).toBeInTheDocument();
  });
});
