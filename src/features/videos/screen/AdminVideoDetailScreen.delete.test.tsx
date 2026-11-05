import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import { deleteVideo, getAdminVideo, listRoster } from "../data/videos";
import { AdminVideoDetailScreen } from "./AdminVideoDetailScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("id=v1"),
}));
vi.mock("@/features/classes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/classes")>()),
  useClasses: () => ({ data: [{ id: "c1", name: "A반" }] }),
}));
vi.mock("../data/videos");

const video = {
  id: "v1",
  classId: "c1",
  title: "1단원",
  storagePath: "c1/x.mp4",
  durationSeconds: 600,
  publishedAt: "2026-11-04T00:00:00+09:00",
  school: null,
  views: [],
};

describe("AdminVideoDetailScreen delete with real queries", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(getAdminVideo).mockReset();
    vi.mocked(listRoster).mockResolvedValue([{ studentId: "s1", name: "가" }]);
    vi.mocked(deleteVideo).mockResolvedValue({ fileRemoved: true });
  });

  it("never shows the not-found copy after a successful delete", async () => {
    // 지운 뒤 다시 불러오면 null이 돌아와요.
    let deleted = false;
    vi.mocked(deleteVideo).mockImplementation(async () => {
      deleted = true;
      return { fileRemoved: true };
    });
    vi.mocked(getAdminVideo).mockImplementation(async () =>
      deleted ? null : video,
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <AdminVideoDetailScreen />
        </ToastProvider>
      </QueryClientProvider>,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "영상 지우기" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "지우기" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/영상을 찾을 수 없어요/)).not.toBeInTheDocument();
    expect(getAdminVideo).toHaveBeenCalledTimes(1);
  });
});
