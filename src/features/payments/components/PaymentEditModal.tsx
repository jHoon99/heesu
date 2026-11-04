"use client";

import { useState } from "react";
import { Button, Input, Modal, useToast } from "@/design-system";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import {
  paymentFormSchema,
  type PayableStudent,
  type PaymentRecord,
} from "../model/payments";
import { useDeletePayment, useSavePayment } from "../state/usePayments";

export function PaymentEditModal({
  open,
  student,
  month,
  record,
  onClose,
}: {
  open: boolean;
  student: Pick<PayableStudent, "id" | "name">;
  month: string;
  record: PaymentRecord | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const save = useSavePayment();
  const remove = useDeletePayment();
  const [amount, setAmount] = useState(record ? String(record.amount) : "");
  const [paidAt, setPaidAt] = useState(record?.paidAt ?? "");
  const [memo, setMemo] = useState(record?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = save.isPending || remove.isPending;

  async function submit() {
    if (busy) return;
    const parsed = paymentFormSchema.safeParse({ amount, paidAt, memo });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요.");
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({
        studentId: student.id,
        month,
        ...parsed.data,
      });
      toast.show({ message: "결제 기록을 저장했어요." });
      onClose();
    } catch (e) {
      setError(saveErrorMessage(e));
    }
  }

  async function erase() {
    if (busy || !record) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(record.id);
      toast.show({ message: "결제 기록을 지웠어요." });
      onClose();
    } catch (e) {
      setError(saveErrorMessage(e));
      setConfirmDelete(false);
    }
  }

  const [year, monthNumber] = month.split("-");
  return (
    <Modal
      open={open}
      title={`${student.name} · ${year}년 ${Number(monthNumber)}월`}
      onClose={onClose}
      footer={
        <>
          {record ? (
            <Button
              variant="danger"
              size="md"
              disabled={busy}
              onClick={() => void erase()}
            >
              {confirmDelete ? "한 번 더 누르면 지워져요" : "기록 지우기"}
            </Button>
          ) : null}
          <Button variant="ghost" size="md" onClick={onClose}>
            취소
          </Button>
          <Button size="md" disabled={busy} onClick={() => void submit()}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {error}
          </p>
        ) : null}
        <Input
          size="md"
          label="금액(원)"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          size="md"
          label="납부일"
          type="date"
          hint="비워 두면 미납으로 보여요."
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
        <Input
          size="md"
          label="메모"
          hint={`${memo.length}/200`}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>
    </Modal>
  );
}
