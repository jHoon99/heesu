"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  Checkbox,
  Input,
  Select,
  useToast,
} from "@/design-system";
import {
  CONSENT_VERSION,
  consultFormSchema,
  formatPhoneInput,
  GRADES,
  submitErrorMessage,
  type ConsultFormInput,
  type ConsultFormOutput,
} from "../model/consultation";
import { useSubmitConsultation } from "../state/useSubmitConsultation";
import { Turnstile } from "./Turnstile";

export function ConsultForm() {
  const toast = useToast();
  const mutation = useSubmitConsultation();
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConsultFormInput, unknown, ConsultFormOutput>({
    resolver: zodResolver(consultFormSchema),
    mode: "onSubmit",
  });

  const phone = register("phone");
  const busy = isSubmitting || mutation.isPending;

  async function onValid(values: ConsultFormOutput) {
    if (token === null) {
      setTokenError(true);
      return;
    }
    try {
      await mutation.mutateAsync({
        ...values,
        consentVersion: CONSENT_VERSION,
        turnstileToken: token,
      });
      setDone(true);
    } catch (error) {
      toast.show({ tone: "danger", message: submitErrorMessage(error) });
      // 토큰은 한 번만 쓸 수 있어서, 실패하면 위젯을 새로 받는다.
      setToken(null);
      setResetSignal((n) => n + 1);
    }
  }

  if (done) {
    return (
      <Card size="lg" tone="raised">
        <p role="status" className="text-body text-text">
          신청이 접수됐어요. 원장이 직접 연락드릴게요.
        </p>
      </Card>
    );
  }

  return (
    <Card size="lg" tone="raised">
      <form
        noValidate
        onSubmit={(e) => {
          if (busy) {
            e.preventDefault();
            return;
          }
          void handleSubmit(onValid)(e);
        }}
        className="flex flex-col gap-5"
      >
        <Input
          label="학부모 성함"
          required
          placeholder="홍길동"
          autoComplete="name"
          error={errors.parentName?.message}
          {...register("parentName")}
        />
        <Input
          label="연락처"
          required
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="010-0000-0000"
          hint="숫자만 입력해도 돼요."
          error={errors.phone?.message}
          {...phone}
          onChange={(e) => {
            e.target.value = formatPhoneInput(e.target.value);
            return phone.onChange(e);
          }}
        />
        <Select
          label="학생 학년"
          required
          placeholder="학년을 골라 주세요"
          options={[...GRADES]}
          error={errors.grade?.message}
          {...register("grade")}
        />
        <Input
          label="궁금한 점 (선택)"
          multiline
          maxLength={1000}
          placeholder="아이의 현재 영어 공부 상황이나 궁금한 점을 적어 주세요."
          error={errors.message?.message}
          {...register("message")}
        />
        <Checkbox
          label="보호자가 작성합니다 (필수)"
          error={errors.guardianConfirmed?.message}
          {...register("guardianConfirmed")}
        />
        <Checkbox
          label={
            <>
              개인정보 수집·이용 동의 (필수){" "}
              <Link
                href="/privacy#consult"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-brand underline"
              >
                내용 보기
              </Link>
            </>
          }
          error={errors.privacyAgreed?.message}
          {...register("privacyAgreed")}
        />
        <div className="flex flex-col gap-1.5">
          <Turnstile
            resetSignal={resetSignal}
            onToken={(t) => {
              setToken(t);
              if (t !== null) setTokenError(false);
            }}
          />
          {tokenError && token === null ? (
            <p className="text-caption text-danger-700">
              자동 입력 방지 확인을 마쳐 주세요.
            </p>
          ) : null}
        </div>
        <Button type="submit" block disabled={busy}>
          상담 신청하기
        </Button>
      </form>
    </Card>
  );
}
