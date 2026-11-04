import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { saveSiteContent } from "../../data/saveSiteContent";
import { ImageReadError, uploadSiteImage } from "../../data/siteImages";
import { AboutEditor } from "./AboutEditor";
import { ContactEditor } from "./ContactEditor";
import { NoticeEditor } from "./NoticeEditor";
import { DEFAULT_POINTS_GOAL } from "../../model/siteContent";
import { PointsGoalEditor } from "./PointsGoalEditor";

vi.mock("../../data/saveSiteContent");
vi.mock("../../data/siteImages", async (orig) => ({
  ...(await orig<typeof import("../../data/siteImages")>()),
  uploadSiteImage: vi.fn(),
}));
const save = vi.mocked(saveSiteContent);
const uploadImage = vi.mocked(uploadSiteImage);

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
  uploadImage.mockReset();
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
  const card = (title = "", url = "", teaser = "", image = "") => ({
    title,
    url,
    teaser,
    image,
  });
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
            image: null,
          },
          {
            title: "희수영어 소개",
            url: "https://blog.naver.com/heesu/1",
            teaser: "무엇일까요?\n기준을 이야기해요.",
            image: null,
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

  it("uploads a card photo, previews it, and saves its path", async () => {
    const IMG = "about/11111111-1111-4111-8111-111111111111.jpg";
    save.mockResolvedValue();
    uploadImage.mockResolvedValue(IMG);
    const user = userEvent.setup();
    wrap(<AboutEditor initial={{ intro: "", items: [card()] }} />);
    expect(
      screen.getByText("사진이 없으면 예시 그림이 보여요."),
    ).toBeInTheDocument();
    const file = new File(["x"], "intro.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("대표 사진"), file);
    expect(uploadImage).toHaveBeenCalledWith(file);
    expect(
      await screen.findByAltText("1번째 카드 사진 미리보기"),
    ).toHaveAttribute("src", expect.stringContaining(`/site-images/${IMG}`));
    expect(
      screen.getByRole("button", { name: "사진 바꾸기" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("제목"), "희수영어 소개");
    await user.type(
      screen.getByLabelText("블로그 주소"),
      "https://blog.naver.com/heesu",
    );
    await user.click(screen.getByRole("button", { name: "소개 저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("about", {
        intro: null,
        items: [
          {
            title: "희수영어 소개",
            url: "https://blog.naver.com/heesu",
            teaser: null,
            image: IMG,
          },
        ],
      }),
    );
  });

  it("removes a card photo", async () => {
    save.mockResolvedValue();
    const user = userEvent.setup();
    wrap(
      <AboutEditor
        initial={{
          intro: "",
          items: [
            card(
              "t",
              "https://a.b",
              "",
              "about/11111111-1111-4111-8111-111111111111.jpg",
            ),
          ],
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "사진 빼기" }));
    expect(screen.queryByAltText("1번째 카드 사진 미리보기")).toBeNull();
    await user.click(screen.getByRole("button", { name: "소개 저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("about", {
        intro: null,
        items: [{ title: "t", url: "https://a.b", teaser: null, image: null }],
      }),
    );
  });

  it("says how to fix it when a photo cannot be read or uploaded", async () => {
    const user = userEvent.setup();
    wrap(<AboutEditor initial={{ intro: "", items: [card()] }} />);
    const input = screen.getByLabelText("대표 사진");
    uploadImage.mockRejectedValueOnce(new ImageReadError());
    await user.upload(input, new File(["x"], "a.jpg", { type: "image/jpeg" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "사진을 읽을 수 없어요. JPG나 PNG 사진으로 다시 골라 주세요.",
    );
    uploadImage.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await user.upload(input, new File(["y"], "b.jpg", { type: "image/jpeg" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "사진을 올리지 못했어요. 인터넷 연결을 확인하고 다시 골라 주세요.",
    );
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
