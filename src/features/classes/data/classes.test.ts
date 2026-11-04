import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { createClass, getClass, listClasses, updateClass } from "./classes";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));

const from = vi.mocked(supabase.from);

describe("createClass", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("inserts a trimmed name and null capacity, returning the id", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: "c1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert } as unknown as ReturnType<
      typeof supabase.from
    >);

    const id = await createClass({
      name: " 중등 A ",
      level: "middle",
      schedule: [{ day: 1, start: "17:00", end: "19:00" }],
      capacity: null,
    });

    expect(id).toBe("c1");
    expect(from).toHaveBeenCalledWith("classes");
    expect(insert).toHaveBeenCalledWith({
      name: "중등 A",
      level: "middle",
      schedule: [{ day: 1, start: "17:00", end: "19:00" }],
      capacity: null,
    });
  });

  it("throws the supabase error", async () => {
    const err = { code: "P0001", message: "x" };
    const single = vi.fn().mockResolvedValue({ data: null, error: err });
    from.mockReturnValue({
      insert: () => ({ select: () => ({ single }) }),
    } as unknown as ReturnType<typeof supabase.from>);
    await expect(
      createClass({ name: "A", level: "high", schedule: [], capacity: null }),
    ).rejects.toBe(err);
  });
});

describe("updateClass", () => {
  beforeEach(() => {
    from.mockReset();
  });
  const input = {
    name: "A",
    level: "high" as const,
    schedule: [],
    capacity: null,
  };
  const mockUpdate = (result: unknown) => {
    const select = vi.fn().mockResolvedValue(result);
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ update } as unknown as ReturnType<
      typeof supabase.from
    >);
    return { select, eq };
  };

  it("resolves when a row was updated", async () => {
    const { select, eq } = mockUpdate({ data: [{ id: "c1" }], error: null });
    await expect(updateClass("c1", input)).resolves.toBeUndefined();
    expect(eq).toHaveBeenCalledWith("id", "c1");
    expect(select).toHaveBeenCalledWith("id");
  });

  it("throws SaveNotAppliedError when 0 rows come back", async () => {
    mockUpdate({ data: [], error: null });
    await expect(updateClass("c1", input)).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });
});

describe("member counts", () => {
  beforeEach(() => {
    from.mockReset();
  });
  const classRow = (id: string) => ({
    id,
    name: id,
    level: "middle",
    schedule: [],
    capacity: null,
  });
  // class_roster는 퇴원생을 이미 뺀 view라, 거기 없는 학생은 세지 않아요.
  const mockTables = (rosterRows: { class_id: string }[]) => {
    const eq = vi.fn().mockResolvedValue({ data: rosterRows, error: null });
    const rosterSelect = Object.assign(
      Promise.resolve({ data: rosterRows, error: null }),
      { eq },
    );
    from.mockImplementation(((table: string) => {
      if (table === "class_roster") return { select: () => rosterSelect };
      return {
        select: () => ({
          order: () =>
            Promise.resolve({
              data: [classRow("c1"), classRow("c2")],
              error: null,
            }),
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: classRow("c1"), error: null }),
          }),
        }),
      };
    }) as unknown as typeof supabase.from);
    return { eq };
  };

  it("counts class_roster rows per class and never embeds class_members", async () => {
    // c1: 재원 2명(퇴원생 1명은 view에서 빠져 있다), c2: 0명
    mockTables([{ class_id: "c1" }, { class_id: "c1" }]);
    const rows = await listClasses();
    expect(rows.map((r) => [r.id, r.memberCount])).toEqual([
      ["c1", 2],
      ["c2", 0],
    ]);
    expect(from).not.toHaveBeenCalledWith("class_members");
  });

  it("getClass counts only that class's roster rows", async () => {
    const { eq } = mockTables([{ class_id: "c1" }]);
    const row = await getClass("c1");
    expect(row?.memberCount).toBe(1);
    expect(eq).toHaveBeenCalledWith("class_id", "c1");
  });
});
