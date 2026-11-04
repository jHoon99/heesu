// Edge Function 진입점: service_role 클라이언트로 원장 확인·students 조회·플래그·Auth 비밀번호를 handler에 연결한다.
// service_role 키는 이 함수의 비밀값으로만 존재하고, 브라우저나 저장소에는 없다.
import { createClient } from "@supabase/supabase-js";
import { createHandler, type Deps } from "./handler.ts";

const REQUIRED_SECRETS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const STATUSES = ["active", "paused", "left"] as const;

/** Supabase 오류 문구(요청 값이 담길 수 있다)는 버리고 단계와 코드만 남긴다. */
class DepError extends Error {
  override name = "DepError";
  constructor(
    step: string,
    readonly code: string | null,
  ) {
    super(`reset-student-password ${step} failed (${code ?? "no code"})`);
  }
}

function buildDeps(): Deps {
  const missing = REQUIRED_SECRETS.filter((k) => !Deno.env.get(k));
  if (missing.length > 0) {
    const fail = (): never => {
      console.error(
        `reset-student-password: 비밀값이 없어요 (${missing.join(", ")})`,
      );
      throw new Error("missing secrets");
    };
    return {
      getClaims: fail,
      isAdmin: fail,
      findStudent: fail,
      markMustChange: fail,
      setPassword: fail,
    };
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  return {
    async getClaims(jwt) {
      const { data, error } = await sb.auth.getClaims(jwt);
      if (error || !data || typeof data.claims.sub !== "string") return null;
      return {
        sub: data.claims.sub,
        aal: typeof data.claims.aal === "string" ? data.claims.aal : null,
      };
    },
    async isAdmin(userId) {
      const { data, error } = await sb.rpc("admin_user_exists", {
        p_user_id: userId,
      });
      if (error) throw new DepError("admin_user_exists", error.code ?? null);
      return data === true;
    },
    async findStudent(id) {
      const { data, error } = await sb
        .from("students")
        .select("user_id, status")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new DepError("select students", error.code ?? null);
      if (data === null) return null;
      const status = STATUSES.find((s) => s === data.status);
      if (status === undefined) throw new DepError("student status", null);
      return {
        userId: typeof data.user_id === "string" ? data.user_id : null,
        status,
      };
    },
    async markMustChange(id) {
      const { error } = await sb
        .from("students")
        .update({ must_change_password: true })
        .eq("id", id);
      if (error) throw new DepError("update students", error.code ?? null);
    },
    async setPassword(userId, password) {
      const { error } = await sb.auth.admin.updateUserById(userId, {
        password,
      });
      if (error) throw new DepError("updateUserById", error.code ?? null);
    },
  };
}

Deno.serve(createHandler(buildDeps()));
