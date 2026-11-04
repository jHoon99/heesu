"use client";

import { useRef, useState } from "react";
import { Button, Input, useToast } from "@/design-system";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { formatAmount, manualPointSchema } from "../model/points";
import { useAddManualPoints } from "../state/usePoints";

export function ManualPointForm({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const toast = useToast();
  const add = useAddManualPoints();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{
    amount?: string;
    reason?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const busy = useRef(false);

  async function submit() {
    if (busy.current) return;
    setFormError(null);
    const parsed = manualPointSchema.safeParse({ amount, reason });
    if (!parsed.success) {
      const next: { amount?: string; reason?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === "amount" ? "amount" : "reason";
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    busy.current = true;
    try {
      await add.mutateAsync({ studentId, input: parsed.data });
      toast.show({
        tone: "success",
        message: `${studentName} 학생에게 ${formatAmount(parsed.data.amount)}점을 반영했어요.`,
      });
      setAmount("");
      setReason("");
    } catch (e) {
      setFormError(saveErrorMessage(e));
    } finally {
      busy.current = false;
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-3"
    >
      {formError ? (
        <p
          role="alert"
          className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
        >
          {formError}
        </p>
      ) : null}
      <Input
        size="md"
        label="포인트"
        inputMode="numeric"
        placeholder="예: 3 또는 -2"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />
      <Input
        size="md"
        label="사유"
        hint="학생 화면에도 보여요. 학생이 봐도 괜찮은 말로 적어 주세요."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={errors.reason}
      />
      <Button type="submit" size="md" disabled={add.isPending}>
        반영하기
      </Button>
    </form>
  );
}
