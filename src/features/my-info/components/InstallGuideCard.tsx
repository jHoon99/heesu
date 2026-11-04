"use client";

import { Share } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Card } from "@/design-system";
import { isStandalone } from "@/core/pwa";

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
      <div className="flex flex-col gap-2 text-body text-text">
        <p className="flex items-start gap-2">
          <Share aria-hidden className="mt-1 size-4 shrink-0 text-text-muted" />
          <span>
            아이폰: Safari 아래쪽 공유 버튼을 누르고 &lsquo;홈 화면에
            추가&rsquo;를 골라요.
          </span>
        </p>
        <p>
          안드로이드: Chrome 오른쪽 위 메뉴(⋮)를 누르고 &lsquo;홈 화면에
          추가&rsquo; 또는 &lsquo;앱 설치&rsquo;를 골라요.
        </p>
        <p className="text-body-sm text-text-muted">
          아이폰은 Safari와 홈 화면 앱의 로그인이 따로예요. 추가한 뒤에는 홈
          화면 앱에서 다시 로그인해요.
        </p>
        <p className="text-body-sm text-text-muted">
          카카오톡에서 열었다면 먼저 Safari나 Chrome으로 열어 주세요.
        </p>
      </div>
    </Card>
  );
}
