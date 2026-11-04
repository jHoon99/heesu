"use client";

import type { ReactNode } from "react";
import { useSiteContent, type SiteContent } from "@/features/site-content";
import { SiteFooter } from "../components/SiteFooter";

/** 사이트 내용을 읽어 본문에 넘기고, 맨 아래에 푸터를 붙여요. 랜딩과 /privacy가 같이 써요. */
export function SiteChrome({
  children,
}: {
  children: (content: SiteContent) => ReactNode;
}) {
  // 읽는 동안에도 자리표시로 그려요 (스피너 없음).
  const { content } = useSiteContent();
  return (
    <div id="top" className="min-h-screen bg-bg-page text-text">
      {children(content)}
      <SiteFooter content={content} />
    </div>
  );
}
