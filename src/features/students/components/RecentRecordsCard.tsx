"use client";

import { Card, StatusChip, formatSubmittedAt } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useStudentRecords } from "@/features/attendance";
import { formatShortDate } from "@/features/sessions";

const HEADERS = ["날짜", "반", "출결", "숙제"];

export function RecentRecordsCard({ studentId }: { studentId: string }) {
  const records = useStudentRecords(studentId);

  return (
    <Card tone="raised" title="최근 출결·숙제">
      {records.isError && records.data === undefined ? (
        <p role="alert" className="text-body-sm text-danger-700">
          {classifyError(records.error).message}
        </p>
      ) : records.isPending ? (
        <p role="status" className="text-body text-text-muted">
          불러오는 중이에요.
        </p>
      ) : records.data.length === 0 ? (
        <p className="text-body text-text-muted">아직 수업 기록이 없어요.</p>
      ) : (
        <table className="w-full text-left text-table">
          <thead>
            <tr className="h-10 border-b border-border text-text-muted">
              {HEADERS.map((h) => (
                <th key={h} scope="col" className="pr-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.data.map((r) => (
              <tr
                key={r.sessionId}
                className="h-10 border-b border-border last:border-b-0"
              >
                <td className="pr-2 whitespace-nowrap">
                  {formatShortDate(r.date)}
                </td>
                <td className="pr-2">{r.className}</td>
                <td className="pr-2">
                  <StatusChip status={r.att} size="sm" />
                </td>
                <td>
                  <StatusChip status={r.hw} size="sm" />
                  {r.submittedAt ? (
                    <span className="ml-1 text-caption text-text-muted">
                      {`제출 ${formatSubmittedAt(r.submittedAt).split(" ")[1]}`}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
