import { z } from "zod";
import { CONTROL_CHAR_MESSAGE, hasControlChars } from "@/core/text";

export const VIDEO_TITLE_MAX = 100;

/**
 * 클라우드 Free의 파일당 전역 한도(50 MiB)예요. 버킷 `videos`의 file_size_limit은 1 GiB(Pro 목표)지만
 * 전역 한도가 우선해서, 올리기 전에 먼저 막아요. Pro 전환 때 1 GiB로 되돌려요.
 */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const MP4_ONLY_MESSAGE =
  "mp4 파일만 올릴 수 있어요. 파일 형식을 확인해 주세요.";
export const FILE_TOO_LARGE_MESSAGE =
  "파일이 너무 커요. 50MB 이하로 영상을 나누거나 화질을 낮춰 다시 올려 주세요.";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 5 → `0:05`, 760 → `12:40`, 3723 → `1:02:03`. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** 공개일 `YYYY-MM-DD` → 그날 서울 0시. */
export function publishedAtFromDate(date: string): string {
  return `${date}T00:00:00+09:00`;
}

/** 바이트 → `3.0`(MB, 소수 한 자리). */
export function formatMegabytes(bytes: number): string {
  return (bytes / 1048576).toFixed(1);
}

export const videoFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해 주세요.")
    .max(VIDEO_TITLE_MAX, "제목은 100자까지 쓸 수 있어요.")
    .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE),
  classId: z.string().min(1, "반을 골라 주세요."),
  publishedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "공개일을 골라 주세요."),
});

export type VideoFormValues = z.infer<typeof videoFormSchema>;

export function isMp4File(file: File): boolean {
  return file.type === "video/mp4" || /\.mp4$/i.test(file.name);
}

const SCHOOL_TAG_MESSAGE = "학교 이름은 40자까지 쓸 수 있어요.";

/** 내신 강의실 꼬리표: 빈칸이면 null(반 수업 영상). 학생 화면의 학교와 같게 적어 주세요. */
export const schoolTagSchema = z
  .string()
  .trim()
  .refine((v) => [...v].length <= 40, SCHOOL_TAG_MESSAGE)
  .refine((v) => !hasControlChars(v), CONTROL_CHAR_MESSAGE)
  .transform((v) => (v === "" ? null : v));
