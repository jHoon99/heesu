"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button, Input, Select } from "@/design-system";
import {
  classFormSchema,
  LEVEL_LABELS,
  type ClassFormInput,
  type ClassFormOutput,
  type ClassSummary,
} from "../model/classes";
import { ScheduleEditor } from "./ScheduleEditor";

const UNREADABLE_MESSAGE = "시간표를 읽지 못했어요. 새로 입력해 주세요.";

const LEVEL_OPTIONS = [
  { value: "middle", label: LEVEL_LABELS.middle },
  { value: "high", label: LEVEL_LABELS.high },
];

export function ClassForm({
  initial,
  scheduleUnreadable = false,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: ClassSummary;
  /** 저장된 시간표를 읽지 못했어요. 새 시간표를 넣기 전에는 저장하지 못하게 해요. */
  scheduleUnreadable?: boolean;
  busy: boolean;
  onSubmit: (values: ClassFormOutput) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassFormInput, unknown, ClassFormOutput>({
    resolver: zodResolver(classFormSchema),
    mode: "onSubmit",
    defaultValues: {
      name: initial?.name ?? "",
      level: initial?.level ?? "middle",
      schedule: initial?.schedule ?? [],
      capacity:
        initial?.capacity === null || initial === undefined
          ? ""
          : String(initial.capacity),
    },
  });

  const scheduleErrors = errors.schedule;
  const rowErrors = Array.isArray(scheduleErrors)
    ? scheduleErrors.map((row) =>
        row
          ? {
              day: row.day?.message,
              start: row.start?.message,
              end: row.end?.message,
            }
          : undefined,
      )
    : undefined;
  const scheduleMessage = Array.isArray(scheduleErrors)
    ? undefined
    : (scheduleErrors?.message ?? scheduleErrors?.root?.message);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        if (busy) {
          e.preventDefault();
          return;
        }
        void handleSubmit((values) => {
          if (scheduleUnreadable && values.schedule.length === 0) {
            setError("schedule", { message: UNREADABLE_MESSAGE });
            return Promise.resolve();
          }
          return onSubmit(values);
        })(e);
      }}
      className="flex flex-col gap-5"
    >
      <Input
        size="md"
        label="반 이름"
        required
        maxLength={30}
        error={errors.name?.message}
        {...register("name")}
      />
      <Select
        size="md"
        label="구분"
        options={LEVEL_OPTIONS}
        error={errors.level?.message}
        {...register("level")}
      />
      <Input
        size="md"
        label="정원 (선택)"
        inputMode="numeric"
        hint="비워 두면 정원 제한이 없어요."
        error={errors.capacity?.message}
        {...register("capacity")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label text-text">시간표</legend>
        <Controller
          control={control}
          name="schedule"
          render={({ field }) => (
            <ScheduleEditor
              value={field.value}
              onChange={field.onChange}
              errors={rowErrors}
            />
          )}
        />
        {scheduleUnreadable && !scheduleMessage ? (
          <p role="alert" className="text-caption text-danger-700">
            {UNREADABLE_MESSAGE}
          </p>
        ) : null}
        {scheduleMessage ? (
          <p role="alert" className="text-caption text-danger-700">
            {scheduleMessage}
          </p>
        ) : null}
      </fieldset>
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
