"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/core/query/QueryProvider";
import { HeesuMotion } from "@/design-system";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <HeesuMotion>{children}</HeesuMotion>
    </QueryProvider>
  );
}
