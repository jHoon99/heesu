"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { decideGuard, type Role } from "./role";
import { useAuthSession, useMyRole } from "./session";

const Blank = () => <div aria-busy="true" className="min-h-dvh" />;

// 화면 이동용 가드예요. 데이터 보호는 RLS가 맡아요.
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const router = useRouter();
  const auth = useAuthSession();
  const session = auth.status === "signedIn" ? auth.session : null;
  const myRole = useMyRole(session);
  const decision = decideGuard({
    session: auth.status,
    role: session ? myRole.data : undefined,
    required: role,
  });
  const redirectTo = decision.kind === "redirect" ? decision.to : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  return decision.kind === "render" ? <>{children}</> : <Blank />;
}
