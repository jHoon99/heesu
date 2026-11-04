"use client";

import { useState } from "react";
import { Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { ConsultationEditModal } from "../components/admin/ConsultationEditModal";
import { ConsultationTable } from "../components/admin/ConsultationTable";
import { sortConsultations } from "../model/adminConsultation";
import { useConsultations } from "../state/useAdminConsultations";

export function AdminConsultationsScreen() {
  const query = useConsultations();
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = sortConsultations(query.data ?? []);
  const current = openId ? rows.find((r) => r.id === openId) : undefined;

  let body;
  if (query.isError && query.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (rows.length === 0) {
    body = (
      <Card tone="raised">
        <p className="text-body text-text-muted">
          아직 상담 신청이 없어요. 랜딩의 상담 신청 폼으로 들어온 신청이 여기에
          보여요.
        </p>
      </Card>
    );
  } else {
    body = <ConsultationTable rows={rows} onOpen={setOpenId} />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">상담</h1>
      <p className="text-body-sm text-text-muted">
        등록하지 않은 신청은 신청일로부터 6개월이 지나면 자동으로 지워져요.
      </p>
      {body}
      {current && query.isFetchedAfterMount ? (
        <ConsultationEditModal
          key={current.id}
          record={current}
          open
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}
