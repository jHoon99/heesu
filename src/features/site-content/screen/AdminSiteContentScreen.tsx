"use client";

import { ExternalLink } from "lucide-react";
import { LandingPreview } from "../components/admin/LandingPreview";
import { SiteContentEditors } from "../components/admin/SiteContentEditors";

export function AdminSiteContentScreen() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="font-serif text-h2 text-text">랜딩 관리</h1>
        <p className="mt-1 text-body-sm text-text-muted">
          저장하면 랜딩에 바로 반영되고, 오른쪽 미리보기도 바뀌어요. 비워 둔
          칸은 랜딩에 점선 자리표시로 보여요.
        </p>
        {/* 좁은 화면에서는 옆 미리보기 대신 새 탭으로 열어요. */}
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="mt-2 inline-flex min-h-11 items-center gap-1 text-body-sm text-text-brand xl:hidden"
        >
          랜딩 새 탭으로 열어 보기
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
        <SiteContentEditors />
        <LandingPreview />
      </div>
    </div>
  );
}
