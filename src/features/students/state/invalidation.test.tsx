import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSetStudentClasses } from "./useStudentDetail";
import { useCreateStudent, useUpdateStudent } from "./useStudents";

vi.mock("../data/functions", () => ({
  createStudent: vi.fn().mockResolvedValue("s1"),
  resetStudentPassword: vi.fn(),
}));
vi.mock("../data/students", () => ({
  updateStudent: vi.fn().mockResolvedValue(undefined),
  getStudent: vi.fn(),
  listStudents: vi.fn(),
}));
vi.mock("../data/detail", () => ({
  setStudentClasses: vi.fn().mockResolvedValue(undefined),
  getStudentPrivate: vi.fn(),
  listConsents: vi.fn(),
  saveStudentPrivate: vi.fn(),
  addConsent: vi.fn(),
}));
vi.mock("@/features/classes", () => ({ classKeys: { all: ["classes"] } }));

function setup() {
  const client = new QueryClient();
  client.setQueryData(["attendance", "day", "2026-11-04"], {});
  client.setQueryData(["points", "totals"], []);
  client.setQueryData(["guardian", "status", "s1"], null);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

async function expectBothInvalidated(client: QueryClient) {
  await waitFor(() => {
    expect(
      client.getQueryState(["attendance", "day", "2026-11-04"])?.isInvalidated,
    ).toBe(true);
    expect(client.getQueryState(["points", "totals"])?.isInvalidated).toBe(
      true,
    );
  });
}

describe("student mutations invalidate attendance and points", () => {
  it("useSetStudentClasses", async () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useSetStudentClasses(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "s1", current: [], next: ["c1"] });
    });
    await expectBothInvalidated(client);
  });

  it("useUpdateStudent", async () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUpdateStudent(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: "s1",
        input: {} as never,
      });
    });
    await expectBothInvalidated(client);
    expect(
      client.getQueryState(["guardian", "status", "s1"])?.isInvalidated,
    ).toBe(true);
  });

  it("useCreateStudent", async () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useCreateStudent(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({} as never);
    });
    await expectBothInvalidated(client);
    expect(
      client.getQueryState(["guardian", "status", "s1"])?.isInvalidated,
    ).toBe(true);
  });
});
