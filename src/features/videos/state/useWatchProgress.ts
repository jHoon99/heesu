"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/design-system";
import { saveVideoProgress, type MyVideo } from "../data/videos";
import { videoKeys } from "./keys";
import { advanceFurthest, resumePosition } from "../model/watch";

export const PROGRESS_SAVE_INTERVAL_MS = 10_000;
const FAILURES_BEFORE_TOAST = 3;
const FAILURE_MESSAGE =
  "시청 위치를 저장하지 못하고 있어요. 인터넷 연결을 확인해 주세요.";

function seekTo(media: HTMLVideoElement, seconds: number): void {
  media.currentTime = seconds;
}

/**
 * 시청 위치와 "본 구간"을 저장해요. 건너뛴 구간은 본 것으로 치지 않아요.
 * 저장 실패는 삼키고 다음 주기에 다시 해요.
 */
export function useWatchProgress(
  el: HTMLVideoElement | null,
  video: MyVideo | null,
): void {
  const client = useQueryClient();
  const toast = useToast();
  const showRef = useRef(toast.show);
  const videoRef = useRef(video);
  const videoId = video?.id ?? null;

  useEffect(() => {
    showRef.current = toast.show;
    videoRef.current = video;
  });

  useEffect(() => {
    const v = videoRef.current;
    if (el === null || v === null || v.id !== videoId) return;

    const id = v.id;
    let furthest = v.watchedSeconds;
    // 건너뛰고 나간 기록이면 본 구간 끝에서 이어요.
    let position = resumePosition(
      Math.min(v.positionSeconds, v.watchedSeconds),
      v.durationSeconds,
    );
    let last = position;
    let saved = { position: v.positionSeconds, watched: v.watchedSeconds };
    let failures = 0;
    let toasted = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const save = (): Promise<void> => {
      // 주소를 바꾸는 중(메타데이터 전)에는 위치가 0으로 보여서 저장하지 않아요.
      if (el.readyState === 0) return Promise.resolve();
      const p = Math.floor(el.currentTime);
      const w = Math.floor(furthest);
      if (p === saved.position && w === saved.watched) return Promise.resolve();
      saved = { position: p, watched: w };
      return saveVideoProgress(id, p, w).then(
        () => {
          failures = 0;
        },
        () => {
          // 다음 주기에 다시 저장하도록 마지막 저장값을 무효화해요.
          saved = { position: -1, watched: -1 };
          failures += 1;
          if (failures >= FAILURES_BEFORE_TOAST && !toasted) {
            toasted = true;
            showRef.current({ tone: "danger", message: FAILURE_MESSAGE });
          }
        },
      );
    };

    const onLoadedMetadata = () => {
      if (position > 0) seekTo(el, position);
      last = el.currentTime;
    };
    const onTimeUpdate = () => {
      if (el.readyState === 0) return;
      const current = el.currentTime;
      furthest = advanceFurthest(furthest, last, current);
      last = current;
      position = current;
    };
    const stopTimer = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const onPlay = () => {
      if (timer === null)
        timer = setInterval(() => void save(), PROGRESS_SAVE_INTERVAL_MS);
    };
    const onPause = () => {
      stopTimer();
      void save();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void save();
    };

    if (el.readyState >= 1) onLoadedMetadata();
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
      document.removeEventListener("visibilitychange", onVisibility);
      stopTimer();
      // 목록의 진행률은 화면을 떠날 때만 다시 불러와요.
      void save().then(() =>
        client.invalidateQueries({ queryKey: videoKeys.allMine }),
      );
    };
  }, [el, videoId, client]);
}
