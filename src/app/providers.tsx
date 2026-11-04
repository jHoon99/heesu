"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/core/query/QueryProvider";
import { HeesuMotion, ToastProvider } from "@/design-system";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <HeesuMotion>
        <ToastProvider>{children}</ToastProvider>
      </HeesuMotion>
    </QueryProvider>
  );
}
