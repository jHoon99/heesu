"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { PaymentCell } from "../components/PaymentCell";
import { PaymentEditModal } from "../components/PaymentEditModal";
import {
  buildPaymentRows,
  monthKeyOf,
  monthLabel,
  monthWindow,
  rangeLabel,
  shiftMonth,
} from "../model/payments";
import { usePayableStudents, usePayments } from "../state/usePayments";

export function PaymentsScreen() {
  const [end, setEnd] = useState(() => monthKeyOf(new Date()));
  const [open, setOpen] = useState<{ studentId: string; month: string } | null>(
    null,
  );
  const months = monthWindow(end);
  const students = usePayableStudents();
  const payments = usePayments(months);

  const failed =
    (students.isError && students.data === undefined) ||
    (payments.isError && payments.data === undefined);
  const error = students.isError ? students.error : payments.error;
  const loading =
    !failed && (students.data === undefined || payments.data === undefined);

  const rows = buildPaymentRows(
    students.data ?? [],
    payments.data ?? [],
    months,
  );
  const target = open
    ? rows.find((r) => r.student.id === open.studentId)
    : undefined;
  const targetIndex = open ? months.indexOf(open.month) : -1;

  let body;
  if (failed) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(error).message}
      </p>
    );
  } else if (loading) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (rows.length === 0) {
    body = (
      <Card tone="raised">
        <p className="text-body text-text-muted">
          학생이 없어요. 학생 화면에서 먼저 추가해 주세요.
        </p>
      </Card>
    );
  } else {
    body = (
      <div className="overflow-x-auto rounded-lg border border-border bg-bg-surface-raised">
        <table className="w-full text-left text-table">
          <thead>
            <tr className="h-10 border-b border-border text-text-muted">
              <th scope="col" className="px-4 font-medium whitespace-nowrap">
                학생
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  scope="col"
                  className="px-2 font-medium whitespace-nowrap"
                >
                  {monthLabel(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, cells }) => (
              <tr
                key={student.id}
                className="border-b border-border text-text last:border-b-0"
              >
                <th
                  scope="row"
                  className="h-10 px-4 font-medium whitespace-nowrap"
                >
                  <span className="mr-2">{student.name}</span>
                  {student.status === "left" ? (
                    <Badge tone="neutral">퇴원</Badge>
                  ) : null}
                </th>
                {months.map((m, i) => (
                  <td key={m} className="px-1 py-1">
                    <PaymentCell
                      record={cells[i] ?? null}
                      studentName={student.name}
                      month={m}
                      onOpen={() =>
                        setOpen({ studentId: student.id, month: m })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const fresh = students.isFetchedAfterMount && payments.isFetchedAfterMount;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">결제</h1>
      <p className="text-body-sm text-text-muted">
        금액과 납부일을 직접 적는 기록이에요. 실제 결제와 연결되지 않아요.
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={() => setEnd((e) => shiftMonth(e, -1))}
        >
          이전 달
        </Button>
        <span className="text-body text-text tabular-nums">
          {rangeLabel(months)}
        </span>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setEnd((e) => shiftMonth(e, 1))}
        >
          다음 달
        </Button>
      </div>
      {body}
      {open && target && targetIndex >= 0 && fresh ? (
        <PaymentEditModal
          key={`${open.studentId}|${open.month}`}
          open
          student={target.student}
          month={open.month}
          record={target.cells[targetIndex] ?? null}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
