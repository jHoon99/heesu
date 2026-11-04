"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import {
  removeVideoObject,
  UploadCancelledError,
  startVideoUpload,
  type VideoUploadHandle,
} from "../data/upload";
import { createVideo } from "../data/videos";
import { uploadErrorMessage } from "../model/upload";
import { publishedAtFromDate } from "../model/videos";
import { videoKeys } from "./keys";

export type UploadState = {
  phase: "idle" | "uploading" | "saving" | "done" | "error";
  sent: number;
  total: number;
  error: string | null;
  videoId: string | null;
};

export type UploadInput = {
  file: File;
  classId: string;
  title: string;
  publishedDate: string;
  durationSeconds: number;
};

const IDLE: UploadState = {
  phase: "idle",
  sent: 0,
  total: 0,
  error: null,
  videoId: null,
};

export function useUploadVideo(): {
  state: UploadState;
  start(input: UploadInput): Promise<void>;
  cancel(): Promise<void>;
} {
  const client = useQueryClient();
  const toast = useToast();
  const [state, setState] = useState<UploadState>(IDLE);
  const busy = useRef(false);
  const run = useRef(0);
  const handle = useRef<VideoUploadHandle | null>(null);

  const start = useCallback(
    async (input: UploadInput) => {
      if (busy.current) return;
      busy.current = true;
      const id = ++run.current;
      const current = () => run.current === id;
      setState({ ...IDLE, phase: "uploading", total: input.file.size });

      let path: string;
      try {
        const h = startVideoUpload(input.file, input.classId, (sent, total) => {
          if (current()) setState((s) => ({ ...s, sent, total }));
        });
        handle.current = h;
        path = await h.done;
      } catch (e) {
        if (!current() || e instanceof UploadCancelledError) return;
        handle.current = null;
        busy.current = false;
        setState((s) => ({
          ...s,
          phase: "error",
          error: uploadErrorMessage(e),
        }));
        return;
      }
      if (!current()) return;
      handle.current = null;
      setState((s) => ({ ...s, phase: "saving" }));

      try {
        const { id: videoId } = await createVideo({
          classId: input.classId,
          title: input.title,
          storagePath: path,
          durationSeconds: input.durationSeconds,
          publishedAt: publishedAtFromDate(input.publishedDate),
        });
        busy.current = false;
        setState((s) => ({ ...s, phase: "done", videoId }));
        void client.invalidateQueries({ queryKey: videoKeys.all });
      } catch (e) {
        const message = classifyError(e).message;
        let removed = true;
        try {
          await removeVideoObject(path);
        } catch {
          removed = false;
        }
        busy.current = false;
        setState((s) => ({
          ...s,
          phase: "error",
          error: removed
            ? `${message} 올린 파일은 지웠어요. 다시 올려 주세요.`
            : `${message} 다시 올려 주세요.`,
        }));
        if (!removed) {
          toast.show({
            tone: "danger",
            message:
              "올린 파일을 지우지 못했어요. 목록에 없는 파일이 저장 공간에 남아 있을 수 있어요.",
          });
        }
      }
    },
    [client, toast],
  );

  const cancel = useCallback(async () => {
    const h = handle.current;
    if (h === null) return;
    run.current += 1;
    handle.current = null;
    try {
      await h.abort();
    } catch {
      // 서버의 부분 업로드를 못 지워도 화면은 처음으로 돌아가요.
    }
    busy.current = false;
    setState(IDLE);
  }, []);

  const active = state.phase === "uploading" || state.phase === "saving";
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  return { state, start, cancel };
}
