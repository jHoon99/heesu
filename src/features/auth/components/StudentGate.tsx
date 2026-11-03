"use client";

import type { ReactNode } from "react";
import { FirstLoginPasswordScreen } from "../screen/FirstLoginPasswordScreen";
import { useMyStudent } from "../state/useMyStudent";

// 화면 이동용 게이트예요. 데이터 보호는 RLS가 맡아요.
export function StudentGate({ children }: { children: ReactNode }) {
  const student = useMyStudent();
  if (!student.data) {
    return <div aria-busy="true" className="min-h-dvh bg-bg-page" />;
  }
  if (student.data.mustChangePassword) return <FirstLoginPasswordScreen />;
  return <>{children}</>;
}
