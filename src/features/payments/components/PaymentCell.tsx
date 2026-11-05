"use client";

import { Badge } from "@/design-system";
import { formatShortDate } from "@/features/sessions";
import { formatWon, type PaymentRecord } from "../model/payments";

export function PaymentCell({
  record,
  studentName,
  month,
  onOpen,
}: {
  record: PaymentRecord | null;
  studentName: string;
  month: string;
  onOpen: () => void;
}) {
  const monthNumber = Number(month.slice(5, 7));
  const verb = record ? "수정" : "입력";
  return (
    <button
      type="button"
      aria-label={`${studentName} ${monthNumber}월 수납 ${verb}`}
      onClick={onOpen}
      className="flex min-h-10 w-full min-w-24 flex-col items-start justify-center rounded-md px-2 py-1 text-left hover:bg-bg-subtle"
    >
      {record ? (
        <>
          <span className="tabular-nums">{formatWon(record.amount)}</span>
          {record.paidAt ? (
            <span className="text-caption text-text-muted tabular-nums">
              {`${formatShortDate(record.paidAt)} 납부`}
            </span>
          ) : (
            <Badge tone="warning">미납</Badge>
          )}
        </>
      ) : (
        <span className="text-text-muted">—</span>
      )}
    </button>
  );
}
