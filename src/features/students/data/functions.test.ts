import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import { StudentFunctionError } from "../model/students";
import { createStudent } from "./functions";

vi.mock("@/core/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
const invoke = vi.mocked(supabase.functions.invoke);

const input = {
  loginId: "haneul",
  password: "password1",
  name: "김하늘",
  grade: "중1" as const,
  joinedAt: "2026-11-05",
};

function httpError(status: number, body: string) {
  return new FunctionsHttpError(new Response(body, { status }));
}

describe("createStudent", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("returns the new id and sends the contract body", async () => {
    invoke.mockResolvedValue({ data: { id: "s1" }, error: null });
    await expect(createStudent(input)).resolves.toBe("s1");
    expect(invoke).toHaveBeenCalledWith("create-student", { body: input });
  });

  it("maps a login_taken response", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(
        409,
        JSON.stringify({ error: "login_taken", message: "이미 쓰고 있어요." }),
      ),
    });
    const err = await createStudent(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(StudentFunctionError);
    expect(err).toMatchObject({
      code: "login_taken",
      message: "이미 쓰고 있어요.",
    });
  });

  it("falls back to server when the body is not JSON", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(502, "<html>") });
    await expect(createStudent(input)).rejects.toMatchObject({
      code: "server",
    });
  });

  it("rethrows network errors as is", async () => {
    const net = new FunctionsFetchError(new TypeError("Failed to fetch"));
    invoke.mockResolvedValue({ data: null, error: net });
    await expect(createStudent(input)).rejects.toBe(net);
  });
});
