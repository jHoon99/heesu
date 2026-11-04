import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPointHistory } from "../data/points";
import type { PointEntry } from "../model/points";
import { PointHistoryList } from "./PointHistoryList";

vi.mock("../data/points");
const history = vi.mocked(listPointHistory);

const entry = (i: number, over: Partial<PointEntry> = {}): PointEntry => ({
  id: `p${i}`,
  amount: 1,
  reason: `사유 ${i}`,
  createdAt: "2026-11-01T01:00:00Z",
  sessionDate: null,
  ...over,
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <PointHistoryList studentId="s1" />
    </QueryClientProvider>,
  );
}

describe("PointHistoryList", () => {
  beforeEach(() => {
    history.mockReset();
  });

  it("shows rows newest date first regardless of fetch order", async () => {
    history.mockResolvedValue([
      entry(1, { sessionDate: "2026-10-20" }),
      entry(2, { sessionDate: "2026-11-03" }),
    ]);
    setup();
    await screen.findByText("사유 2");
    const reasons = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent);
    expect(reasons[0]).toContain("사유 2");
    expect(reasons[1]).toContain("사유 1");
    expect(screen.queryByText("최근 50건만 보여요")).not.toBeInTheDocument();
  });

  it("notes the cap when 50 rows come back", async () => {
    history.mockResolvedValue(Array.from({ length: 50 }, (_, i) => entry(i)));
    setup();
    expect(await screen.findByText("최근 50건만 보여요")).toBeInTheDocument();
  });

  it("shows the empty text", async () => {
    history.mockResolvedValue([]);
    setup();
    expect(
      await screen.findByText("아직 포인트 내역이 없어요."),
    ).toBeInTheDocument();
  });
});
