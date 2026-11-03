import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  getBoard,
  getDayProgress,
  setAttendance,
  setHomework,
} from "./attendance";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));

const from = vi.mocked(supabase.from);

type Call = { table: string; method: string; args: unknown[] };

/** 체인 메서드를 기록하고, await하면 표마다 정해 둔 결과를 돌려주는 가짜 쿼리. */
function mockTables(results: Record<string, unknown>) {
  const calls: Call[] = [];
  from.mockImplementation(((table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of [
      "select",
      "eq",
      "neq",
      "in",
      "order",
      "limit",
      "upsert",
    ]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    builder.then = (resolve: (v: unknown) => unknown) =>
      resolve(results[table] ?? { data: [], error: null });
    calls.push({ table, method: "from", args: [] });
    return builder;
  }) as unknown as typeof supabase.from);
  return calls;
}

describe("setAttendance / setHomework", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("upserts exactly the key columns and status", async () => {
    const calls = mockTables({
      attendance: { data: [{ session_id: "s1" }], error: null },
    });
    await setAttendance("s1", "u1", "late");
    expect(calls.filter((c) => c.method !== "from")).toEqual([
      {
        table: "attendance",
        method: "upsert",
        args: [
          { session_id: "s1", student_id: "u1", status: "late" },
          { onConflict: "session_id,student_id" },
        ],
      },
      { table: "attendance", method: "select", args: ["session_id"] },
    ]);
  });

  it("throws SaveNotAppliedError on 0 rows", async () => {
    mockTables({ homework_checks: { data: [], error: null } });
    await expect(setHomework("s1", "u1", "done")).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });

  it("throws the supabase error", async () => {
    const err = { code: "P0001", message: "반 학생이 아니에요." };
    mockTables({ attendance: { data: null, error: err } });
    await expect(setAttendance("s1", "u1", "present")).rejects.toBe(err);
  });
});

describe("getBoard", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("skips attendance and homework requests when there are no sessions", async () => {
    const calls = mockTables({
      sessions: { data: [], error: null },
      class_roster: {
        data: [
          { student_id: "u1", name: "김하늘", grade: "중1", status: "active" },
        ],
        error: null,
      },
    });
    const board = await getBoard("c1");
    expect(board).toEqual({
      sessions: [],
      students: [{ id: "u1", name: "김하늘", grade: "중1" }],
      records: {},
    });
    const tables = new Set(calls.map((c) => c.table));
    expect(tables.has("attendance")).toBe(false);
    expect(tables.has("homework_checks")).toBe(false);
  });

  it("loads the recent sessions and their rows", async () => {
    const calls = mockTables({
      sessions: {
        data: [
          { id: "s2", class_id: "c1", date: "2026-11-05" },
          { id: "s1", class_id: "c1", date: "2026-11-03" },
        ],
        error: null,
      },
      class_roster: {
        data: [
          { student_id: "u1", name: "김하늘", grade: "중1", status: "active" },
        ],
        error: null,
      },
      attendance: {
        data: [{ session_id: "s1", student_id: "u1", status: "present" }],
        error: null,
      },
      homework_checks: {
        data: [{ session_id: "s2", student_id: "u1", status: "missing" }],
        error: null,
      },
    });
    const board = await getBoard("c1");
    expect(board.sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(board.records).toEqual({
      u1: { s1: { att: "present" }, s2: { hw: "missing" } },
    });
    expect(calls).toContainEqual({
      table: "sessions",
      method: "order",
      args: ["date", { ascending: false }],
    });
    expect(calls).toContainEqual({
      table: "sessions",
      method: "limit",
      args: [8],
    });
    expect(calls).toContainEqual({
      table: "attendance",
      method: "in",
      args: ["session_id", ["s2", "s1"]],
    });
  });
});

describe("getDayProgress", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("returns an empty map without further requests when no session is on that date", async () => {
    const calls = mockTables({ sessions: { data: [], error: null } });
    expect(await getDayProgress("2026-11-04")).toEqual({});
    expect(new Set(calls.map((c) => c.table))).toEqual(new Set(["sessions"]));
  });

  it("counts only active members with a non-none attendance, per class", async () => {
    const calls = mockTables({
      sessions: {
        data: [
          { id: "s1", class_id: "c1" },
          { id: "s2", class_id: "c2" },
        ],
        error: null,
      },
      class_roster: {
        data: [
          { class_id: "c1", student_id: "u1", status: "active" },
          { class_id: "c1", student_id: "u2", status: "active" },
          { class_id: "c1", student_id: "u3", status: "left" },
          { class_id: "c2", student_id: "u4", status: "active" },
        ],
        error: null,
      },
      attendance: {
        data: [
          { session_id: "s1", student_id: "u1", status: "present" },
          { session_id: "s1", student_id: "u3", status: "present" },
          { session_id: "s2", student_id: "u1", status: "late" },
        ],
        error: null,
      },
    });
    expect(await getDayProgress("2026-11-04")).toEqual({
      c1: { sessionId: "s1", entered: 1, total: 2 },
      c2: { sessionId: "s2", entered: 0, total: 1 },
    });
    expect(calls).toContainEqual({
      table: "sessions",
      method: "eq",
      args: ["date", "2026-11-04"],
    });
    expect(calls).toContainEqual({
      table: "attendance",
      method: "neq",
      args: ["status", "none"],
    });
  });

  it("throws the supabase error", async () => {
    const err = { code: "42501", message: "권한이 없어요." };
    mockTables({ sessions: { data: null, error: err } });
    await expect(getDayProgress("2026-11-04")).rejects.toBe(err);
  });
});
