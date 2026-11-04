"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** 랜딩 관리 미리보기 창 안에서 열렸는지 알려줘요. 정적 HTML을 만들 때는 false예요. */
export function useIsFramed(): boolean {
  return useSyncExternalStore(
    noop,
    () => window.self !== window.top,
    () => false,
  );
}
