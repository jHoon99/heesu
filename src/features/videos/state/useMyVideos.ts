"use client";

import { useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createPlaybackUrl,
  getMyVideo,
  listMyVideos,
  type MyVideo,
} from "../data/videos";
import { videoKeys } from "./keys";

const REFRESH_MIN_INTERVAL_MS = 60_000;

export function useMyVideos(studentId: string | null) {
  return useQuery({
    queryKey: videoKeys.mine(studentId ?? ""),
    queryFn: () => listMyVideos(studentId as string),
    enabled: studentId !== null,
    refetchOnMount: "always",
  });
}

export function useMyVideo(id: string, studentId: string | null) {
  return useQuery({
    queryKey: [...videoKeys.mine(studentId ?? ""), id] as const,
    queryFn: () => getMyVideo(id, studentId as string),
    enabled: studentId !== null && id !== "",
    refetchOnMount: "always",
    // 재생 중 다시 불러오면 이어 보기 위치가 흔들려요.
    refetchOnWindowFocus: false,
  });
}

/** 재생 화면을 열 때 발급, 캐시하지 않아요. */
export function usePlaybackUrl(video: MyVideo | null) {
  const lastRefresh = useRef(0);
  const query = useQuery({
    queryKey: videoKeys.playback(video?.id ?? ""),
    queryFn: () => createPlaybackUrl((video as MyVideo).storagePath),
    enabled: video !== null,
    staleTime: Infinity,
    gcTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const { refetch } = query;
  /** 새로 발급한 주소를 돌려줘요(너무 잦거나 실패하면 null). */
  const refresh = useCallback((): Promise<string | null> => {
    const now = Date.now();
    if (now - lastRefresh.current < REFRESH_MIN_INTERVAL_MS) {
      return Promise.resolve(null);
    }
    lastRefresh.current = now;
    return refetch().then((r) => r.data ?? null);
  }, [refetch]);
  return { url: query.data ?? null, isError: query.isError, refresh };
}
