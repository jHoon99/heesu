"use client";

import { useSyncExternalStore } from "react";
import {
  canPromptInstall,
  installPlatform,
  isStandalone,
  subscribeInstallPrompt,
  type InstallPlatform,
} from "@/core/pwa";

const noop = () => () => {};

/** 이미 홈 화면 앱으로 열었으면 true. 서버 그림에는 false. */
export function useIsStandalone(): boolean {
  return useSyncExternalStore(noop, isStandalone, () => true);
}

export function useCanPromptInstall(): boolean {
  return useSyncExternalStore(
    subscribeInstallPrompt,
    canPromptInstall,
    () => false,
  );
}

export function useInstallPlatform(): InstallPlatform {
  return useSyncExternalStore(
    noop,
    () => installPlatform(navigator.userAgent, navigator.maxTouchPoints),
    () => "desktop",
  );
}
