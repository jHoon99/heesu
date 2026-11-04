import { dayLabelOf, formatShortDate } from "@/features/sessions";
import type { MyVideo } from "@/features/videos";

export type LinkOption = { value: string; label: string };

export type RecentSession = { id: string; date: string; className: string };

export function buildLinkOptions(
  videos: Pick<MyVideo, "id" | "title">[],
  sessions: RecentSession[],
): LinkOption[] {
  return [
    { value: "", label: "연결 안 함" },
    ...videos.map((v) => ({
      value: `video:${v.id}`,
      label: `영상 · ${v.title}`,
    })),
    ...sessions.map((s) => ({
      value: `session:${s.id}`,
      label: `수업 · ${formatShortDate(s.date)}(${dayLabelOf(s.date)}) ${s.className}`,
    })),
  ];
}

export function parseLinkValue(value: string): {
  videoId: string | null;
  sessionId: string | null;
} {
  if (value.startsWith("video:"))
    return { videoId: value.slice(6), sessionId: null };
  if (value.startsWith("session:"))
    return { videoId: null, sessionId: value.slice(8) };
  return { videoId: null, sessionId: null };
}

/** 목록에 있는 값만 쓰고, 없으면 연결 안 함. */
export function initialLinkValue(
  params: { video: string | null; session: string | null },
  options: LinkOption[],
): string {
  const want = params.video
    ? `video:${params.video}`
    : params.session
      ? `session:${params.session}`
      : "";
  return options.some((o) => o.value === want) ? want : "";
}
