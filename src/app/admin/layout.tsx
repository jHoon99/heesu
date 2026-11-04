import type { ReactNode } from "react";
import type { Metadata } from "next";
import { RequireRole } from "@/core/auth";
import { AdminShell } from "@/features/admin-shell";

export const metadata: Metadata = { robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="admin">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
