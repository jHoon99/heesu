"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Button,
  buttonVariants,
  Card,
  Input,
  Modal,
  Radio,
  Select,
  useToast,
} from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { GRADES } from "@/features/consultations";
import {
  STATUS_LABELS,
  studentEditSchema,
  type StudentEditInput,
  type StudentEditOutput,
  type StudentSummary,
} from "../model/students";
import { useStudent, useUpdateStudent } from "../state/useStudents";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_PATH = "/admin/students";
const STATUS_ORDER = ["active", "paused", "left"] as const;

function NotFound() {
  return (
    <Card tone="raised">
      <p className="text-body text-text">
        학생을 찾을 수 없어요. 목록에서 다시 골라 주세요.
      </p>
      <Link
        href={LIST_PATH}
        className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
      >
        학생 목록으로
      </Link>
    </Card>
  );
}

function EditForm({
  student,
  busy,
  onSubmit,
  onCancel,
}: {
  student: StudentSummary;
  busy: boolean;
  onSubmit: (values: StudentEditOutput) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentEditInput, unknown, StudentEditOutput>({
    resolver: zodResolver(studentEditSchema),
    mode: "onSubmit",
    defaultValues: {
      name: student.name,
      grade: student.grade,
      status: student.status,
      joinedAt: student.joinedAt,
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
        void handleSubmit(onSubmit)(e);
      }}
      className="flex flex-col gap-5"
    >
      <Input
        size="md"
        label="이름"
        required
        maxLength={20}
        error={errors.name?.message}
        {...register("name")}
      />
      <Select
        size="md"
        label="학년"
        options={[...GRADES]}
        error={errors.grade?.message}
        {...register("grade")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label text-text">상태</legend>
        {STATUS_ORDER.map((s) => (
          <Radio
            key={s}
            label={STATUS_LABELS[s]}
            value={s}
            {...register("status")}
          />
        ))}
      </fieldset>
      <Input
        size="md"
        label="등록일"
        type="date"
        error={errors.joinedAt?.message}
        {...register("joinedAt")}
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

export function StudentEditScreen() {
  const router = useRouter();
  const toast = useToast();
  const rawId = useSearchParams().get("id");
  const id = rawId !== null && UUID_RE.test(rawId) ? rawId : null;
  const existing = useStudent(id);
  const update = useUpdateStudent();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<StudentEditOutput | null>(null);

  function onSubmit(input: StudentEditOutput): Promise<void> {
    if (input.status === "left" && existing.data?.status !== "left") {
      setConfirming(input);
      return Promise.resolve();
    }
    return save(input);
  }

  async function save(input: StudentEditOutput) {
    if (id === null) return;
    setError(null);
    try {
      await update.mutateAsync({ id, input });
      toast.show({ tone: "success", message: "학생 정보를 저장했어요." });
      router.push(`/admin/students/detail?id=${encodeURIComponent(id)}`);
    } catch (e) {
      setError(
        e instanceof SaveNotAppliedError ? e.message : classifyError(e).message,
      );
    }
  }

  async function confirm() {
    const values = confirming;
    setConfirming(null);
    if (values) await save(values);
  }

  let body;
  if (id === null) {
    body = <NotFound />;
  } else if (existing.isError && existing.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(existing.error).message}
      </p>
    );
  } else if (existing.isPending || !existing.isFetchedAfterMount) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (!existing.data) {
    body = <NotFound />;
  } else {
    body = (
      <Card tone="raised" className="max-w-[640px]">
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {error}
          </p>
        ) : null}
        <EditForm
          student={existing.data}
          busy={update.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(LIST_PATH)}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">학생 수정</h1>
      {body}
      <Modal
        open={confirming !== null}
        title="퇴원 처리할까요?"
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirming(null)}
            >
              취소
            </Button>
            <Button variant="danger" size="md" onClick={() => void confirm()}>
              퇴원 처리
            </Button>
          </>
        }
      >
        퇴원 처리하면 이 학생은 로그인해도 아무 정보도 볼 수 없어요. 다시
        재원으로 바꾸면 돌아와요.
      </Modal>
    </div>
  );
}
