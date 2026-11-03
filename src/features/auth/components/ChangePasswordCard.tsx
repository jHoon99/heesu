"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, Input, useToast } from "@/design-system";
import {
  newPasswordSchema,
  passwordErrorMessage,
  type NewPasswordInput,
} from "../model/password";
import { useChangePassword } from "../state/useChangePassword";

export function ChangePasswordCard() {
  const toast = useToast();
  const mutation = useChangePassword();
  const [failure, setFailure] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    mode: "onSubmit",
  });

  async function onValid(values: NewPasswordInput) {
    setFailure(null);
    try {
      await mutation.mutateAsync(values.password);
      reset({ password: "", confirm: "" });
      toast.show({ tone: "success", message: "비밀번호를 바꿨어요." });
    } catch (error) {
      setFailure(error);
    } finally {
      // 비밀번호가 mutation 변수에 남지 않게 시도마다 비워요.
      mutation.reset();
    }
  }

  return (
    <Card title="비밀번호 변경">
      {failure ? (
        <p
          role="alert"
          className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
        >
          {passwordErrorMessage(failure)}
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
  );
}
