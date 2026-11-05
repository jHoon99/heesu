"use client";

import { X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useIsStandalone } from "../state/useInstall";
import { InstallAppButton } from "./InstallAppButton";

const KEY = "hs-install-banner-hidden-until";
const HIDE_DAYS = 7;

function hiddenNow(): boolean {
  try {
    return Number(localStorage.getItem(KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/** 학생 화면 맨 위 안내 띠. 닫으면 7일 동안 안 보여요. 홈 화면 앱으로 열면 안 보여요. */
export function InstallBanner() {
  const standalone = useIsStandalone();
  const stored = useSyncExternalStore(
    () => () => {},
    hiddenNow,
    () => true,
  );
  const [closed, setClosed] = useState(false);
  if (standalone || stored || closed) return null;

  function close() {
    try {
      localStorage.setItem(KEY, String(Date.now() + HIDE_DAYS * 86_400_000));
    } catch {
      // 저장이 막힌 브라우저면 이번만 닫아요.
    }
    setClosed(true);
  }

  return (
    <section
      aria-label="앱 설치 안내"
      className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-bg-surface p-4"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기 */}
        <img
          src="/icons/icon-192.png"
          alt=""
          className="size-10 shrink-0 rounded-md"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body font-semibold text-text">
            희수영어를 앱처럼 쓰세요
          </p>
          <p className="text-body-sm text-text-muted">
            홈 화면에 추가하면 아이콘 한 번으로 바로 열려요.
          </p>
        </div>
        <button
          type="button"
          aria-label="설치 안내 닫기"
          onClick={close}
          className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-md text-text-muted"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <InstallAppButton variant="primary" block />
    </section>
  );
}
