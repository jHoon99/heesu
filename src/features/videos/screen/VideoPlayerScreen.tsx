"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button, buttonVariants, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useMyStudent } from "@/features/auth";
import { formatDuration } from "../model/videos";
import { videoSubtitle } from "../model/watch";
import { useMyVideo, usePlaybackUrl } from "../state/useMyVideos";
import { useWatchProgress } from "../state/useWatchProgress";

export function VideoPlayerScreen() {
  const id = useSearchParams().get("id") ?? "";
  const student = useMyStudent();
  const studentId = student.data?.id ?? null;
  const query = useMyVideo(id, studentId);
  // 수정 화면처럼 새로 받은 데이터가 올 때까지 재생을 붙이지 않아요.
  const fresh = query.isFetchedAfterMount;
  const video = fresh ? (query.data ?? null) : null;
  const playback = usePlaybackUrl(video);
  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  const [failedOnce, setFailedOnce] = useState(false);
  const errorCount = useRef(0);
  const liveWatched = useWatchProgress(el, video);

  const onPlaying = () => {
    // 다시 재생되면 이후 오류도 한 번씩 다시 발급해 봐요(발급 간격 제한은 refresh가 지켜요).
    errorCount.current = 0;
    setFailedOnce(false);
  };

  const onVideoError = () => {
    errorCount.current += 1;
    if (errorCount.current === 1) {
      void playback.refresh().then((url) => {
        // 같은 초에 다시 발급하면 주소가 같아 src가 안 바뀌니 직접 다시 읽어요.
        if (url !== null && el !== null && el.getAttribute("src") === url) {
          el.load();
        }
      });
    } else setFailedOnce(true);
  };

  const back = (
    <Link
      href="/s/videos"
      className="inline-flex items-center gap-1 text-label text-text-brand"
    >
      <ChevronLeft size={18} aria-hidden="true" />
      영상 목록
    </Link>
  );

  if (query.isError && query.data === undefined) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {back}
        <Card>
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-body text-danger-700">
              {classifyError(query.error).message}
            </p>
            <Button
              variant="secondary"
              block
              onClick={() => void query.refetch()}
            >
              다시 시도
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  if (query.data === undefined || !fresh) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {back}
        <p className="text-body text-text-muted">불러오는 중이에요.</p>
      </div>
    );
  }
  if (video === null) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {back}
        <Card>
          <p role="alert" className="text-body text-text-muted">
            영상을 찾을 수 없어요. 목록에서 다시 골라 주세요.
          </p>
        </Card>
      </div>
    );
  }

  const failed = failedOnce || (playback.isError && playback.url === null);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {back}
      {failed ? (
        <Card>
          <p role="alert" className="text-body text-danger-700">
            영상을 열 수 없어요. 목록으로 돌아가 다시 골라 주세요.
          </p>
        </Card>
      ) : playback.url === null ? (
        <p className="text-body text-text-muted">불러오는 중이에요.</p>
      ) : (
        <video
          ref={setEl}
          controls
          playsInline
          preload="metadata"
          src={playback.url}
          onError={onVideoError}
          onPlaying={onPlaying}
          className="aspect-video w-full rounded-xl bg-brown-900"
        />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-h2 break-words text-text">{video.title}</h1>
        <p className="text-body-sm text-text-muted">{videoSubtitle(video)}</p>
        <p className="text-body-sm text-text-muted">
          {formatDuration(Math.max(video.watchedSeconds, liveWatched ?? 0))} /{" "}
          {formatDuration(video.durationSeconds)} 봤어요
        </p>
      </div>
      <Link
        href={`/s/questions?video=${video.id}`}
        className={buttonVariants({
          variant: "secondary",
          size: "lg",
          block: true,
        })}
      >
        질문하기
      </Link>
    </div>
  );
}
