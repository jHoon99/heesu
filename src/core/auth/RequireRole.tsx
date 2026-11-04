"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { decideGuard, type Role } from "./role";
import { useAuthSession, useMyRole, useSignOut } from "./session";

const Blank = () => <div aria-busy="true" className="min-h-dvh" />;

// core는 design-system을 쓸 수 없어서 토큰 클래스로 직접 그려요.
const BUTTON =
  "inline-flex h-10 items-center justify-center rounded-md px-4 text-label transition-colors duration-(--dur-fast) ease-out";

function RoleError({
  onRetry,
  onSignOut,
}: {
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div
        role="alert"
        className="flex flex-col items-center gap-4 text-center"
      >
        <p className="text-body text-text">
          권한을 확인하지 못했어요. 다시 시도하거나 로그아웃해 주세요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRetry}
            className={`${BUTTON} bg-primary text-text-on-brand hover:bg-primary-hover`}
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className={`${BUTTON} text-text-muted hover:bg-bg-subtle`}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

// 화면 이동용 가드예요. 데이터 보호는 RLS가 맡아요.
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const router = useRouter();
  const signOut = useSignOut();
  const auth = useAuthSession();
  const session = auth.status === "signedIn" ? auth.session : null;
  const myRole = useMyRole(session);
  const decision = decideGuard({
    session: auth.status,
    role: session ? myRole.data : undefined,
    required: role,
    fetching: myRole.isFetching,
  });
  const redirectTo = decision.kind === "redirect" ? decision.to : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (decision.kind === "render") return <>{children}</>;
  if (
    decision.kind === "wait" &&
    session &&
    myRole.isError &&
    !myRole.isFetching
  ) {
    return (
      <RoleError
        onRetry={() => void myRole.refetch()}
        onSignOut={() => void signOut()}
      />
    );
  }
  return <Blank />;
}
