import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassSummary } from "@/features/classes";
import { listClassSessions } from "../data/sessions";
import { SessionListScreen } from "./SessionListScreen";

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => search,
}));
vi.mock("../data/sessions");

const mk = (id: string, name: string): ClassSummary => ({
  id,
  name,
  level: "middle",
  schedule: [],
  scheduleInvalid: false,
  capacity: null,
  memberCount: 0,
});
let classList: ClassSummary[] = [];
vi.mock("@/features/classes", async (orig) => ({
  ...(await orig<typeof import("@/features/classes")>()),
  useClasses: () => ({ data: classList, isPending: false, isError: false }),
}));

const list = vi.mocked(listClassSessions);

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SessionListScreen />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("SessionListScreen", () => {
  beforeEach(() => {
    for (const m of [push, replace, list]) m.mockReset();
    classList = [mk("a1", "중등 A"), mk("b2", "고등 B")];
    search = new URLSearchParams();
    list.mockResolvedValue([]);
  });

  it("falls back to the first class for an unknown ?class=", async () => {
    search = new URLSearchParams("class=zzz");
    setup();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/sessions?class=a1"),
    );
  });

  it("shows the empty state and links the add button to the class", async () => {
    search = new URLSearchParams("class=b2");
    const user = setup();
    expect(
      await screen.findByText(
        "아직 수업이 없어요. 수업 추가를 눌러 수업일지를 써 주세요.",
      ),
    ).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith("b2");
    await user.click(screen.getByRole("button", { name: /수업 추가/ }));
    expect(push).toHaveBeenCalledWith("/admin/sessions/new?class=b2");
  });

  it("opens a row on Enter and formats the cells", async () => {
    search = new URLSearchParams("class=a1");
    list.mockResolvedValue([
      {
        id: "s1",
        classId: "a1",
        date: "2026-11-04",
        summary: "분수",
        homework: null,
        homeworkDue: "2026-11-09",
      },
    ]);
    const user = setup();
    expect(await screen.findByText("11/4 (수)")).toBeInTheDocument();
    expect(screen.getByText("11/9")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    screen.getByRole("row", { name: /분수/ }).focus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/admin/sessions/edit?id=s1");
  });

  it("asks to create a class first when there are none", () => {
    classList = [];
    setup();
    expect(screen.getByText("먼저 반을 만들어 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "반 추가" })).toHaveAttribute(
      "href",
      "/admin/classes/new",
    );
  });
});
