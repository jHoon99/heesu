"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuthSession, useSignOut } from "@/core/auth";
import { useNewConsultationCount } from "@/features/consultations";
import { AdminSidebar } from "@/design-system";
import { activeMenuFor, ADMIN_MENU } from "../model/menu";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const auth = useAuthSession();
  const signOut = useSignOut();
  const newCount = useNewConsultationCount().data ?? 0;

  const email =
    auth.status === "signedIn" ? (auth.session.user.email ?? "") : "";
  const userName = email.split("@")[0] || undefined;

  const items = ADMIN_MENU.map((entry) =>
    "value" in entry && entry.value === "consultations" && newCount >= 1
      ? { ...entry, count: newCount }
      : entry,
  );

  return (
    <div className="flex min-h-dvh bg-bg-admin">
      <div className="sticky top-0 h-dvh shrink-0">
        <AdminSidebar
          items={items}
          active={activeMenuFor(pathname)}
          linkComponent={Link}
          userName={userName}
          onSignOut={() => void signOut()}
        />
      </div>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
