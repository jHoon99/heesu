import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { getMyPointTotal, getMyRank } from "./points";

vi.mock("@/core/supabase/client", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
const rpc = vi.mocked(supabase.rpc);
const from = vi.mocked(supabase.from);

describe("getMyRank", () => {
  beforeEach(() => {
    rpc.mockReset();
  });
  it("returns null for zero rows", async () => {
    rpc.mockResolvedValue({ data: [], error: null } as never);
    expect(await getMyRank()).toBeNull();
  });
  it("returns the first row", async () => {
    rpc.mockResolvedValue({
      data: [{ rank: 2, total: 8 }],
      error: null,
    } as never);
    expect(await getMyRank()).toEqual({ rank: 2, total: 8 });
    expect(rpc).toHaveBeenCalledWith("my_rank");
  });
  it("throws on error", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("x") } as never);
    await expect(getMyRank()).rejects.toThrow("x");
  });
});

describe("getMyPointTotal", () => {
  beforeEach(() => {
    from.mockReset();
  });
  function mockRow(result: unknown) {
    const eq = vi.fn(() => ({ maybeSingle: () => Promise.resolve(result) }));
    from.mockReturnValue({ select: () => ({ eq }) } as never);
    return eq;
  }
  it("returns total, 0 when no row", async () => {
    const eq = mockRow({ data: { total: 12 }, error: null });
    expect(await getMyPointTotal("s1")).toBe(12);
    expect(eq).toHaveBeenCalledWith("student_id", "s1");
    mockRow({ data: null, error: null });
    expect(await getMyPointTotal("s1")).toBe(0);
  });
  it("throws on error", async () => {
    mockRow({ data: null, error: new Error("boom") });
    await expect(getMyPointTotal("s1")).rejects.toThrow("boom");
  });
});
