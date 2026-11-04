"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { Card } from "@/design-system";
import { useSiteContentRows } from "../../state/useSiteContentEditor";

/**
 * 실제 랜딩(/)을 휴대폰 너비 창으로 띄워요. 학부모가 폰에서 보는 모습 그대로예요.
 * 저장해서 내용이 바뀌면 창을 새로 고치고, 보던 위치로 돌아가요.
 */
export function LandingPreview() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // 내용이 같으면 TanStack이 같은 객체를 돌려줘서, 진짜 바뀌었을 때만 새로 고쳐요.
  const { data } = useSiteContentRows();
  const seen = useRef<typeof data>(undefined);

  useEffect(() => {
    if (data === undefined) return;
    if (seen.current === undefined || seen.current === data) {
      seen.current = data;
      return;
    }
    seen.current = data;
    const frame = frameRef.current;
    const win = frame?.contentWindow;
    if (!frame || !win) return;
    const y = win.scrollY;
    const restore = () => {
      // 내용을 읽어 오는 동안 높이가 바뀌어서 한 번 더 맞춰요.
      frame.contentWindow?.scrollTo(0, y);
      window.setTimeout(() => frame.contentWindow?.scrollTo(0, y), 400);
    };
    frame.addEventListener("load", restore, { once: true });
    win.location.reload();
    return () => frame.removeEventListener("load", restore);
  }, [data]);

  return (
    <Card
      tone="raised"
      className="sticky top-6 hidden flex-col gap-3 self-start p-4 xl:flex"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-label text-text">미리보기</h2>
          <p className="text-caption text-text-muted">
            휴대폰 화면 기준 · 저장하면 바뀌어요
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-10 items-center gap-1 text-body-sm text-text-brand"
        >
          새 탭
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
      <iframe
        ref={frameRef}
        src="/"
        title="랜딩 미리보기"
        className="h-[calc(100dvh-11rem)] w-[375px] rounded-md border border-border bg-bg-page"
      />
    </Card>
  );
}
