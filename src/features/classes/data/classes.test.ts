import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { createClass } from "./classes";

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
