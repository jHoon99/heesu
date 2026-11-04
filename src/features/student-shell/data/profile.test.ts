import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { getMyProfile } from "./profile";

vi.mock("@/core/supabase/client", () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from);

function mockResult(result: unknown) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder = {
    select: (...args: unknown[]) => (
      calls.push({ method: "select", args }),
      builder
    ),
    eq: (...args: unknown[]) => (calls.push({ method: "eq", args }), builder),
    maybeSingle: () => Promise.resolve(result),
  };
  from.mockReturnValue(builder as never);
  return calls;
}

describe("getMyProfile", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("maps the row, sorts classes by name and drops null classes", async () => {
    const calls = mockResult({
      data: {
        id: "s1",
        name: "김하늘",
        grade: "중2",
        login_id: "haneul",
        class_members: [
          { classes: { id: "c2", name: "중등 심화반" } },
          { classes: null },
          { classes: { id: "c1", name: "고등 독해반" } },
        ],
      },
      error: null,
    });
    const profile = await getMyProfile("u1");
    expect(profile).toEqual({
      id: "s1",
      name: "김하늘",
      grade: "중2",
      loginId: "haneul",
      classes: [
        { id: "c1", name: "고등 독해반" },
        { id: "c2", name: "중등 심화반" },
      ],
    });
    expect(from).toHaveBeenCalledWith("students");
    expect(calls).toContainEqual({
      method: "select",
      args: ["id, name, grade, login_id, class_members(classes(id, name))"],
    });
    expect(calls).toContainEqual({ method: "eq", args: ["user_id", "u1"] });
  });

  it("returns null when there is no row", async () => {
    mockResult({ data: null, error: null });
    expect(await getMyProfile("u1")).toBeNull();
  });

  it("throws on error", async () => {
    const error = new Error("boom");
    mockResult({ data: null, error });
    await expect(getMyProfile("u1")).rejects.toBe(error);
  });
});
