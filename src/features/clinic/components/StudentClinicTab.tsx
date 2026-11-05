"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Card, Input, Select, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import {
  CLINIC_KIND_LABELS,
  CLINIC_KINDS,
  clinicAddSchema,
  type ClinicAddInput,
  type ClinicAddOutput,
  type ClinicItem,
} from "../model/clinic";
import { useAddClinicItem, useStudentClinic } from "../state/useClinic";
import { ClinicRow } from "./ClinicRow";

const KIND_OPTIONS = CLINIC_KINDS.map((k) => ({
  value: k,
  label: CLINIC_KIND_LABELS[k],
}));

function AddForm({ studentId }: { studentId: string }) {
  const toast = useToast();
  const add = useAddClinicItem();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClinicAddInput, unknown, ClinicAddOutput>({
    resolver: zodResolver(clinicAddSchema),
    defaultValues: { kind: "word_retest", memo: "" },
  });

  async function onSubmit(input: ClinicAddOutput) {
    setError(null);
    try {
      await add.mutateAsync({ studentId, input });
      toast.show({ tone: "success", message: "클리닉에 추가했어요." });
      reset({ kind: input.kind, memo: "" });
    } catch (e) {
      setError(classifyError(e).message);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        if (add.isPending) {
          e.preventDefault();
          return;
        }
        void handleSubmit(onSubmit)(e);
      }}
      className="flex max-w-[480px] flex-col gap-3"
    >
      <p className="text-label text-text">직접 추가</p>
      {error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
        >
          {error}
        </p>
      ) : null}
      <Select
        size="md"
        label="종류"
        options={KIND_OPTIONS}
        error={errors.kind?.message}
        {...register("kind")}
      />
      <Input
        size="md"
        label="메모"
        placeholder="예: Day 12 단어 다시, 관계대명사"
        maxLength={200}
        error={errors.memo?.message}
        {...register("memo")}
      />
      <div>
        <Button
          type="submit"
          variant="secondary"
          size="md"
          disabled={add.isPending}
        >
          추가
        </Button>
      </div>
    </form>
  );
}

function List({ items, empty }: { items: ClinicItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-body-sm text-text-muted">{empty}</p>;
  }
  return (
    <ul className="flex flex-col">
      {items.map((i) => (
        <ClinicRow key={i.id} item={i} />
      ))}
    </ul>
  );
}

/** 학생 허브 "클리닉" 탭: 해야 할 보완 / 끝낸 보완 + 직접 추가. */
export function StudentClinicTab({ studentId }: { studentId: string }) {
  const query = useStudentClinic(studentId);

  if (query.isError && query.data === undefined) {
    return (
      <p role="alert" className="text-body-sm text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  }
  if (query.isPending) {
    return (
      <p role="status" className="text-body-sm text-text-muted">
        불러오는 중이에요.
      </p>
    );
  }
  const open = query.data.filter((i) => i.status === "open");
  const done = query.data.filter((i) => i.status === "done");

  return (
    <div className="flex flex-col gap-4">
      <Card tone="raised" title={`해야 할 보완 ${open.length}개`}>
        <div className="flex flex-col gap-6">
          <List
            items={open}
            empty="해야 할 보완이 없어요. 수업 일지에서 체크하면 여기에 생겨요."
          />
          <AddForm studentId={studentId} />
        </div>
      </Card>
      <Card tone="raised" title="끝낸 보완">
        <List items={done} empty="아직 끝낸 보완이 없어요." />
      </Card>
    </div>
  );
}
