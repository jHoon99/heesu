import * as tus from "tus-js-client";
import { env } from "@/core/env";
import { supabase } from "@/core/supabase/client";

export const VIDEO_BUCKET = "videos";

/** Supabase TUS는 6MB 조각만 받아요. */
const CHUNK_SIZE = 6 * 1024 * 1024;
const RETRY_DELAYS = [0, 3000, 5000, 10000, 20000];

export function resumableEndpoint(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/upload/resumable`;
}

export function newStoragePath(classId: string): string {
  return `${classId}/${crypto.randomUUID()}.mp4`;
}

/** `abort()`로 멈춘 업로드의 `done`이 이 오류로 끝나요. 화면에는 보이지 않아요. */
export class UploadCancelledError extends Error {
  constructor() {
    super("업로드를 취소했어요.");
    this.name = "UploadCancelledError";
  }
}

const UUID_MP4 = "[0-9a-f-]{36}\\.mp4";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type VideoUploadHandle = {
  /** 다 올라가면 storage 경로로 resolve, tus 오류면 그 오류로 reject. */
  done: Promise<string>;
  /** 멈추고 서버의 부분 업로드도 지워요. */
  abort: () => Promise<void>;
};

/**
 * 영상 파일을 TUS로 이어 올려요. 같은 파일을 같은 반에 올리다 끊긴 적이 있으면
 * 그 업로드(같은 경로)를 이어서 올려요. 토큰은 요청마다 최신 세션에서 넣고,
 * 로그로 남기지 않아요.
 */
export function startVideoUpload(
  file: File,
  classId: string,
  onProgress: (sent: number, total: number) => void,
): VideoUploadHandle {
  let path = newStoragePath(classId);
  let aborted = false;
  let resolveDone: (path: string) => void = () => {};
  let rejectDone: (e: unknown) => void = () => {};
  const done = new Promise<string>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  // 아무도 기다리지 않는 취소가 처리 안 된 rejection으로 남지 않게 해요.
  done.catch(() => {});

  const metadata: Record<string, string> = {
    bucketName: VIDEO_BUCKET,
    objectName: path,
    contentType: "video/mp4",
    cacheControl: "3600",
  };

  const upload = new tus.Upload(file, {
    endpoint: resumableEndpoint(env.supabaseUrl),
    chunkSize: CHUNK_SIZE,
    retryDelays: RETRY_DELAYS,
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    headers: { "x-upsert": "false" },
    metadata,
    onBeforeRequest: async (req) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) req.setHeader("authorization", `Bearer ${token}`);
      req.setHeader("apikey", env.supabasePublishableKey);
    },
    onProgress: (sent, total) => onProgress(sent, total),
    onSuccess: () => resolveDone(path),
    onError: (e) => rejectDone(e),
  });

  const ready = upload
    .findPreviousUploads()
    .then((previous) => {
      const ours = new RegExp(`^${escapeRegExp(classId)}/${UUID_MP4}$`);
      const same = previous.find((p) =>
        ours.test(p.metadata?.objectName ?? ""),
      );
      if (same) {
        path = same.metadata.objectName as string;
        metadata.objectName = path;
        upload.resumeFromPreviousUpload(same);
      }
      if (!aborted) upload.start();
    })
    .catch((e: unknown) => rejectDone(e));

  return {
    done,
    abort: async () => {
      aborted = true;
      // 아직 시작 전이어도 done이 끝나게 해요(onSuccess·onError는 abort 뒤 오지 않아요).
      rejectDone(new UploadCancelledError());
      await ready;
      await upload.abort(true);
    },
  };
}

/**
 * 올린 영상 파일을 지워요. storage `remove()`는 파일이 없거나 RLS가 막아도
 * `{ data: [], error: null }`을 돌려주니, 지운 행이 정확히 1개가 아니면 실패로 봐요.
 */
export async function removeVideoObject(path: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .remove([path]);
  if (error) throw error;
  if (data?.length !== 1) {
    throw new Error("영상 파일을 지우지 못했어요.");
  }
}
