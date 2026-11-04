"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@/design-system";

export function TotpCodeForm({
  pending,
  onSubmit,
  onRestart,
}: {
  pending: boolean;
  onSubmit: (code: string) => void;
  onRestart: () => void;
}) {
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(code);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="인증 코드"
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className="hs-num tabular-nums"
      />
      <Button type="submit" block disabled={pending} aria-busy={pending}>
        확인
      </Button>
      <Button variant="ghost" block disabled={pending} onClick={onRestart}>
        다른 계정으로 로그인
      </Button>
    </form>
  );
}
