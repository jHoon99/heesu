"use client";

import { classifyError } from "@/core/supabase/error";
import { ClassesEditor } from "../components/admin/ClassesEditor";
import { ContactEditor } from "../components/admin/ContactEditor";
import { LegalEditor } from "../components/admin/LegalEditor";
import { NoticeEditor } from "../components/admin/NoticeEditor";
import { PointsGoalEditor } from "../components/admin/PointsGoalEditor";
import { TuitionEditor } from "../components/admin/TuitionEditor";
import { readEditable } from "../model/siteContentWrite";
import { useSiteContentRows } from "../state/useSiteContentEditor";

export function AdminSiteContentScreen() {
  const query = useSiteContentRows();

  let body;
  if (query.isError && query.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  } else if (query.data === undefined || !query.isFetchedAfterMount) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else {
    // 카드는 처음 한 번만 값을 받아요. 다른 카드가 저장돼도 입력 중인 내용은 그대로예요.
    const e = readEditable(query.data);
    body = (
      <div className="flex min-w-0 flex-col gap-4">
        <NoticeEditor initial={e.notice} />
        <ClassesEditor initial={e.classes} />
        <TuitionEditor initial={e.tuition} />
        <ContactEditor initial={e.contact} />
        <LegalEditor initial={e.legal} />
        <PointsGoalEditor initial={e.pointsGoal} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">랜딩 관리</h1>
      <p className="text-body-sm text-text-muted">
        저장하면 랜딩에 바로 반영돼요. 비워 둔 칸은 랜딩에 점선 자리표시로
        보여요.
      </p>
      {body}
    </div>
  );
}
