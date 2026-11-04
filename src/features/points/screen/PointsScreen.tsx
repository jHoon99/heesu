"use client";

import { useState } from "react";
import { Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { PointsGoalSettings } from "@/features/site-content";
import { ManualPointForm } from "../components/ManualPointForm";
import { PointHistoryList } from "../components/PointHistoryList";
import { PointRankingTable } from "../components/PointRankingTable";
import { rankStudents } from "../model/points";
import { usePointTotals } from "../state/usePoints";

export function PointsScreen() {
  const totals = usePointTotals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = rankStudents(totals.data ?? []);
  const selected = rows.find((r) => r.studentId === selectedId);

  let body;
  if (totals.isError && totals.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(totals.error).message}
      </p>
    );
  } else if (totals.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (rows.length === 0) {
    body = (
      <Card tone="raised">
        <p className="text-body text-text-muted">
          아직 재원 중인 학생이 없어요.
        </p>
      </Card>
    );
  } else {
    body = (
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-4">
        <PointRankingTable
          rows={rows}
          selectedId={selected?.studentId ?? null}
          onSelect={setSelectedId}
        />
        <Card tone="raised" className="flex flex-col gap-4 self-start">
          {selected ? (
            <>
              <h2 className="text-h3 text-text">
                {selected.name} · {selected.total}점
              </h2>
              <ManualPointForm
                key={selected.studentId}
                studentId={selected.studentId}
                studentName={selected.name}
              />
              <PointHistoryList studentId={selected.studentId} />
            </>
          ) : (
            <p className="text-body text-text-muted">
              왼쪽 순위표에서 학생을 골라 주세요.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-h2 text-text">포인트</h1>
        <p className="mt-1 text-caption text-text-muted">
          출석(또는 보강)하고 숙제를 완료하면 수업마다 1점이 자동으로 쌓여요.
          순위는 재원 학생만 세요.
        </p>
      </div>
      {body}
      <div className="max-w-[560px]">
        <PointsGoalSettings />
      </div>
    </div>
  );
}
