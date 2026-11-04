import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { getGuardianView } from "./guardian";

vi.mock("@/core/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
const rpc = vi.mocked(supabase.rpc);

describe("getGuardianView", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("calls the rpc as a POST with only the token", async () => {
    rpc.mockResolvedValue({
      data: {
        name: "김하늘",
        today: "2026-11-04",
        total_points: 1,
        records: [],
        week: [],
      },
      error: null,
    } as never);
    const v = await getGuardianView("tok");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0]).toEqual(["guardian_view", { p_token: "tok" }]);
    expect(v.name).toBe("김하늘");
  });

  it("throws the rpc error", async () => {
    const err = { code: "P0001", message: "x" };
    rpc.mockResolvedValue({ data: null, error: err } as never);
    await expect(getGuardianView("tok")).rejects.toBe(err);
  });
});
