"use client";

import { TotpCodeForm } from "./TotpCodeForm";

// QR과 비밀키는 이 화면에서만 보여 주고 따로 저장하지 않아요.
export function TotpEnroll({
  qrCode,
  secret,
  pending,
  onSubmit,
  onRestart,
}: {
  qrCode: string;
  secret: string;
  pending: boolean;
  onSubmit: (code: string) => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-text">
        인증 앱(Google Authenticator 등)으로 QR 코드를 찍고, 앱에 보이는 6자리
        숫자를 입력해 주세요.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase가 준 data: URI라 next/image가 필요 없어요 */}
      <img
        src={qrCode}
        alt="인증 앱 등록용 QR 코드"
        width={192}
        height={192}
        className="mx-auto size-48 rounded-md border border-border bg-white p-2"
      />
      <div className="flex flex-col gap-1">
        <p className="text-caption text-text-muted">
          QR을 찍을 수 없으면 앱에 이 키를 직접 입력해 주세요.
        </p>
        <code className="hs-num rounded-md bg-bg-subtle px-3 py-2 text-body-sm break-all text-text tabular-nums select-all">
          {secret}
        </code>
      </div>
      <TotpCodeForm
        pending={pending}
        onSubmit={onSubmit}
        onRestart={onRestart}
      />
    </div>
  );
}
