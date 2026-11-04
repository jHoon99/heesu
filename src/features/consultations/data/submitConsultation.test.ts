import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/core/supabase/client";
import {
  SubmitConsultationError,
  type SubmitConsultationPayload,
} from "../model/consultation";
import { submitConsultation } from "./submitConsultation";

vi.mock("@/core/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const invoke = vi.mocked(supabase.functions.invoke);

const payload: SubmitConsultationPayload = {
  parentName: "홍길동",
  phone: "010-1234-5678",
  grade: "중2",
  message: null,
  guardianConfirmed: true,
  privacyAgreed: true,
  consentVersion: "2026-11-05",
  turnstileToken: "tok",
};

const httpError = (body: string, status: number) =>
  new FunctionsHttpError(new Response(body, { status }));

describe("submitConsultation", () => {
  beforeEach(() => invoke.mockReset());

  it("invokes the edge function once and resolves", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(submitConsultation(payload)).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("submit-consultation", {
      body: payload,
    });
  });

  it("maps a known error code from the response body", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(JSON.stringify({ error: "rate_limited" }), 429),
    });
    await expect(submitConsultation(payload)).rejects.toMatchObject({
      name: "SubmitConsultationError",
      code: "rate_limited",
    });
  });

  it.each([
    ["not json", "<html>"],
    ["unknown code", JSON.stringify({ error: "teapot" })],
  ])("falls back to server for %s", async (_label, body) => {
    invoke.mockResolvedValue({ data: null, error: httpError(body, 500) });
    const err = await submitConsultation(payload).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SubmitConsultationError);
    expect((err as SubmitConsultationError).code).toBe("server");
  });

  it("keeps the server message for invalid", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(
        JSON.stringify({
          error: "invalid",
          message: "전화번호를 확인해 주세요.",
        }),
        400,
      ),
    });
    const err = await submitConsultation(payload).catch((e: unknown) => e);
    expect(err).toMatchObject({
      code: "invalid",
      serverMessage: "전화번호를 확인해 주세요.",
    });
  });

  it.each([
    ["absent", { error: "invalid" }],
    ["not a string", { error: "invalid", message: 7 }],
    ["too long", { error: "invalid", message: "가".repeat(201) }],
    ["other code", { error: "captcha", message: "서버 문구" }],
  ])("drops the server message when %s", async (_label, body) => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(JSON.stringify(body), 400),
    });
    const err = await submitConsultation(payload).catch((e: unknown) => e);
    expect((err as SubmitConsultationError).serverMessage).toBeUndefined();
  });

  it("rethrows fetch errors unchanged", async () => {
    const error = new FunctionsFetchError(new TypeError("Failed to fetch"));
    invoke.mockResolvedValue({ data: null, error });
    await expect(submitConsultation(payload)).rejects.toBe(error);
  });
});
