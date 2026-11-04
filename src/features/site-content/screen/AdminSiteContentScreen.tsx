"use client";

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
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6">
        <SiteContentEditors />
        <LandingPreview />
      </div>
    </div>
  );
}
