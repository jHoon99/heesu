// Edge Function 진입점: 비밀값을 읽고 실제 Turnstile·RPC를 handler에 연결한다.
// service_role 키는 이 함수의 비밀값으로만 존재하고, 브라우저나 저장소에는 없다.
import { createClient } from "@supabase/supabase-js";
import { createHandler, type Deps } from "./handler.ts";
import { verifyTurnstile } from "./turnstile.ts";

const REQUIRED_SECRETS = [
  "TURNSTILE_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/** DB 오류 문구(details에 요청 값이 담길 수 있다)는 버리고 코드만 남긴다. */
class RpcError extends Error {
  override name = "RpcError";
  constructor(readonly code: string | null) {
    super(`submit_consultation RPC failed (${code ?? "no code"})`);
  }
}

function buildDeps(): Deps {
  const missing = REQUIRED_SECRETS.filter((k) => !Deno.env.get(k));
  if (missing.length > 0) {
    const fail = (): never => {
      console.error(
        `submit-consultation: 비밀값이 없어요 (${missing.join(", ")})`,
      );
      throw new Error("missing secrets");
    };
    return { verifyTurnstile: fail, submit: fail };
  }

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY")!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  return {
    verifyTurnstile: (token, remoteIp) =>
      verifyTurnstile(turnstileSecret, token, remoteIp),
    async submit(input) {
      const { error } = await supabase.rpc("submit_consultation", {
        p_parent_name: input.parentName,
        p_phone: input.phone,
        p_grade: input.grade,
        p_message: input.message,
        p_consent_version: input.consentVersion,
      });
      if (!error) return "ok";
      if (error.code === "HS429") return "rate_limited";
      throw new RpcError(error.code ?? null);
    },
  };
}

Deno.serve(createHandler(buildDeps()));
