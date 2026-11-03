import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { startSession, updateSession } from "./sessions";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);
const asFrom = (o: unknown) => o as ReturnType<typeof supabase.from>;

describe("startSession", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("inserts and reports created", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: "s1" }, error: null });
    const insert = vi.fn().mockReturnValue({ select: () => ({ single }) });
    from.mockReturnValue(asFrom({ insert }));
    await expect(
      startSession("c1", "2026-11-02", "2026-11-04"),
    ).resolves.toEqual({
      id: "s1",
      created: true,
    });
    expect(insert).toHaveBeenCalledWith({
      class_id: "c1",
      date: "2026-11-02",
      homework_due: "2026-11-04",
    });
  });

  it("returns the existing session on a unique violation", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "23505" } });
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: "old" }, error: null });
    const eq2 = vi.fn().mockReturnValue({ maybeSingle });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    from
      .mockReturnValueOnce(
        asFrom({ insert: () => ({ select: () => ({ single }) }) }),
      )
      .mockReturnValueOnce(asFrom({ select: () => ({ eq: eq1 }) }));
    await expect(startSession("c1", "2026-11-02", null)).resolves.toEqual({
      id: "old",
      created: false,
    });
    expect(eq1).toHaveBeenCalledWith("class_id", "c1");
    expect(eq2).toHaveBeenCalledWith("date", "2026-11-02");
  });

  it("rethrows other errors and a duplicate that cannot be found", async () => {
    const other = { code: "42501" };
    from.mockReturnValueOnce(
      asFrom({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: other }),
          }),
        }),
      }),
    );
    await expect(startSession("c1", "2026-11-02", null)).rejects.toBe(other);

    const dup = { code: "23505" };
    from
      .mockReturnValueOnce(
        asFrom({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: dup }),
            }),
          }),
        }),
      )
      .mockReturnValueOnce(
        asFrom({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
      );
    await expect(startSession("c1", "2026-11-02", null)).rejects.toBe(dup);
  });
});

describe("updateSession", () => {
  beforeEach(() => {
    from.mockReset();
  });
  const input = {
    date: "2026-11-02",
    summary: null,
    homework: "p.10",
    homeworkDue: null,
  };

  it("sends only the granted columns and throws when 0 rows change", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue(asFrom({ update }));
    await expect(updateSession("s1", input)).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
    expect(Object.keys(update.mock.calls[0]![0] as object).sort()).toEqual([
      "date",
      "homework",
      "homework_due",
      "summary",
    ]);
    expect(eq).toHaveBeenCalledWith("id", "s1");
    expect(select).toHaveBeenCalledWith("id");
  });

  it("resolves when a row changed", async () => {
    from.mockReturnValue(
      asFrom({
        update: () => ({
          eq: () => ({
            select: () =>
              Promise.resolve({ data: [{ id: "s1" }], error: null }),
          }),
        }),
      }),
    );
    await expect(updateSession("s1", input)).resolves.toBeUndefined();
  });
});
