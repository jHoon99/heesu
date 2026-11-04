"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { turnstileSiteKeyFor } from "../model/consultation";

type TurnstileOptions = {
  sitekey: string;
  language: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, opts: TurnstileOptions): string;
      reset(id: string): void;
      remove(id: string): void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Turnstile({
  onToken,
  resetSignal,
}: {
  onToken: (token: string | null) => void;
  resetSignal: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  // 위젯은 스크립트가 준비될 때 한 번 그리고, 언마운트 때 지운다.
  useEffect(() => {
    return () => {
      if (widgetId.current !== null) {
        window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (resetSignal > 0 && widgetId.current !== null) {
      window.turnstile?.reset(widgetId.current);
    }
  }, [resetSignal]);

  function renderWidget() {
    const el = containerRef.current;
    if (!el || !window.turnstile || widgetId.current !== null) return;
    widgetId.current = window.turnstile.render(el, {
      sitekey: turnstileSiteKeyFor(window.location.hostname),
      language: "ko",
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => {
        onTokenRef.current(null);
        setFailed(true);
      },
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={containerRef} />
      {failed ? (
        <p className="text-caption text-danger-700">
          자동 입력 방지 확인을 불러오지 못했어요. 새로고침하거나 전화로 문의해
          주세요.
        </p>
      ) : null}
    </div>
  );
}
