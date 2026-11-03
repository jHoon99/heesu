import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/core/supabase/client";
import {
  isSubmitErrorCode,
  SubmitConsultationError,
  type SubmitConsultationPayload,
  type SubmitErrorCode,
} from "../model/consultation";

async function readErrorCode(
  error: FunctionsHttpError,
): Promise<SubmitErrorCode> {
  try {
    const body: unknown = await error.context.json();
    const code =
      typeof body === "object" && body !== null && "error" in body
        ? body.error
        : null;
    return isSubmitErrorCode(code) ? code : "server";
  } catch {
    return "server";
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
    throw new SubmitConsultationError(await readErrorCode(error));
  }
  throw error;
}
