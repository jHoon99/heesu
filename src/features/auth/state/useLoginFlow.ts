"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authKeys, fetchMyRole, homePathFor, type Role } from "@/core/auth";
import * as auth from "../data/auth";
import {
  authErrorMessage,
  planMfaStep,
  toAuthEmail,
  totpCodeSchema,
} from "../model/login";

export type LoginStep =
  | { kind: "checking" }
  | { kind: "credentials" }
  | { kind: "enroll"; factorId: string; qrCode: string; secret: string }
  | { kind: "verify"; factorId: string };

const NO_ACCOUNT = "로그인할 수 없는 계정이에요. 학원에 문의해 주세요.";
const NO_PASSWORD = "비밀번호를 입력해 주세요.";

// 로그아웃이 실패해도(네트워크 등) data 쪽에서 이 기기의 세션은 지워요.
async function safeSignOut() {
  try {
    await auth.signOut();
  } catch {
    // 로컬 세션은 이미 지워졌어요.
  }
}

export function useLoginFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<LoginStep>({ kind: "checking" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  // 기대한 역할일 때만 홈으로 보내요. 아니면 로그아웃해요.
  const finish = useCallback(
    async (expected: Role) => {
      const role = await fetchMyRole();
      if (role !== expected) {
        await safeSignOut();
        setStep({ kind: "credentials" });
        setError(NO_ACCOUNT);
        return;
      }
      setStep({ kind: "checking" });
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      router.replace(homePathFor(role));
    },
    [queryClient, router],
  );

  const firstVerifiedFactor = useCallback(async () => {
    const plan = planMfaStep(await auth.listTotpFactors());
    return plan.kind === "verify" ? plan.factorId : null;
  }, []);

  // 이미 세션이 있으면 이어서 진행해요.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const level = await auth.getAssurance();
        if (cancelled) return;
        if (level.current === null) {
          setStep({ kind: "credentials" });
          return;
        }
        if (level.current === "aal1" && level.next === "aal2") {
          const factorId = await firstVerifiedFactor();
          if (cancelled) return;
          if (factorId) {
            setStep({ kind: "verify", factorId });
            return;
          }
        } else {
          const role = await fetchMyRole();
          if (cancelled) return;
          if (role) {
            await queryClient.invalidateQueries({ queryKey: authKeys.all });
            if (!cancelled) router.replace(homePathFor(role));
            return;
          }
        }
        await safeSignOut();
        if (!cancelled) setStep({ kind: "credentials" });
      } catch (e) {
        if (cancelled) return;
        setError(authErrorMessage(e));
        setStep({ kind: "credentials" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firstVerifiedFactor, queryClient, router]);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  const submitCredentials = useCallback(
    (input: string, password: string) =>
      run(async () => {
        const target = toAuthEmail(input);
        if (!target.ok) {
          setError(target.message);
          return;
        }
        if (password === "") {
          setError(NO_PASSWORD);
          return;
        }
        await auth.signInWithPassword(target.email, password);
        if (target.kind === "student") {
          await finish("student");
          return;
        }
        const plan = planMfaStep(await auth.listTotpFactors());
        if (plan.kind === "verify") {
          setStep({ kind: "verify", factorId: plan.factorId });
          return;
        }
        for (const id of plan.unenrollIds) await auth.unenrollFactor(id);
        setStep({ kind: "enroll", ...(await auth.enrollTotp()) });
      }),
    [finish, run],
  );

  const submitCode = useCallback(
    (code: string) =>
      run(async () => {
        if (step.kind !== "enroll" && step.kind !== "verify") return;
        const parsed = totpCodeSchema.safeParse(code.trim());
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? null);
          return;
        }
        await auth.verifyTotp(step.factorId, parsed.data);
        await finish("admin");
      }),
    [finish, run, step],
  );

  const restart = useCallback(
    () =>
      run(async () => {
        await safeSignOut();
        setStep({ kind: "credentials" });
      }),
    [run],
  );

  return { step, error, pending, submitCredentials, submitCode, restart };
}
