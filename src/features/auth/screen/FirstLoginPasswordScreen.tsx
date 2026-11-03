"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Card, Input, useToast } from "@/design-system";
import {
  newPasswordSchema,
  passwordErrorMessage,
  type NewPasswordInput,
} from "../model/password";
import { useChangeFirstPassword } from "../state/useChangeFirstPassword";

export function FirstLoginPasswordScreen() {
  const toast = useToast();
  const mutation = useChangeFirstPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    mode: "onSubmit",
  });

  async function onValid(values: NewPasswordInput) {
    try {
      await mutation.mutateAsync(values.password);
      toast.show({ tone: "success", message: "비밀번호를 바꿨어요." });
    } catch {
      // 오류 문구는 mutation.error로 아래에 보여 줘요.
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-page px-4 py-10">
      <Card tone="raised" size="lg" className="w-full max-w-[400px]">
        <h1 className="font-serif text-h2 text-text">
          새 비밀번호를 정해 주세요
        </h1>
        <p className="mt-2 mb-6 text-body text-text-muted">
          원장님이 알려 준 비밀번호는 처음 한 번만 써요. 나만 아는 비밀번호로
          바꿔 주세요.
        </p>
        {mutation.isError ? (
          <p
            role="alert"
            className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {passwordErrorMessage(mutation.error)}
          </p>
        ) : null}
        <form
          noValidate
          onSubmit={(e) => {
            if (mutation.isPending) {
              e.preventDefault();
              return;
            }
            void handleSubmit(onValid)(e);
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="새 비밀번호"
            type="password"
            size="lg"
            autoComplete="new-password"
            hint="8자 이상으로 입력해 주세요."
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            size="lg"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register("confirm")}
          />
          <Button
            type="submit"
            block
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
          >
            비밀번호 바꾸기
          </Button>
        </form>
      </Card>
    </main>
  );
}
