"use client";

import { useEffect, type ReactNode } from "react";
import { listenForInstallPrompt } from "@/core/pwa";
import { QueryProvider } from "@/core/query/QueryProvider";
import { HeesuMotion, ToastProvider } from "@/design-system";

export function Providers({ children }: { children: ReactNode }) {
  // 안드로이드 설치 창 이벤트는 로드 직후에 와서, 앱이 뜨자마자 들어요.
  useEffect(() => listenForInstallPrompt(), []);
  return (
    <QueryProvider>
      <HeesuMotion>
        <ToastProvider>{children}</ToastProvider>
      </HeesuMotion>
    </QueryProvider>
  );
}
