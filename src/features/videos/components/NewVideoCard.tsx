"use client";

import Link from "next/link";
import { Card, VideoCard } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { formatDuration } from "../model/videos";
import { watchedPercent } from "../model/views";
import { isNewVideo, videoSubtitle } from "../model/watch";
import { useMyVideos } from "../state/useMyVideos";

export function NewVideoCard({ studentId }: { studentId: string }) {
  const videos = useMyVideos(studentId);
  const latest = videos.data?.[0];
  return (
    <Card
      title="새 영상"
      actions={
        <Link href="/s/videos" className="text-label text-text-brand">
          전체 보기
        </Link>
      }
    >
      {videos.isError && videos.data === undefined ? (
        <p role="alert" className="text-body text-danger-700">
          {classifyError(videos.error).message}
        </p>
      ) : videos.data === undefined ? (
        <p className="text-body text-text-muted">불러오는 중이에요.</p>
      ) : latest === undefined ? (
        <p className="text-body text-text-muted">아직 새 영상이 없어요.</p>
      ) : (
        <VideoCard
          layout="column"
          href={`/s/videos/watch?id=${latest.id}`}
          linkComponent={Link}
          title={latest.title}
          subtitle={videoSubtitle(latest)}
          duration={formatDuration(latest.durationSeconds)}
          progress={watchedPercent(
            latest.watchedSeconds,
            latest.durationSeconds,
          )}
          isNew={isNewVideo(latest, new Date())}
        />
      )}
    </Card>
  );
}
