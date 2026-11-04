"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@/design-system";

export function CredentialsForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (input: string, password: string) => void;
}) {
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(input, password);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="아이디 또는 이메일"
        name="username"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="username"
      />
      <Input
        label="비밀번호"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <Button type="submit" block disabled={pending} aria-busy={pending}>
        로그인
      </Button>
    </form>
  );
}
