"use client";

import Link from "next/link";
import { buttonVariants, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { dayLabelOf, formatShortDate } from "@/features/sessions";
import { formatWon } from "../model/payments";
import { useStudentPayments } from "../state/usePayments";

const HEADERS = ["월", "금액", "납부일", "메모"];

export function PaymentHistoryCard({ studentId }: { studentId: string }) {
  const query = useStudentPayments(studentId);
  const rows = query.data ?? [];

  let body;
  if (query.isError && query.data === undefined) {
    body = (
      <p role="alert" className="text-body-sm text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-body-sm text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (rows.length === 0) {
    body = (
      <p className="text-body-sm text-text-muted">아직 결제 기록이 없어요.</p>
    );
  } else {
    body = (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-table">
          <thead>
            <tr className="h-10 border-b border-border text-text-muted">
              {HEADERS.map((h) => (
                <th key={h} scope="col" className="pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="h-10 border-b border-border text-text last:border-b-0"
              >
                <td className="pr-4 whitespace-nowrap tabular-nums">
                  {r.month}
                </td>
                <td className="pr-4 whitespace-nowrap tabular-nums">
                  {formatWon(r.amount)}
                </td>
                <td className="pr-4 whitespace-nowrap tabular-nums">
                  {r.paidAt
                    ? `${formatShortDate(r.paidAt)}(${dayLabelOf(r.paidAt)})`
                    : "미납"}
                </td>
                <td className="max-w-48 min-w-0 pr-4">
                  <span className="block break-words whitespace-pre-line">
                    {r.memo ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card tone="raised" title="결제 기록">
      <div className="flex min-w-0 flex-col items-start gap-3">
        {body}
        <Link
          href="/admin/payments"
          className={buttonVariants({ variant: "secondary", size: "md" })}
        >
          결제 화면에서 입력
        </Link>
      </div>
    </Card>
  );
}
