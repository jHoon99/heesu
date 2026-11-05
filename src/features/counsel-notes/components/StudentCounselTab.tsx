"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Badge, Button, Card, Input, Select, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { formatShortDate, toLocalDateKey } from "@/features/sessions";
import {
  COUNSEL_METHOD_LABELS,
  COUNSEL_METHODS,
  COUNSEL_PARTIES,
  COUNSEL_PARTY_LABELS,
  counselSchema,
  type CounselInput,
  type CounselNote,
  type CounselOutput,
} from "../model/counselNotes";
import {
  useAddCounselNote,
  useCounselNotes,
  useDeleteCounselNote,
} from "../state/useCounselNotes";

const METHOD_OPTIONS = COUNSEL_METHODS.map((m) => ({
  value: m,
  label: COUNSEL_METHOD_LABELS[m],
}));
const PARTY_OPTIONS = COUNSEL_PARTIES.map((p) => ({
  value: p,
  label: COUNSEL_PARTY_LABELS[p],
}));

function blank(): CounselInput {
  return {
    counseledOn: toLocalDateKey(new Date()),
    method: "phone",
    party: "guardian",
    body: "",
  };
}

function AddForm({ studentId }: { studentId: string }) {
  const toast = useToast();
  const add = useAddCounselNote();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CounselInput, unknown, CounselOutput>({
    resolver: zodResolver(counselSchema),
    defaultValues: blank(),
  });

  async function onSubmit(input: CounselOutput) {
    setError(null);
    try {
      await add.mutateAsync({ studentId, input });
      toast.show({ tone: "success", message: "상담 기록을 추가했어요." });
      reset(blank());
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
      <p className="text-label text-text">기록 추가</p>
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
        label="날짜"
        type="date"
        error={errors.counseledOn?.message}
        {...register("counseledOn")}
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          size="md"
          label="방법"
          options={METHOD_OPTIONS}
          error={errors.method?.message}
          {...register("method")}
        />
        <Select
          size="md"
          label="대상"
          options={PARTY_OPTIONS}
          error={errors.party?.message}
          {...register("party")}
        />
      </div>
      <Input
        size="md"
        label="내용"
        multiline
        maxLength={2000}
        error={errors.body?.message}
        {...register("body")}
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

function Row({ n, studentId }: { n: CounselNote; studentId: string }) {
  const toast = useToast();
  const del = useDeleteCounselNote();
  const [confirming, setConfirming] = useState(false);

  async function onDelete() {
    try {
      await del.mutateAsync({ id: n.id, studentId });
      toast.show({ tone: "success", message: "상담 기록을 지웠어요." });
    } catch (e) {
      setConfirming(false);
      toast.show({ tone: "danger", message: saveErrorMessage(e) });
    }
  }

  return (
    <li className="flex min-w-0 flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-text-muted tabular-nums">
          {formatShortDate(n.counseledOn)}
        </span>
        <Badge tone="neutral">{COUNSEL_METHOD_LABELS[n.method]}</Badge>
        <Badge tone="brand">{COUNSEL_PARTY_LABELS[n.party]}</Badge>
        <div className="ml-auto flex gap-2">
          {confirming ? (
            <>
              <Button
                variant="danger"
                size="sm"
                disabled={del.isPending}
                onClick={() => void onDelete()}
              >
                지우기
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                취소
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              삭제
            </Button>
          )}
        </div>
      </div>
      <p className="text-body-sm break-words whitespace-pre-line text-text">
        {n.body}
      </p>
    </li>
  );
}

/** 학생 허브 "상담" 탭: 재원생 상담 기록(최근 순) + 추가. 원장만 봐요. */
export function StudentCounselTab({ studentId }: { studentId: string }) {
  const query = useCounselNotes(studentId);

  let list;
  if (query.isError && query.data === undefined) {
    list = (
      <p role="alert" className="text-body-sm text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  } else if (query.isPending) {
    list = (
      <p role="status" className="text-body-sm text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (query.data.length === 0) {
    list = (
      <p className="text-body-sm text-text-muted">
        아직 상담 기록이 없어요. 아래에서 기록을 추가해 주세요.
      </p>
    );
  } else {
    list = (
      <ul className="flex flex-col">
        {query.data.map((n) => (
          <Row key={n.id} n={n} studentId={studentId} />
        ))}
      </ul>
    );
  }

  return (
    <Card
      tone="raised"
      title="상담 기록"
      subtitle="학생·학부모와 나눈 상담을 남겨요. 원장만 볼 수 있어요."
    >
      <div className="flex flex-col gap-6">
        {list}
        <AddForm studentId={studentId} />
      </div>
    </Card>
  );
}
