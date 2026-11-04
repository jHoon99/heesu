import type { ReactNode } from "react";
import type { Metadata } from "next";
import { RequireRole } from "@/core/auth";
import { StudentGate } from "@/features/auth";

export const metadata: Metadata = { robots: { index: false } };

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="student">
      <StudentGate>{children}</StudentGate>
    </RequireRole>
  );
}
