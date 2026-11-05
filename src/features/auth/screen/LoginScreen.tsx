"use client";

import { Card } from "@/design-system";
import { InstallAppButton } from "@/features/install-app";
import { CredentialsForm } from "../components/CredentialsForm";
import { TotpEnroll } from "../components/TotpEnroll";
import { TotpVerify } from "../components/TotpVerify";
import { useLoginFlow } from "../state/useLoginFlow";

export function LoginScreen() {
  const { step, error, pending, submitCredentials, submitCode, restart } =
    useLoginFlow();

  if (step.kind === "checking") {
    return <div aria-busy="true" className="min-h-dvh bg-bg-page" />;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-page px-4 py-10">
      <Card tone="raised" size="lg" className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기 */}
          <img src="/brand/heesu-mark.svg" alt="" className="size-12" />
          <h1 className="font-serif text-h2 text-text">희수영어 로그인</h1>
        </div>
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {error}
          </p>
        ) : null}
        {step.kind === "credentials" ? (
          <CredentialsForm pending={pending} onSubmit={submitCredentials} />
        ) : step.kind === "enroll" ? (
          <TotpEnroll
            qrCode={step.qrCode}
            secret={step.secret}
            pending={pending}
            onSubmit={submitCode}
            onRestart={restart}
          />
        ) : (
          <TotpVerify
            pending={pending}
            onSubmit={submitCode}
            onRestart={restart}
          />
        )}
      </Card>
      <div className="mt-4 flex w-full max-w-[400px] flex-col items-center gap-1 text-center">
        <p className="text-body-sm text-text-muted">
          학생은 로그인 전에 홈 화면에 앱을 추가해 두면 편해요.
        </p>
        <InstallAppButton variant="ghost" />
      </div>
    </main>
  );
}
