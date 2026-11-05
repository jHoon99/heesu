"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Badge, Button, Card, Input, Select, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { formatShortDate, toLocalDateKey } from "@/features/sessions";
import {
  defaultPassScore,
  formatScore,
  isBelowPass,
  TEST_KIND_LABELS,
  TEST_KINDS,
  testSchema,
  type TestInput,
  type TestOutput,
  type TestResult,
} from "../model/testRecords";
import {
  useAddTestResult,
  useDeleteTestResult,
  useTestResults,
} from "../state/useTestRecords";

const KIND_OPTIONS = TEST_KINDS.map((k) => ({
  value: k,
  label: TEST_KIND_LABELS[k],
}));

function blank(kind: TestInput["kind"] = "word"): TestInput {
  return {
    takenOn: toLocalDateKey(new Date()),
    kind,
    title: "",
    score: "",
    maxScore: "",
    passScore: "",
    memo: "",
  };
}

function AddForm({ studentId }: { studentId: string }) {
  const toast = useToast();
  const add = useAddTestResult();
  const [error, setError] = useState<string | null>(null);
  // 원장이 기준을 직접 고치기 전까지는 만점의 80%를 채워요.
  const [passTouched, setPassTouched] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TestInput, unknown, TestOutput>({
    resolver: zodResolver(testSchema),
    defaultValues: blank(),
  });

  const maxField = register("maxScore");
  const passField = register("passScore");

  async function onSubmit(input: TestOutput) {
    setError(null);
    try {
      await add.mutateAsync({ studentId, input });
      toast.show({
        tone: "success",
        message: isBelowPass(input)
          ? "테스트 결과를 추가했어요. 기준보다 낮아서 클리닉에 넣었어요."
          : "테스트 결과를 추가했어요.",
      });
      reset({ ...blank(input.kind), takenOn: input.takenOn });
      setPassTouched(false);
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
      <p className="text-label text-text">결과 추가</p>
      {error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
        >
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Input
          size="md"
          label="날짜"
          type="date"
          error={errors.takenOn?.message}
          {...register("takenOn")}
        />
        <Select
          size="md"
          label="종류"
          options={KIND_OPTIONS}
          error={errors.kind?.message}
          {...register("kind")}
        />
      </div>
      <Input
        size="md"
        label="제목"
        placeholder="예: Day 12, 관계대명사"
        maxLength={40}
        error={errors.title?.message}
        {...register("title")}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          size="md"
          label="점수"
          inputMode="numeric"
          error={errors.score?.message}
          {...register("score")}
        />
        <Input
          size="md"
          label="만점"
          inputMode="numeric"
          error={errors.maxScore?.message}
          {...maxField}
          onChange={(e) => {
            void maxField.onChange(e);
            const n = Number(e.target.value.trim());
            if (!passTouched && Number.isInteger(n) && n >= 1 && n <= 1000) {
              setValue("passScore", String(defaultPassScore(n)));
            }
          }}
        />
      </div>
      <Input
        size="md"
        label="통과 기준"
        inputMode="numeric"
        hint="이 점수보다 낮으면 클리닉에 재시험(문법은 개념 보완)으로 자동으로 들어가요. 기본은 만점의 80%, 비우면 넣지 않아요."
        error={errors.passScore?.message}
        {...passField}
        onChange={(e) => {
          setPassTouched(true);
          return passField.onChange(e);
        }}
      />

      <Input
        size="md"
        label="메모"
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

function Row({ r, studentId }: { r: TestResult; studentId: string }) {
  const toast = useToast();
  const del = useDeleteTestResult();
  const [confirming, setConfirming] = useState(false);

  async function onDelete() {
    try {
      await del.mutateAsync({ id: r.id, studentId });
      toast.show({ tone: "success", message: "테스트 결과를 지웠어요." });
    } catch (e) {
      setConfirming(false);
      toast.show({ tone: "danger", message: saveErrorMessage(e) });
    }
  }

  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-sm text-text-muted tabular-nums">
            {formatShortDate(r.takenOn)}
          </span>
          <Badge tone={r.kind === "word" ? "warning" : "brand"}>
            {TEST_KIND_LABELS[r.kind]}
          </Badge>
          <span className="min-w-0 text-label break-words text-text">
            {r.title}
          </span>
          <span className="text-body-sm text-text tabular-nums">
            {formatScore(r.score, r.maxScore)}
          </span>
          {r.passScore !== null ? (
            <span className="text-caption text-text-muted tabular-nums">
              {`기준 ${r.passScore}`}
            </span>
          ) : null}
          {isBelowPass(r) ? <Badge tone="warning">재시험</Badge> : null}
        </div>
        {r.memo ? (
          <p className="text-body-sm break-words text-text-muted">{r.memo}</p>
        ) : null}
      </div>
      {confirming ? (
        <div className="flex gap-2">
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
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          삭제
        </Button>
      )}
    </li>
  );
}

/** 학생 허브 "테스트" 탭: 단어·문법 테스트 결과 목록(최근 순) + 추가. */
export function StudentTestsTab({ studentId }: { studentId: string }) {
  const query = useTestResults(studentId);

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
        아직 테스트 기록이 없어요. 아래에서 결과를 추가해 주세요.
      </p>
    );
  } else {
    list = (
      <ul className="flex flex-col">
        {query.data.map((r) => (
          <Row key={r.id} r={r} studentId={studentId} />
        ))}
      </ul>
    );
  }

  return (
    <Card tone="raised" title="테스트">
      <div className="flex flex-col gap-6">
        {list}
        <AddForm studentId={studentId} />
      </div>
    </Card>
  );
}
