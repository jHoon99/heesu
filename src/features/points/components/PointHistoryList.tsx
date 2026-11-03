"use client";

import { cn } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { formatShortDate } from "@/features/sessions";
import {
  entryDateKey,
  formatAmount,
  POINT_HISTORY_LIMIT,
  sortHistory,
  type PointEntry,
} from "../model/points";
import { usePointHistory } from "../state/usePoints";

const dateOf = (e: PointEntry) => formatShortDate(entryDateKey(e));

export function PointHistoryList({ studentId }: { studentId: string }) {
  const history = usePointHistory(studentId);

  if (history.isError && history.data === undefined) {
    return (
      <p role="alert" className="text-body-sm text-danger-700">
        {classifyError(history.error).message}
      </p>
    );
  }
  if (history.isPending) {
    return (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  }
  if (history.data.length === 0) {
    return (
      <p className="text-body text-text-muted">아직 포인트 내역이 없어요.</p>
    );
  }
  const rows = sortHistory(history.data);
  return (
    <>
      <table className="w-full text-left text-table">
        <thead>
          <tr className="h-10 border-b border-border text-text-muted">
            <th scope="col" className="pr-2 font-medium">
              날짜
            </th>
            <th scope="col" className="px-2 font-medium">
              사유
            </th>
            <th scope="col" className="pl-2 text-right font-medium">
              포인트
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr
              key={e.id}
              className="h-10 border-b border-border last:border-b-0"
            >
              <td className="pr-2 whitespace-nowrap">{dateOf(e)}</td>
              <td className="max-w-0 px-2">
                <span className="block truncate" title={e.reason}>
                  {e.reason}
                </span>
              </td>
              <td
                className={cn(
                  "pl-2 text-right tabular-nums",
                  e.amount < 0 && "text-danger-700",
                )}
              >
                {formatAmount(e.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length >= POINT_HISTORY_LIMIT && (
        <p className="mt-2 text-body-sm text-text-muted">최근 50건만 보여요</p>
      )}
    </>
  );
}
