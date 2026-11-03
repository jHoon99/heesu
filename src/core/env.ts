import { z } from "zod";

const httpUrl = z
  .string()
  .regex(/^https?:\/\/\S+$/, "http:// 또는 https:// 로 시작해야 해요.");

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function parseEnv(source: Record<string, string | undefined>): {
  supabaseUrl: string;
  supabasePublishableKey: string;
} {
  const result = schema.safeParse(source);
  if (!result.success) {
    const name = String(
      result.error.issues[0]?.path[0] ?? "NEXT_PUBLIC_SUPABASE_URL",
    );
    throw new Error(
      `환경 변수 ${name} 이 비어 있거나 올바르지 않아요. .env.local 을 확인해 주세요.`,
    );
  }
  return {
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

// Next.js는 리터럴 `process.env.NEXT_PUBLIC_…` 접근만 클라이언트 번들에 치환해요.
export const env = parseEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
