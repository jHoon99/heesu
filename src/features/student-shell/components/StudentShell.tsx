"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { registerServiceWorker } from "@/core/pwa";
import { StudentTabBar } from "@/design-system";
import { STUDENT_TABS, activeTabFor } from "../model/tabs";

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return (
    <div className="min-h-dvh bg-bg-page">
      <main className="mx-auto max-w-[480px] px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <StudentTabBar
        items={STUDENT_TABS}
        active={activeTabFor(pathname)}
        linkComponent={Link}
      />
    </div>
  );
}
