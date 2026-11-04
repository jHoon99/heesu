import { useState } from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Card, Input, Radio, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import {
  CONSENT_METHOD_LABELS,
  CONSENT_METHODS,
  consentSchema,
  nowLocalInput,
  type ConsentInput,
  type ConsentOutput,
} from "../model/detail";
import { useAddConsent, useConsents } from "../state/useStudentDetail";

function ConsentForm({ studentId }: { studentId: string }) {
  const toast = useToast();
  const add = useAddConsent();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConsentInput, unknown, ConsentOutput>({
    resolver: zodResolver(consentSchema),
    mode: "onSubmit",
    defaultValues: {
      guardianName: "",
      method: "written",
      version: "",
      consentedAt: nowLocalInput(),
    },
  });

  async function onSubmit(input: ConsentOutput) {
    setError(null);
    try {
      await add.mutateAsync({ id: studentId, input });
      toast.show({ tone: "success", message: "동의 기록을 추가했어요." });
      reset({
        guardianName: "",
        method: "written",
        version: "",
        consentedAt: nowLocalInput(),
      });
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
        label="보호자 이름"
        maxLength={20}
        error={errors.guardianName?.message}
        {...register("guardianName")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label text-text">동의 방법</legend>
        {CONSENT_METHODS.map((m) => (
          <Radio
            key={m}
            label={CONSENT_METHOD_LABELS[m]}
            value={m}
            {...register("method")}
          />
        ))}
        {errors.method?.message ? (
          <p className="text-caption text-danger-700">
            {errors.method.message}
          </p>
        ) : null}
      </fieldset>
      <Input
        size="md"
        label="동의서 버전"
        maxLength={40}
        placeholder="2026-11"
        error={errors.version?.message}
        {...register("version")}
      />
      <Input
        size="md"
        label="동의 일시"
        type="datetime-local"
        error={errors.consentedAt?.message}
        {...register("consentedAt")}
      />
      <p className="text-caption text-text-muted">
        등록 동의서에 수업 녹화·영상 게시 동의 항목이 들어 있는지 확인한 뒤
        기록해 주세요.
      </p>
      <p className="text-caption text-text-muted">
        동의 기록은 고치거나 지울 수 없어요. 잘못 적었다면 새 기록을 추가해
        주세요.
      </p>
      <div>
        <Button
          type="submit"
          variant="secondary"
          size="md"
          disabled={add.isPending}
        >
          기록 추가
        </Button>
      </div>
    </form>
  );
}

export function ConsentCard({ studentId }: { studentId: string }) {
  const consents = useConsents(studentId);
  let history;
  if (consents.isError && consents.data === undefined) {
    history = (
      <p role="alert" className="text-body-sm text-danger-700">
        {classifyError(consents.error).message}
      </p>
    );
  } else if (!consents.data) {
    history = (
      <p role="status" className="text-body-sm text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (consents.data.length === 0) {
    history = (
      <p className="text-body-sm text-text-muted">
        아직 동의 기록이 없어요. 만 14세 미만 학생은 보호자 동의를 받아 기록해
        주세요.
      </p>
    );
  } else {
    history = (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-table">
          <thead className="bg-bg-subtle text-text-muted">
            <tr className="h-10">
              {["일시", "보호자", "방법", "버전"].map((h) => (
                <th key={h} scope="col" className="px-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {consents.data.map((c) => (
              <tr key={c.id} className="h-10 border-t border-border">
                <td className="px-4">
                  {format(new Date(c.consentedAt), "yyyy.MM.dd HH:mm")}
                </td>
                <td className="px-4">{c.guardianName}</td>
                <td className="px-4">{CONSENT_METHOD_LABELS[c.method]}</td>
                <td className="px-4">{c.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <Card tone="raised" title="보호자 동의">
      <div className="flex flex-col gap-6">
        {history}
        <ConsentForm studentId={studentId} />
      </div>
    </Card>
  );
}
