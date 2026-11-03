import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMyStudent } from "@/features/auth";
import { useMyProfile } from "@/features/student-shell";
import { EMPTY_SITE_CONTENT, useSiteContent } from "@/features/site-content";
import { getMyPointTotal, getMyRank } from "../data/points";
import { StudentHomeScreen } from "./StudentHomeScreen";

vi.mock("../data/points");
vi.mock("@/design-system", async (orig) => ({
  ...(await orig<typeof import("@/design-system")>()),
  celebrate: vi.fn(),
}));
vi.mock("@/features/auth", () => ({ useMyStudent: vi.fn() }));
vi.mock("@/features/student-shell", () => ({ useMyProfile: vi.fn() }));
vi.mock("@/features/homework", () => ({
  TodayHomeworkCard: () => <div>오늘 숙제 카드</div>,
}));
vi.mock("@/features/site-content", async (orig) => ({
  ...(await orig<typeof import("@/features/site-content")>()),
  useSiteContent: vi.fn(),
}));

const total = vi.mocked(getMyPointTotal);
const rank = vi.mocked(getMyRank);

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <StudentHomeScreen />
    </QueryClientProvider>,
  );
}

describe("StudentHomeScreen", () => {
  beforeEach(() => {
    localStorage.clear();
    total.mockReset();
    rank.mockReset();
    total.mockResolvedValue(12);
    rank.mockResolvedValue({ rank: 2, total: 8 });
    vi.mocked(useMyStudent).mockReturnValue({ data: undefined } as never);
    vi.mocked(useMyProfile).mockReturnValue({
      data: {
        id: "st1",
        name: "김하늘",
        grade: "중1",
        loginId: "haneul",
        classes: [{ id: "c", name: "중등 기초반" }],
      },
    } as never);
    vi.mocked(useSiteContent).mockReturnValue({
      content: { ...EMPTY_SITE_CONTENT, pointsGoal: 30 },
      isLoading: false,
      isSuccess: true,
    });
  });

  it("shows greeting, class, points, rank and cards", async () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "하늘아, 오늘도 한 문장씩!" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/중등 기초반/)).toBeInTheDocument();
    expect(await screen.findByText("전체 8명 중 2등")).toBeInTheDocument();
    expect(screen.getByText("보상까지 18점 남았어요")).toBeInTheDocument();
    expect(screen.getByText("오늘 숙제 카드")).toBeInTheDocument();
    expect(screen.getByText("새 영상")).toBeInTheDocument();
    expect(screen.getByText("영상 수업은 곧 열려요.")).toBeInTheDocument();
  });

  it("hides the rank line when the rank query fails", async () => {
    rank.mockRejectedValue(new Error("x"));
    setup();
    expect(
      await screen.findByText("보상까지 18점 남았어요"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/명 중/)).toBeNull();
  });

  it("shows an alert when the total fails", async () => {
    total.mockRejectedValue(new TypeError("Failed to fetch"));
    setup();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("shows points without a goal bar and never celebrates when site content failed", async () => {
    total.mockResolvedValue(99);
    vi.mocked(useSiteContent).mockReturnValue({
      content: EMPTY_SITE_CONTENT,
      isLoading: false,
      isSuccess: false,
    });
    setup();
    expect(await screen.findByText("99")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(localStorage.length).toBe(0);
    const { celebrate } = await import("@/design-system");
    expect(celebrate).not.toHaveBeenCalled();
  });
});
