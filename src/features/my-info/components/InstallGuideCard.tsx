"use client";

import { Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/design-system";
import { isStandalone } from "@/core/pwa";

export function InstallGuideCard() {
  // 정적 내보내기 프리렌더에는 window가 없어서 마운트 뒤에만 판단해요.
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(!isStandalone());
  }, []);
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
          카카오톡에서 열었다면 먼저 Safari나 Chrome으로 열어 주세요.
        </p>
      </div>
    </Card>
  );
}
