import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Card, Input, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { formatPhoneInput } from "@/features/consultations";
import {
  guardianSchema,
  type GuardianInput,
  type GuardianOutput,
} from "../model/detail";
import {
  useSaveStudentPrivate,
  useStudentPrivate,
} from "../state/useStudentDetail";

function GuardianForm({
  studentId,
  initial,
}: {
  studentId: string;
  initial: GuardianOutput | null;
}) {
  const toast = useToast();
  const save = useSaveStudentPrivate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuardianInput, unknown, GuardianOutput>({
    resolver: zodResolver(guardianSchema),
    mode: "onSubmit",
    defaultValues: {
      school: initial?.school ?? "",
      guardianName: initial?.guardianName ?? "",
      guardianPhone: initial?.guardianPhone ?? "",
      memo: initial?.memo ?? "",
    },
  });
  const phone = register("guardianPhone");

  async function onSubmit(input: GuardianOutput) {
    setError(null);
    try {
      await save.mutateAsync({ id: studentId, input });
      toast.show({ tone: "success", message: "보호자 정보를 저장했어요." });
    } catch (e) {
      setError(
        e instanceof SaveNotAppliedError ? e.message : classifyError(e).message,
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        if (save.isPending) {
          e.preventDefault();
          return;
        }
        void handleSubmit(onSubmit)(e);
      }}
      className="flex max-w-[480px] flex-col gap-4"
    >
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
        label="학교"
        maxLength={40}
        error={errors.school?.message}
        {...register("school")}
      />
      <Input
        size="md"
        label="보호자 이름"
        maxLength={20}
        error={errors.guardianName?.message}
        {...register("guardianName")}
      />
      <Input
        size="md"
        label="보호자 연락처"
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        placeholder="010-0000-0000"
        error={errors.guardianPhone?.message}
        {...phone}
        onChange={(e) => {
          e.target.value = formatPhoneInput(e.target.value);
          return phone.onChange(e);
        }}
      />
      <Input
        size="md"
        label="메모"
        multiline
        error={errors.memo?.message}
        {...register("memo")}
      />
      <div>
        <Button
          type="submit"
          variant="secondary"
          size="md"
          disabled={save.isPending}
        >
          저장
        </Button>
      </div>
    </form>
  );
}

export function GuardianCard({ studentId }: { studentId: string }) {
  const priv = useStudentPrivate(studentId);
  let body;
  if (priv.isError) {
    body = (
      <p role="alert" className="text-body-sm text-danger-700">
        {classifyError(priv.error).message}
      </p>
    );
  } else if (priv.isPending || !priv.isFetchedAfterMount) {
    body = (
      <p role="status" className="text-body-sm text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else {
    body = <GuardianForm studentId={studentId} initial={priv.data} />;
  }
  return (
    <Card tone="raised" title="학교·보호자">
      {body}
    </Card>
  );
}
