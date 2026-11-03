"use client";

import type { ReactNode } from "react";
import { useSignOut } from "@/core/auth";
import { Button } from "@/design-system";
import { FirstLoginPasswordScreen } from "../screen/FirstLoginPasswordScreen";
import { useMyStudent } from "../state/useMyStudent";

function GateMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const signOut = useSignOut();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-page px-4">
      <div
        role="alert"
        className="flex flex-col items-center gap-4 text-center"
      >
        <p className="text-body text-text">{message}</p>
        <div className="flex gap-2">
          {onRetry ? <Button onClick={onRetry}>다시 시도</Button> : null}
          <Button variant="ghost" onClick={() => void signOut()}>
            로그아웃
          </Button>
        </div>
      </div>
    </main>
  );
}

// 화면 이동용 게이트예요. 데이터 보호는 RLS가 맡아요.
export function StudentGate({ children }: { children: ReactNode }) {
  const student = useMyStudent();
  if (student.isError && !student.isFetching) {
    return (
      <GateMessage
        message="학생 정보를 불러오지 못했어요. 다시 시도하거나 로그아웃해 주세요."
        onRetry={() => void student.refetch()}
      />
    );
  }
  if (student.data === null) {
    return (
      <GateMessage message="학생 정보를 찾을 수 없어요. 학원에 문의해 주세요." />
    );
  }
  if (!student.data) {
    return <div aria-busy="true" className="min-h-dvh bg-bg-page" />;
  }
  if (student.data.mustChangePassword) return <FirstLoginPasswordScreen />;
  return <>{children}</>;
}
