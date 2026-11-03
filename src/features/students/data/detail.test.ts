import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { saveStudentPrivate, setStudentClasses } from "./detail";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);

type Result = { data: unknown; error: unknown };
function chain(result: Result) {
  const calls: Record<string, unknown[]> = {};
  const c: Record<string, unknown> = {};
  const rec = (name: string) =>
    vi.fn((...args: unknown[]) => {
      calls[name] = args;
      return c;
    });
  for (const n of ["delete", "eq", "in", "insert", "upsert"]) c[n] = rec(n);
  c.select = vi.fn((...args: unknown[]) => {
    calls.select = args;
    return Promise.resolve(result);
  });
  // insert without select resolves directly
  c.then = (res: (v: Result) => unknown) => Promise.resolve(result).then(res);
  return { c, calls };
}

describe("setStudentClasses", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("does nothing when nothing changed", async () => {
    await setStudentClasses("s", ["a"], ["a"]);
    expect(from).not.toHaveBeenCalled();
  });

  it("deletes removed classes and inserts added ones once each", async () => {
    const del = chain({ data: [{ class_id: "a" }], error: null });
    const ins = chain({ data: null, error: null });
    from
      .mockReturnValueOnce(del.c as never)
      .mockReturnValueOnce(ins.c as never);
    await setStudentClasses("s", ["a", "b"], ["b", "c"]);
    expect(from).toHaveBeenCalledTimes(2);
    expect(del.calls.eq).toEqual(["student_id", "s"]);
    expect(del.calls.in).toEqual(["class_id", ["a"]]);
    expect(ins.calls.insert).toEqual([[{ student_id: "s", class_id: "c" }]]);
  });

  it("throws SaveNotAppliedError when the delete touched 0 rows", async () => {
    const del = chain({ data: [], error: null });
    from.mockReturnValueOnce(del.c as never);
    await expect(setStudentClasses("s", ["a"], [])).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });
});

describe("saveStudentPrivate", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("upserts on student_id", async () => {
    const up = chain({ data: [{ student_id: "s" }], error: null });
    from.mockReturnValueOnce(up.c as never);
    await saveStudentPrivate("s", {
      school: "희수중",
      guardianName: null,
      guardianPhone: "010-1234-5678",
      memo: null,
    });
    expect(from).toHaveBeenCalledWith("student_private");
    expect(up.calls.upsert).toEqual([
      {
        student_id: "s",
        school: "희수중",
        guardian_name: null,
        guardian_phone: "010-1234-5678",
        memo: null,
      },
      { onConflict: "student_id" },
    ]);
  });

  it("throws SaveNotAppliedError on 0 rows", async () => {
    const up = chain({ data: [], error: null });
    from.mockReturnValueOnce(up.c as never);
    await expect(
      saveStudentPrivate("s", {
        school: null,
        guardianName: null,
        guardianPhone: null,
        memo: null,
      }),
    ).rejects.toBeInstanceOf(SaveNotAppliedError);
  });
});
