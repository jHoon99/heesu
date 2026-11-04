"use client";

import Link from "next/link";
import { Button, Card, VideoCard } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useMyStudent } from "@/features/auth";
import { formatDuration } from "../model/videos";
import { watchedPercent } from "../model/views";
import { isNewVideo, videoSubtitle } from "../model/watch";
import { useMyVideos } from "../state/useMyVideos";

export function StudentVideoListScreen() {
  const student = useMyStudent();
  const studentId = student.data?.id ?? null;
  const videos = useMyVideos(studentId);
  const items = videos.data;
  const now = new Date();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-h1 text-text">영상</h1>
      {videos.isError && items === undefined ? (
        <Card>
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-body text-danger-700">
              {classifyError(videos.error).message}
            </p>
            <Button
              variant="secondary"
              block
              onClick={() => void videos.refetch()}
            >
              다시 시도
            </Button>
          </div>
        </Card>
      ) : items === undefined ? (
        <p className="text-body text-text-muted">불러오는 중이에요.</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-body text-text-muted">
            아직 올라온 영상이 없어요. 원장님이 올리면 여기에 보여요.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((v) => (
            <li key={v.id} className="min-w-0">
              <VideoCard
                layout="row"
                href={`/s/videos/watch?id=${v.id}`}
                linkComponent={Link}
                title={v.title}
                subtitle={videoSubtitle(v)}
                duration={formatDuration(v.durationSeconds)}
                progress={watchedPercent(v.watchedSeconds, v.durationSeconds)}
                isNew={isNewVideo(v, now)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
