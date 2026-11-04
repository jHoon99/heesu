import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { deletePayment, savePayment } from "./payments";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("savePayment", () => {
  const input = {
    studentId: "s1",
    month: "2026-11",
    amount: 250000,
    paidAt: null,
    memo: "x",
  };
  function setup(data: unknown) {
    const select = vi.fn().mockResolvedValue({ data, error: null });
    const upsert = vi.fn(() => ({ select }));
    from.mockReturnValue({ upsert } as never);
    return { upsert, select };
  }
  it("upserts on student_id,month and selects id", async () => {
    const { upsert, select } = setup([{ id: "p" }]);
    await savePayment(input);
    expect(from).toHaveBeenCalledWith("payments");
    expect(upsert).toHaveBeenCalledWith(
      {
        student_id: "s1",
        month: "2026-11",
        amount: 250000,
        paid_at: null,
        memo: "x",
      },
      { onConflict: "student_id,month" },
    );
    expect(select).toHaveBeenCalledWith("id");
  });
  it("throws SaveNotAppliedError on 0 rows", async () => {
    setup([]);
    await expect(savePayment(input)).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });
});

describe("deletePayment", () => {
  it("throws SaveNotAppliedError on 0 rows", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ select }));
    from.mockReturnValue({ delete: () => ({ eq }) } as never);
    await expect(deletePayment("p")).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
    expect(eq).toHaveBeenCalledWith("id", "p");
  });
});
