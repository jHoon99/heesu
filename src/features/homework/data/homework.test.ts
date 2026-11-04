import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { listMyHomework, submitHomework } from "./homework";

vi.mock("@/core/supabase/client", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
const from = vi.mocked(supabase.from);
const rpc = vi.mocked(supabase.rpc);

type Call = { table: string; method: string; args: unknown[] };

function mockTables(results: Record<string, unknown[]>) {
  const calls: Call[] = [];
  const counters: Record<string, number> = {};
  from.mockImplementation(((table: string) => {
    const n = (counters[table] = (counters[table] ?? 0) + 1);
    const result = results[table]?.[n - 1] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {};
    for (const method of [
      "select",
      "not",
      "lte",
      "order",
      "limit",
      "eq",
      "in",
    ]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return builder;
  }) as unknown as typeof supabase.from);
  return calls;
}

const row = (id: string, date: string) => ({
  id,
  class_id: "c1",
  date,
  homework: "숙제",
  homework_due: null,
  classes: { name: "A반" },
});

describe("listMyHomework", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("fetches an old missing session outside the first page", async () => {
    const calls = mockTables({
      sessions: [
        { data: [row("s1", "2026-11-04")], error: null },
        { data: [row("old", "2026-08-01")], error: null },
      ],
      homework_checks: [
        {
          data: [{ session_id: "old", status: "missing", submitted_at: null }],
          error: null,
        },
      ],
    });
    const out = await listMyHomework("st1", "2026-11-05");
    expect(calls.find((c) => c.method === "in")?.args).toEqual(["id", ["old"]]);
    expect(out.map((i) => i.sessionId)).toEqual(["old", "s1"]);
  });

  it("reads own class_members and hides homework from before the join", async () => {
    const calls = mockTables({
      sessions: [
        {
          data: [row("s1", "2026-11-04"), row("s0", "2026-11-03")],
          error: null,
        },
      ],
      class_members: [
        {
          data: [{ class_id: "c1", created_at: "2026-11-03T15:30:00Z" }],
          error: null,
        },
      ],
    });
    const out = await listMyHomework("st1", "2026-11-05");
    const memberCalls = calls.filter((c) => c.table === "class_members");
    expect(memberCalls.find((c) => c.method === "eq")?.args).toEqual([
      "student_id",
      "st1",
    ]);
    expect(out.map((i) => i.sessionId)).toEqual(["s1"]);
  });

  it("makes only three queries when every missing session is loaded", async () => {
    mockTables({
      sessions: [{ data: [row("s1", "2026-11-04")], error: null }],
      homework_checks: [
        {
          data: [{ session_id: "s1", status: "missing", submitted_at: null }],
          error: null,
        },
      ],
    });
    await listMyHomework("st1", "2026-11-05");
    expect(from).toHaveBeenCalledTimes(3);
  });
});

describe("submitHomework", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("returns the server timestamp", async () => {
    rpc.mockResolvedValue({
      data: "2026-11-04T06:30:00Z",
      error: null,
    } as never);
    await expect(submitHomework("s1")).resolves.toBe("2026-11-04T06:30:00Z");
    expect(rpc).toHaveBeenCalledWith("submit_homework", { p_session_id: "s1" });
  });

  it("throws SaveNotAppliedError on null data", async () => {
    rpc.mockResolvedValue({ data: null, error: null } as never);
    await expect(submitHomework("s1")).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });
});
