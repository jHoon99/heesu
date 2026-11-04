import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/core/supabase/client";
import {
  isStudentFunctionCode,
  SERVER_MESSAGE,
  StudentFunctionError,
  type StudentCreateOutput,
} from "../model/students";

const MAX_SERVER_MESSAGE = 200;

async function readError(
  error: FunctionsHttpError,
): Promise<StudentFunctionError> {
  const fallback = new StudentFunctionError("server", SERVER_MESSAGE);
  try {
    const body: unknown = await error.context.json();
    if (typeof body !== "object" || body === null || !("error" in body)) {
      return fallback;
    }
    const code = body.error;
    const message = "message" in body ? body.message : null;
    if (
      !isStudentFunctionCode(code) ||
      typeof message !== "string" ||
      message.trim() === "" ||
      message.length > MAX_SERVER_MESSAGE
    ) {
      return fallback;
    }
    return new StudentFunctionError(code, message);
  } catch {
    return fallback;
  }
}

async function invoke(name: string, body: object): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data;
  if (error instanceof FunctionsHttpError) throw await readError(error);
  throw error;
}

export async function createStudent(
  input: StudentCreateOutput,
): Promise<string> {
  const data = await invoke("create-student", {
    loginId: input.loginId,
    password: input.password,
    name: input.name,
    grade: input.grade,
    joinedAt: input.joinedAt,
  });
  const id =
    typeof data === "object" && data !== null && "id" in data
      ? data.id
      : undefined;
  if (typeof id !== "string") {
    throw new StudentFunctionError("server", SERVER_MESSAGE);
  }
  return id;
}

export async function resetStudentPassword(
  studentId: string,
  password: string,
): Promise<void> {
  await invoke("reset-student-password", { studentId, password });
}
