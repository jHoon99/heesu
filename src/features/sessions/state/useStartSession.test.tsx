import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSaveSession, useStartSession } from "./useSessions";

const startSession = vi.fn();
vi.mock("../data/sessions", () => ({
  startSession: (...a: unknown[]) => startSession(...a),
  createSession: vi.fn().mockResolvedValue(undefined),
  updateSession: vi.fn().mockResolvedValue(undefined),
}));

describe("useStartSession", () => {
  it("invalidates the sessions and attendance queries after a successful start", async () => {
    startSession.mockResolvedValue({ id: "s1" });
    const client = new QueryClient();
    client.setQueryData(["attendance", "day", "2026-11-04"], {});
    client.setQueryData(["sessions", "class", "c1"], []);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useStartSession(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        classId: "c1",
        date: "2026-11-04",
        homeworkDue: null,
      });
    });
    await waitFor(() => {
      expect(
        client.getQueryState(["attendance", "day", "2026-11-04"])
          ?.isInvalidated,
      ).toBe(true);
      expect(
        client.getQueryState(["sessions", "class", "c1"])?.isInvalidated,
      ).toBe(true);
    });
  });
});

describe("useSaveSession", () => {
  it("invalidates the attendance and points queries after create and edit", async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSaveSession(), { wrapper });
    const input = { date: "2026-11-04" } as never;
    for (const id of [null, "s1"]) {
      client.setQueryData(["attendance", "day", "2026-11-04"], {});
      client.setQueryData(["points", "totals"], []);
      await act(async () => {
        await result.current.mutateAsync({ id, classId: "c1", input });
      });
      await waitFor(() => {
        expect(
          client.getQueryState(["attendance", "day", "2026-11-04"])
            ?.isInvalidated,
        ).toBe(true);
        expect(client.getQueryState(["points", "totals"])?.isInvalidated).toBe(
          true,
        );
      });
    }
  });
});
