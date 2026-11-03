"use client";

import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase, type Session } from "@/core/supabase/client";
import { authKeys, fetchMyRole, type Role } from "./role";

export type AuthSessionState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; session: Session };

function toState(session: Session | null): AuthSessionState {
  return session ? { status: "signedIn", session } : { status: "signedOut" };
}

export function useAuthSession(): AuthSessionState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthSessionState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    // 마지막으로 본 사용자. 다른 사람으로 바뀌거나 로그아웃되면 캐시를 통째로 지워요.
    let lastUserId: string | null | undefined;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        lastUserId ??= data.session?.user.id ?? null;
        setState(toState(data.session));
      })
      .catch(() => {
        if (active) setState({ status: "signedOut" });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setState(toState(session));
      const userId = session?.user.id ?? null;
      if (event === "INITIAL_SESSION") {
        lastUserId = userId;
        return;
      }
      const userChanged =
        event === "SIGNED_OUT" ||
        (lastUserId !== undefined && userId !== lastUserId);
      lastUserId = userId;
      // 콜백 안에서 바로 Supabase를 다시 부르면 auth 잠금에 걸릴 수 있어서 다음 틱으로 미뤄요.
      setTimeout(() => {
        if (userChanged) queryClient.clear();
        else void queryClient.invalidateQueries({ queryKey: authKeys.all });
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return state;
}

export function useMyRole(
  session: Session | null,
): UseQueryResult<Role | null> {
  return useQuery({
    queryKey: authKeys.role(session?.user.id ?? ""),
    queryFn: fetchMyRole,
    enabled: session !== null,
  });
}

export function useSignOut(): () => Promise<void> {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    // 서버 요청이 실패해도 이 기기에서는 반드시 로그아웃돼요.
    if (error) await supabase.auth.signOut({ scope: "local" });
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);
}
