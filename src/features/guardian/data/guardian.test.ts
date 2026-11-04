import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  getGuardianLinkStatus,
  getGuardianView,
  issueGuardianToken,
} from "./guardian";

vi.mock("@/core/supabase/client", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));
const rpc = vi.mocked(supabase.rpc);
const from = vi.mocked(supabase.from);

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

describe("issueGuardianToken", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("returns the raw token from the rpc", async () => {
    rpc.mockResolvedValue({ data: "tok", error: null } as never);
    await expect(issueGuardianToken("s1")).resolves.toBe("tok");
    expect(rpc.mock.calls[0]).toEqual([
      "issue_guardian_token",
      { p_student_id: "s1" },
    ]);
  });

  it("throws SaveNotAppliedError when no token comes back", async () => {
    rpc.mockResolvedValue({ data: null, error: null } as never);
    await expect(issueGuardianToken("s1")).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });

  it("throws the rpc error", async () => {
    const err = { code: "P0001", message: "x" };
    rpc.mockResolvedValue({ data: null, error: err } as never);
    await expect(issueGuardianToken("s1")).rejects.toBe(err);
  });
});

describe("getGuardianLinkStatus", () => {
  function chain(result: unknown) {
    const c = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
    };
    from.mockReturnValue(c as never);
    return c;
  }

  it("filters live, unexpired tokens and maps the row", async () => {
    const c = chain({
      data: {
        created_at: "2026-11-04T01:00:00Z",
        expires_at: "2027-02-02T01:00:00Z",
      },
      error: null,
    });
    await expect(getGuardianLinkStatus("s1")).resolves.toEqual({
      createdAt: "2026-11-04T01:00:00Z",
      expiresAt: "2027-02-02T01:00:00Z",
    });
    expect(from).toHaveBeenCalledWith("guardian_tokens");
    expect(c.select).toHaveBeenCalledWith("created_at, expires_at");
    expect(c.eq).toHaveBeenCalledWith("student_id", "s1");
    expect(c.is).toHaveBeenCalledWith("revoked_at", null);
    expect(c.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });

  it("returns null without a row", async () => {
    chain({ data: null, error: null });
    await expect(getGuardianLinkStatus("s1")).resolves.toBeNull();
  });

  it("throws the query error", async () => {
    const err = { code: "42501", message: "x" };
    chain({ data: null, error: err });
    await expect(getGuardianLinkStatus("s1")).rejects.toBe(err);
  });
});
