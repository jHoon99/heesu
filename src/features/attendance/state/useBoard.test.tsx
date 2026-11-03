import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Board } from "../model/board";
import { setAttendance, setHomework } from "../data/attendance";
import { attendanceKeys, useSetCell } from "./useBoard";

vi.mock("../data/attendance");
const show = vi.fn();
vi.mock("@/design-system", async (orig) => ({
  ...(await orig<typeof import("@/design-system")>()),
  useToast: () => ({ show, dismiss: vi.fn() }),
}));

const setAtt = vi.mocked(setAttendance);
const setHw = vi.mocked(setHomework);

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const board = (): Board => ({
  sessions: [
    {
      id: "s1",
      classId: "c1",
      date: "2026-11-05",
      summary: null,
      homework: null,
      homeworkDue: null,
    },
  ],
  students: [{ id: "u1", name: "김하늘", grade: "중1" }],
  records: { u1: { s1: { hw: "done" } } },
});

const vars = (
  value: "present" | "late",
  previous: "none" | "present",
  studentId = "u1",
) => ({
  sessionId: "s1",
  studentId,
  field: "att" as const,
  value,
  previous,
  studentName: "김하늘",
  dateLabel: "11/5",
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(attendanceKeys.board("c1"), board());
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSetCell("c1"), { wrapper });
  const att = () =>
    client.getQueryData<Board>(attendanceKeys.board("c1"))?.records.u1?.s1?.att;
  return { client, result, att, invalidate };
}

describe("useSetCell", () => {
  beforeEach(() => {
    for (const m of [setAtt, setHw, show]) m.mockReset();
  });

  it("writes the new value to the cache before the server answers", async () => {
    const d = deferred();
    setAtt.mockReturnValue(d.promise);
    const { result, att } = setup();
    act(() => result.current.mutate(vars("present", "none")));
    await waitFor(() => expect(att()).toBe("present"));
    expect(setAtt).toHaveBeenCalledWith("s1", "u1", "present");
    await act(async () => d.resolve());
    await waitFor(() =>
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: "success",
          message: "김하늘 11/5 출결을 저장했어요.",
          actionLabel: "되돌리기",
        }),
      ),
    );
  });

  it("rolls back and shows a danger toast on failure", async () => {
    setAtt.mockRejectedValue({ code: "42501" });
    const { result, att } = setup();
    act(() => result.current.mutate(vars("present", "none")));
    await waitFor(() =>
      expect(show).toHaveBeenCalledWith({
        tone: "danger",
        message: "김하늘 11/5 출결을 저장하지 못했어요. 접근 권한이 없어요.",
      }),
    );
    expect(att()).toBe("none");
  });

  it("serializes saves of the same cell and keeps the later value", async () => {
    const first = deferred();
    const order: string[] = [];
    setAtt.mockImplementation(async (_s, _u, status) => {
      order.push(`start:${status}`);
      if (status === "present") {
        await first.promise.finally(() => order.push("end:present"));
      }
    });
    const { result, att } = setup();
    act(() => result.current.mutate(vars("present", "none")));
    act(() => result.current.mutate(vars("late", "present")));
    await waitFor(() => expect(order).toEqual(["start:present"]));
    expect(att()).toBe("late");
    await act(async () => first.reject({ code: "42501" }));
    await waitFor(() =>
      expect(order).toEqual(["start:present", "end:present", "start:late"]),
    );
    await waitFor(() =>
      expect(result.current.isIdle || result.current.isSuccess).toBe(true),
    );
    expect(att()).toBe("late");
  });

  it("sends saves for different cells at the same time", async () => {
    const d = deferred();
    setAtt.mockReturnValue(d.promise);
    const { result } = setup();
    act(() => result.current.mutate(vars("present", "none", "u1")));
    act(() => result.current.mutate(vars("present", "none", "u2")));
    await waitFor(() => expect(setAtt).toHaveBeenCalledTimes(2));
    await act(async () => d.resolve());
  });

  it("invalidates the board once, when the last save settles", async () => {
    const a = deferred();
    const b = deferred();
    setAtt.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result, client, invalidate } = setup();
    act(() => result.current.mutate(vars("present", "none", "u1")));
    act(() => result.current.mutate(vars("present", "none", "u2")));
    await waitFor(() => expect(setAtt).toHaveBeenCalledTimes(2));
    await act(async () => a.resolve());
    await waitFor(() => expect(client.isMutating()).toBe(1));
    const boardCalls = () =>
      invalidate.mock.calls.filter(
        ([f]) =>
          JSON.stringify(f?.queryKey) ===
          JSON.stringify(attendanceKeys.board("c1")),
      ).length;
    expect(boardCalls()).toBe(0);
    await act(async () => b.resolve());
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(boardCalls()).toBe(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["points"] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["attendance", "day"],
    });
  });

  it("undo saves the previous value through the same hook", async () => {
    setAtt.mockResolvedValue(undefined);
    const { result, att } = setup();
    act(() => result.current.mutate(vars("present", "none")));
    await waitFor(() => expect(show).toHaveBeenCalled());
    const toast = show.mock.calls[0]?.[0] as { onAction: () => void };
    act(() => toast.onAction());
    await waitFor(() =>
      expect(setAtt).toHaveBeenLastCalledWith("s1", "u1", "none"),
    );
    expect(att()).toBe("none");
  });
});
