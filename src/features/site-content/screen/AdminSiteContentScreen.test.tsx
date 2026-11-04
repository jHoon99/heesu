import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { getSiteContent } from "../data/getSiteContent";
import { AdminSiteContentScreen } from "./AdminSiteContentScreen";

vi.mock("../data/getSiteContent");
const get = vi.mocked(getSiteContent);

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AdminSiteContentScreen />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
});

describe("AdminSiteContentScreen", () => {
  it("renders the five landing cards, each saying where it shows", async () => {
    get.mockResolvedValue([]);
    setup();
    expect(
      screen.getByRole("heading", { name: "랜딩 관리" }),
    ).toBeInTheDocument();
    for (const [title, where] of [
      ["공지", "공지 띠"],
      ["반·시간표", "‘반·시간표’ 섹션"],
      ["수강료·교재비", "‘수강료’ 섹션"],
      ["연락처", "‘오시는 길’"],
      ["법정 표시", "푸터"],
    ] as const) {
      const heading = await screen.findByRole("heading", { name: title });
      expect(heading.parentElement).toHaveTextContent(where);
    }
  });

  it("does not show the reward goal here (it lives on the points screen)", async () => {
    get.mockResolvedValue([{ key: "points_goal", value: 40 }]);
    setup();
    await screen.findByRole("heading", { name: "공지" });
    expect(screen.queryByRole("heading", { name: "보상 목표" })).toBeNull();
    expect(screen.queryByLabelText("목표 포인트")).toBeNull();
  });

  it("shows a phone-width preview of the real landing", () => {
    get.mockResolvedValue([]);
    setup();
    const frame = screen.getByTitle("랜딩 미리보기");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("src", "/");
  });

  it("shows the error when there is no data", async () => {
    get.mockRejectedValue(new TypeError("Failed to fetch"));
    setup();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "공지" })).toBeNull();
  });
});
