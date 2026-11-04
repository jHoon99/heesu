"use client";

import { useState } from "react";
import { Button, Input, Modal, Select, useToast } from "@/design-system";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import {
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABELS,
  consultationEditSchema,
  formatSeoulDateTime,
  phoneHref,
  type ConsultationRecord,
  type ConsultationStatus,
} from "../../model/adminConsultation";
import { useUpdateConsultation } from "../../state/useAdminConsultations";

const STATUS_OPTIONS = CONSULTATION_STATUSES.map((s) => ({
  value: s,
  label: CONSULTATION_STATUS_LABELS[s],
}));

export function ConsultationEditModal({
  record,
  open,
  onClose,
}: {
  record: ConsultationRecord;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const update = useUpdateConsultation();
  const [status, setStatus] = useState<ConsultationStatus>(record.status);
  const [memo, setMemo] = useState(record.memo ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (update.isPending) return;
    const parsed = consultationEditSchema.safeParse({ status, memo });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요.");
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({ id: record.id, ...parsed.data });
      toast.show({ message: "상담 기록을 저장했어요." });
      onClose();
    } catch (e) {
      setError(saveErrorMessage(e));
    }
  }

  return (
    <Modal
      open={open}
      title={`${record.parentName} · ${record.grade}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            취소
          </Button>
          <Button
            size="md"
            disabled={update.isPending}
            onClick={() => void save()}
          >
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
        <dl className="flex min-w-0 flex-col gap-2 text-body-sm">
          <div className="flex gap-2">
            <dt className="text-text-muted">신청일</dt>
            <dd className="tabular-nums">
              {formatSeoulDateTime(record.createdAt)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-text-muted">연락처</dt>
            <dd className="tabular-nums">
              <a href={phoneHref(record.phone)} className="underline">
                {record.phone}
              </a>
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-text-muted">궁금한 점</dt>
            <dd
              data-testid="consultation-message"
              className="min-w-0 break-words whitespace-pre-line"
            >
              {record.message ?? "적은 내용이 없어요."}
            </dd>
          </div>
        </dl>
        <Select
          size="md"
          label="상태"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value as ConsultationStatus)}
        />
        <Input
          multiline
          label="메모"
          value={memo}
          hint={`${memo.length}/2000`}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>
    </Modal>
  );
}
