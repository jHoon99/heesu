import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/design-system";
import type { ClassSummary } from "@/features/classes";
import { createSession, getSession, updateSession } from "../data/sessions";
import { SessionFormScreen } from "./SessionFormScreen";

const push = vi.fn();
const router = { push };
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => search,
}));
vi.mock("../data/sessions");

const X = "6f1c2b3a-1111-4222-8333-444455556666";
const classX: ClassSummary = {
  id: X,
  name: "중등 A",
  level: "middle",
  schedule: [
    { day: 1, start: "17:00", end: "19:00" },
    { day: 3, start: "17:00", end: "19:00" },
  ],
  scheduleInvalid: false,
  capacity: null,
  memberCount: 0,
};
vi.mock("@/features/clinic", () => ({
  SessionNotesCard: ({ sessionId }: { sessionId: string }) => (
    <h2>{`학생별 기록 ${sessionId}`}</h2>
  ),
}));
vi.mock("@/features/classes", async (orig) => ({
  ...(await orig<typeof import("@/features/classes")>()),
  useClasses: () => ({ data: [classX], isPending: false, isError: false }),
}));

const get = vi.mocked(getSession);
const create = vi.mocked(createSession);
const update = vi.mocked(updateSession);
const SID = "7a1c2b3a-1111-4222-8333-444455556666";

function setup(mode: "new" | "edit") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SessionFormScreen mode={mode} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
const dateInput = () => screen.getByLabelText(/수업 날짜/) as HTMLInputElement;
const dueInput = () => screen.getByLabelText("숙제 마감") as HTMLInputElement;

describe("SessionFormScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-11-02T03:00:00Z"),
    });
    for (const m of [push, get, create, update]) m.mockReset();
    search = new URLSearchParams();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to today and the next scheduled day, then follows the date", async () => {
    search = new URLSearchParams(`class=${X}`);
    setup("new");
    expect(dateInput().value).toBe("2026-11-02");
    await waitFor(() => expect(dueInput().value).toBe("2026-11-04"));
    fireEvent.change(dateInput(), { target: { value: "2026-11-04" } });
    await waitFor(() => expect(dueInput().value).toBe("2026-11-09"));
  });

  it("stops following once the due date is changed by hand", async () => {
    search = new URLSearchParams(`class=${X}`);
    setup("new");
    await waitFor(() => expect(dueInput().value).toBe("2026-11-04"));
    fireEvent.change(dueInput(), { target: { value: "2026-11-05" } });
    fireEvent.change(dateInput(), { target: { value: "2026-11-04" } });
    await waitFor(() => expect(dateInput().value).toBe("2026-11-04"));
    expect(dueInput().value).toBe("2026-11-05");
  });

  it("shows the duplicate-date message on the date field for 23505", async () => {
    search = new URLSearchParams(`class=${X}`);
    create.mockRejectedValue({ code: "23505" });
    const user = setup("new");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(
      await screen.findByText(
        "이 반은 그 날짜에 이미 수업이 있어요. 목록에서 그 날짜를 열어 고쳐 주세요.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("requires a class when none is preset", async () => {
    const user = setup("new");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("반을 골라 주세요.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: /학생별 기록/ })).toBeNull();
  });

  it.each([[""], ["id=abc"]])("shows the not-found card for %j", (qs) => {
    search = new URLSearchParams(qs);
    setup("edit");
    expect(
      screen.getByText("수업을 찾을 수 없어요. 목록에서 다시 골라 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "수업일지로" })).toHaveAttribute(
      "href",
      "/admin/sessions",
    );
    expect(get).not.toHaveBeenCalled();
  });

  it("saves an edit, toasts and returns to the class list", async () => {
    search = new URLSearchParams(`id=${SID}`);
    get.mockResolvedValue({
      id: SID,
      classId: X,
      date: "2026-11-02",
      summary: "분수",
      homework: null,
      homeworkDue: "2026-11-06",
    });
    update.mockResolvedValue(undefined);
    const user = setup("edit");
    expect(await screen.findByDisplayValue("분수")).toBeInTheDocument();
    expect(dueInput().value).toBe("2026-11-06");
    expect(
      screen.getByRole("heading", { name: `학생별 기록 ${SID}` }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/admin/sessions?class=${X}`),
    );
    expect(update).toHaveBeenCalledWith(SID, {
      date: "2026-11-02",
      summary: "분수",
      homework: null,
      homeworkDue: "2026-11-06",
    });
    expect(
      await screen.findByText("수업일지를 저장했어요."),
    ).toBeInTheDocument();
  });
});
