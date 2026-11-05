"use client";

import { Card } from "@/design-system";
import { InstallAppButton } from "@/features/install-app";
import { isStandalone } from "@/core/pwa";
import { useSyncExternalStore } from "react";

export function InstallGuideCard() {
  // 서버·프리렌더에는 window가 없어서 서버 값은 false, 브라우저에서만 판단해요.
  const show = useSyncExternalStore(
    () => () => {},
    () => !isStandalone(),
    () => false,
  );
  if (!show) return null;
  return (
    <Card title="홈 화면에 추가하기">
      <div className="flex flex-col gap-3">
        <p className="text-body text-text">
          아이폰, 아이패드, 갤럭시 모두 홈 화면에 앱처럼 추가할 수 있어요.
        </p>
        <InstallAppButton block />
      </div>
    </Card>
  );
}
