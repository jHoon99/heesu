import { describe, expect, it, vi } from "vitest";
import { decideGuard, fetchMyRole, homePathFor } from "./role";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/core/supabase/client", () => ({ supabase: { rpc } }));

describe("homePathFor", () => {
  it("sends admins to /admin and students to /s", () => {
    expect(homePathFor("admin")).toBe("/admin");
    expect(homePathFor("student")).toBe("/s");
  });
});

describe("fetchMyRole", () => {
  it.each([
    ["admin", "admin"],
    ["student", "student"],
    [null, null],
    ["teacher", null],
  ])("maps my_role() %j to %j", async (data, out) => {
    rpc.mockResolvedValueOnce({ data, error: null });
    await expect(fetchMyRole()).resolves.toBe(out);
    expect(rpc).toHaveBeenLastCalledWith("my_role");
  });

  it("throws the rpc error", async () => {
    const error = { code: "42501", message: "denied" };
    rpc.mockResolvedValueOnce({ data: null, error });
    await expect(fetchMyRole()).rejects.toBe(error);
  });
});

describe("decideGuard", () => {
  it.each([
    [
      { session: "loading", role: undefined, required: "admin" },
      { kind: "wait" },
    ],
    [
      { session: "signedIn", role: undefined, required: "admin" },
      { kind: "wait" },
    ],
    [
      { session: "signedOut", role: undefined, required: "student" },
      { kind: "redirect", to: "/login" },
    ],
    [
      { session: "signedIn", role: null, required: "admin" },
      { kind: "redirect", to: "/login" },
    ],
    [
      { session: "signedIn", role: "student", required: "admin" },
      { kind: "redirect", to: "/s" },
    ],
    [
      { session: "signedIn", role: "admin", required: "student" },
      { kind: "redirect", to: "/admin" },
    ],
    [
      { session: "signedIn", role: "admin", required: "admin" },
      { kind: "render" },
    ],
    [
      { session: "signedIn", role: "student", required: "student" },
      { kind: "render" },
    ],
    [
      { session: "signedIn", role: null, required: "admin", fetching: true },
      { kind: "wait" },
    ],
    [
      {
        session: "signedIn",
        role: "student",
        required: "admin",
        fetching: true,
      },
      { kind: "wait" },
    ],
    [
      { session: "signedIn", role: "admin", required: "admin", fetching: true },
      { kind: "render" },
    ],
  ] as const)("%j → %j", (input, out) => {
    expect(decideGuard(input)).toEqual(out);
  });
});
