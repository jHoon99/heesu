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
  it("renders the six cards once loaded", async () => {
    get.mockResolvedValue([{ key: "points_goal", value: 40 }]);
    setup();
    expect(screen.queryByLabelText("목표 포인트")).toBeNull();
    expect(
      await screen.findByRole("heading", { name: "랜딩 관리" }),
    ).toBeInTheDocument();
    for (const title of [
      "공지",
      "반·시간표",
      "수강료·교재비",
      "연락처",
      "법정 표시",
      "보상 목표",
    ])
      expect(
        await screen.findByRole("heading", { name: title }),
      ).toBeInTheDocument();
    expect(screen.getByLabelText("목표 포인트")).toHaveValue("40");
  });

  it("shows the error when there is no data", async () => {
    get.mockRejectedValue(new TypeError("Failed to fetch"));
    setup();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByLabelText("목표 포인트")).toBeNull();
  });
});
