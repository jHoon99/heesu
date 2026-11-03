import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/core/supabase/client";
import {
  isSubmitErrorCode,
  SubmitConsultationError,
  type SubmitConsultationPayload,
} from "../model/consultation";

const MAX_SERVER_MESSAGE = 200;

async function readError(
  error: FunctionsHttpError,
): Promise<SubmitConsultationError> {
  try {
    const body: unknown = await error.context.json();
    if (typeof body !== "object" || body === null || !("error" in body)) {
      return new SubmitConsultationError("server");
    }
    const code = body.error;
    if (!isSubmitErrorCode(code)) return new SubmitConsultationError("server");
    const message = "message" in body ? body.message : null;
    const usable =
      code === "invalid" &&
      typeof message === "string" &&
      message.trim() !== "" &&
      message.length <= MAX_SERVER_MESSAGE;
    return new SubmitConsultationError(code, usable ? message : undefined);
  } catch {
    return new SubmitConsultationError("server");
  }
}

export async function submitConsultation(
  payload: SubmitConsultationPayload,
): Promise<void> {
  const { error } = await supabase.functions.invoke("submit-consultation", {
    body: payload,
  });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    throw await readError(error);
  }
  throw error;
}
