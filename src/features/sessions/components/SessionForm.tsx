"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button, Input, Select } from "@/design-system";
import type { ClassSummary } from "@/features/classes";
import {
  nextScheduleDate,
  sessionFormSchema,
  type SessionFormInput,
  type SessionFormOutput,
} from "../model/sessions";

type FormValues = SessionFormInput & { classId: string };
const CLASS_REQUIRED = "반을 골라 주세요.";

export function SessionForm({
  mode,
  classes,
  initial,
  busy,
  dateError,
  onSubmit,
  onCancel,
}: {
  mode: "new" | "edit";
  classes: ClassSummary[];
  initial: FormValues;
  busy: boolean;
  dateError?: string;
  onSubmit: (classId: string, values: SessionFormOutput) => Promise<void>;
  onCancel: () => void;
}) {
  const { classId: initialClassId, ...initialFields } = initial;
  const [classId, setClassId] = useState(initialClassId);
  const [classError, setClassError] = useState<string>();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<SessionFormInput, unknown, SessionFormOutput>({
    resolver: zodResolver(sessionFormSchema),
    mode: "onSubmit",
    defaultValues: initialFields,
  });
  const [dueTouched, setDueTouched] = useState(false);
  const date = useWatch({ control, name: "date" });
  const className = classes.find((c) => c.id === initialClassId)?.name ?? "";

  // 새 수업은 사용자가 마감 칸을 직접 바꾸기 전까지 다음 수업일을 따라가요.
  useEffect(() => {
    if (mode !== "new" || dueTouched) return;
    const schedule = classes.find((c) => c.id === classId)?.schedule ?? [];
    const next = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? nextScheduleDate(schedule, date)
      : null;
    setValue("homeworkDue", next ?? "");
  }, [mode, classId, date, classes, dueTouched, setValue]);

  const dueField = register("homeworkDue", {
    onChange: () => {
      setDueTouched(true);
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        if (busy) {
          e.preventDefault();
          return;
        }
        void handleSubmit((values) => {
          if (classId === "") {
            setClassError(CLASS_REQUIRED);
            return Promise.resolve();
          }
          return onSubmit(classId, values);
        })(e);
      }}
      className="flex flex-col gap-5"
    >
      {mode === "new" ? (
        <Select
          size="md"
          label="반"
          required
          placeholder="반을 골라 주세요"
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setClassError(undefined);
          }}
          error={classError}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-text">반</span>
          <p className="text-body text-text">{className}</p>
        </div>
      )}
      <Input
        size="md"
        label="수업 날짜"
        type="date"
        required
        error={errors.date?.message ?? dateError}
        {...register("date")}
      />
      <Input
        size="md"
        label="수업 내용"
        multiline
        error={errors.summary?.message}
        {...register("summary")}
      />
      <Input
        size="md"
        label="숙제 내용"
        multiline
        error={errors.homework?.message}
        {...register("homework")}
      />
      <Input
        size="md"
        label="숙제 마감"
        type="date"
        hint="비워 두면 마감 없이 저장해요."
        error={errors.homeworkDue?.message}
        {...dueField}
      />
      <div className="flex gap-2">
        <Button type="submit" size="md" disabled={busy}>
          저장
        </Button>
        <Button variant="ghost" size="md" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
