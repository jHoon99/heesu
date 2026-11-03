import { z } from "zod";
import { classifyError } from "@/core/supabase/error";

const MAX_BYTES = 72; // bcrypt 한도

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상으로 입력해 주세요.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= MAX_BYTES,
    "비밀번호가 너무 길어요. 영문 기준 72자 이하로 줄여 주세요.",
  );

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "두 비밀번호가 달라요. 같은 비밀번호를 한 번 더 입력해 주세요.",
  });

export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export function passwordErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (code === "same_password")
    return "지금 비밀번호와 다른 비밀번호를 입력해 주세요.";
  if (code === "weak_password")
    return "너무 쉬운 비밀번호예요. 숫자와 영문을 섞어 8자 이상으로 바꿔 주세요.";
  return classifyError(error).message;
}
