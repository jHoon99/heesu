import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useStartSession } from "./useSessions";

const startSession = vi.fn();
vi.mock("../data/sessions", () => ({
  startSession: (...a: unknown[]) => startSession(...a),
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
