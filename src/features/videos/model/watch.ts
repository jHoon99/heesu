import {
  dayLabelOf,
  formatShortDate,
  toLocalDateKey,
} from "@/features/sessions";
import type { MyVideo } from "../data/videos";

export const NEW_VIDEO_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const RESUME_MIN_SECONDS = 5;
/** 한 번의 timeupdate에서 "이어서 본 것"으로 인정하는 최대 증가(초). */
const MAX_STEP_SECONDS = 3;

export function isNewVideo(
  v: Pick<MyVideo, "publishedAt" | "watchedSeconds">,
  now: Date,
): boolean {
  const age = now.getTime() - new Date(v.publishedAt).getTime();
  return age <= NEW_VIDEO_DAYS * DAY_MS && v.watchedSeconds === 0;
}

export function resumePosition(position: number, duration: number): number {
  return position >= RESUME_MIN_SECONDS &&
    position < duration - RESUME_MIN_SECONDS
    ? position
    : 0;
}

/** 건너뛴 구간은 본 것으로 치지 않아요: 자연스러운 재생 진행일 때만 늘려요. */
export function advanceFurthest(
  furthest: number,
  last: number,
  current: number,
): number {
  const step = current - last;
  if (
    step > 0 &&
    step <= MAX_STEP_SECONDS &&
    last <= furthest + MAX_STEP_SECONDS
  ) {
    return Math.max(furthest, current);
  }
  return furthest;
}

export function videoSubtitle(v: MyVideo): string {
  const key = toLocalDateKey(new Date(v.publishedAt));
  return `${v.className} · ${formatShortDate(key)}(${dayLabelOf(key)})`;
}
