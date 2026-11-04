import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { getSiteContent } from "../../data/getSiteContent";
import { PointsGoalSettings } from "./PointsGoalSettings";

vi.mock("../../data/getSiteContent");

describe("PointsGoalSettings", () => {
  it("loads the saved goal into the card", async () => {
    vi.mocked(getSiteContent).mockResolvedValue([
      { key: "points_goal", value: 40 },
    ]);
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <ToastProvider>
          <PointsGoalSettings />
        </ToastProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByLabelText("목표 포인트")).toHaveValue("40");
    expect(
      screen.getByText("학생 홈의 포인트 카드에 보여요."),
    ).toBeInTheDocument();
  });
});
