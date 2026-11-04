import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { updateConsultation } from "./adminConsultations";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);

function setup(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  from.mockReturnValue({ update } as never);
  return { update, eq, select };
}

describe("updateConsultation", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("sends only status and memo", async () => {
    const { update, eq, select } = setup({ data: [{ id: "c1" }], error: null });
    await updateConsultation("c1", { status: "contacted", memo: null });
    expect(from).toHaveBeenCalledWith("consultations");
    expect(update).toHaveBeenCalledWith({ status: "contacted", memo: null });
    expect(eq).toHaveBeenCalledWith("id", "c1");
    expect(select).toHaveBeenCalledWith("id");
  });

  it("throws SaveNotAppliedError on 0 rows", async () => {
    setup({ data: [], error: null });
    await expect(
      updateConsultation("c1", { status: "new", memo: "x" }),
    ).rejects.toBeInstanceOf(SaveNotAppliedError);
  });

  it("rethrows db errors", async () => {
    const err = new Error("boom");
    setup({ data: null, error: err });
    await expect(
      updateConsultation("c1", { status: "new", memo: null }),
    ).rejects.toBe(err);
  });
});
