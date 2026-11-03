import { supabase } from "@/core/supabase/client";

export type Role = "admin" | "student";

export function homePathFor(role: Role): "/admin" | "/s" {
  return role === "admin" ? "/admin" : "/s";
}

// 역할은 DB(private.admins·students.user_id)만 판단해요. JWT user_metadata는 보지 않아요.
// my_role()은 원장을 aal2에서만 'admin'으로 돌려줘요.
export async function fetchMyRole(): Promise<Role | null> {
  const { data, error } = await supabase.rpc("my_role");
  if (error) throw error;
  return data === "admin" || data === "student" ? data : null;
}

export const authKeys = {
  all: ["auth"] as const,
  role: (userId: string) => ["auth", "role", userId] as const,
};

export type GuardDecision =
  | { kind: "wait" }
  | { kind: "render" }
  | { kind: "redirect"; to: "/login" | "/admin" | "/s" };

// 화면 이동만 정해요. 실제 권한은 RLS가 막아요.
export function decideGuard(input: {
  session: "loading" | "signedOut" | "signedIn";
  role: Role | null | undefined;
  required: Role;
}): GuardDecision {
  if (input.session === "loading") return { kind: "wait" };
  if (input.session === "signedOut") return { kind: "redirect", to: "/login" };
  if (input.role === undefined) return { kind: "wait" };
  if (input.role === null) return { kind: "redirect", to: "/login" };
  if (input.role !== input.required)
    return { kind: "redirect", to: homePathFor(input.role) };
  return { kind: "render" };
}
