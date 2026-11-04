import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { saveSiteContent } from "./saveSiteContent";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);

function setup(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  const upsert = vi.fn(() => ({ select }));
  from.mockReturnValue({ upsert } as never);
  return { upsert, select };
}

describe("saveSiteContent", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("upserts only key and value", async () => {
    const { upsert, select } = setup({
      data: [{ key: "points_goal" }],
      error: null,
    });
    await saveSiteContent("points_goal", 25);
    expect(from).toHaveBeenCalledWith("site_content");
    expect(upsert).toHaveBeenCalledWith(
      { key: "points_goal", value: 25 },
      { onConflict: "key" },
    );
    expect(select).toHaveBeenCalledWith("key");
  });

  it("throws SaveNotAppliedError on 0 rows", async () => {
    setup({ data: [], error: null });
    await expect(saveSiteContent("notice", {})).rejects.toBeInstanceOf(
      SaveNotAppliedError,
    );
  });

  it("rethrows db errors", async () => {
    const err = new Error("boom");
    setup({ data: null, error: err });
    await expect(saveSiteContent("notice", {})).rejects.toBe(err);
  });
});
