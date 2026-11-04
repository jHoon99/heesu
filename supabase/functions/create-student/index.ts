// Edge Function 진입점: service_role 클라이언트로 원장 확인·Auth 사용자·students 행을 handler에 연결한다.
// service_role 키는 이 함수의 비밀값으로만 존재하고, 브라우저나 저장소에는 없다.
import { createClient } from "@supabase/supabase-js";
import { createHandler, type Deps } from "./handler.ts";

const REQUIRED_SECRETS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

/** Supabase 오류 문구(요청 값이 담길 수 있다)는 버리고 단계와 코드만 남긴다. */
class DepError extends Error {
  override name = "DepError";
  constructor(
    step: string,
    readonly code: string | null,
  ) {
    super(`create-student ${step} failed (${code ?? "no code"})`);
  }
}

function buildDeps(): Deps {
  const missing = REQUIRED_SECRETS.filter((k) => !Deno.env.get(k));
  if (missing.length > 0) {
    const fail = (): never => {
      console.error(`create-student: 비밀값이 없어요 (${missing.join(", ")})`);
      throw new Error("missing secrets");
    };
    return {
      getClaims: fail,
      isAdmin: fail,
      createAuthUser: fail,
      insertStudent: fail,
      deleteAuthUser: fail,
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
    async createAuthUser(email, password) {
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        if (error.code === "email_exists")
          return { ok: false, reason: "exists" };
        throw new DepError("createUser", error.code ?? null);
      }
      return { ok: true, userId: data.user.id };
    },
    async insertStudent(row) {
      const { data, error } = await sb
        .from("students")
        .insert({
          user_id: row.userId,
          login_id: row.loginId,
          name: row.name,
          grade: row.grade,
          joined_at: row.joinedAt,
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") return { ok: false, reason: "exists" };
        throw new DepError("insert students", error.code ?? null);
      }
      return { ok: true, id: String(data.id) };
    },
    async deleteAuthUser(userId) {
      const { error } = await sb.auth.admin.deleteUser(userId);
      if (error) throw new DepError("deleteUser", error.code ?? null);
    },
  };
}

Deno.serve(createHandler(buildDeps()));
