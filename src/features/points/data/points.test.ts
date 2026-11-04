import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { addManualPoints, listPointHistory } from "./points";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);

type Call = { method: string; args: unknown[] };

function mockResult(result: unknown) {
  const calls: Call[] = [];
  from.mockImplementation((() => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "insert", "eq", "order", "limit"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return builder;
      };
    }
    builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return builder;
  }) as unknown as typeof supabase.from);
  return calls;
}

describe("addManualPoints", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("sends only student_id, amount and reason", async () => {
    const calls = mockResult({ data: [{ id: "p1" }], error: null });
    await addManualPoints("s1", { amount: -1, reason: "정정" });
    const insert = calls.find((c) => c.method === "insert");
    const payload = insert?.args[0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual([
      "amount",
      "reason",
      "student_id",
    ]);
    expect(calls.some((c) => c.method === "select")).toBe(true);
  });

  it("throws SaveNotAppliedError on 0 rows", async () => {
    mockResult({ data: [], error: null });
    await expect(
      addManualPoints("s1", { amount: 1, reason: "x" }),
    ).rejects.toBeInstanceOf(SaveNotAppliedError);
  });
});

describe("listPointHistory", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("maps the joined session date, null for manual rows", async () => {
    const calls = mockResult({
      data: [
        {
          id: "a",
          amount: 1,
          reason: "출석·숙제 완료",
          created_at: "2026-11-02T01:00:00Z",
          sessions: { date: "2026-11-02" },
        },
        {
          id: "b",
          amount: 3,
          reason: "발표",
          created_at: "2026-11-03T01:00:00Z",
          sessions: null,
        },
      ],
      error: null,
    });
    const rows = await listPointHistory("s1");
    expect(rows.map((r) => r.sessionDate)).toEqual(["2026-11-02", null]);
    expect(calls.find((c) => c.method === "order")?.args).toEqual([
      "created_at",
      { ascending: false },
    ]);
  });
});
