"use client";

import { TotpCodeForm } from "./TotpCodeForm";

export function TotpVerify({
  pending,
  onSubmit,
  onRestart,
}: {
  pending: boolean;
  onSubmit: (code: string) => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-text">
        인증 앱에 보이는 6자리 숫자를 입력해 주세요.
      </p>
      <TotpCodeForm
        pending={pending}
        onSubmit={onSubmit}
        onRestart={onRestart}
      />
    </div>
  );
}
