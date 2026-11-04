import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { removeVideoObject } from "./upload";

export type AdminVideo = {
  id: string;
  classId: string;
  title: string;
  storagePath: string;
  durationSeconds: number;
  publishedAt: string;
  views: { studentId: string; watchedSeconds: number; updatedAt: string }[];
};

export async function createVideo(input: {
  classId: string;
  title: string;
  storagePath: string;
  durationSeconds: number;
  publishedAt: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("videos")
    .insert({
      class_id: input.classId,
      title: input.title,
      storage_path: input.storagePath,
      duration_seconds: input.durationSeconds,
      published_at: input.publishedAt,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

const ADMIN_COLUMNS =
  "id, class_id, title, storage_path, duration_seconds, published_at, video_views(student_id, watched_seconds, updated_at)";

type AdminRow = {
  id: string;
  class_id: string;
  title: string;
  storage_path: string;
  duration_seconds: number;
  published_at: string;
  video_views: {
    student_id: string;
    watched_seconds: number;
    updated_at: string;
  }[];
};

function toAdminVideo(r: AdminRow): AdminVideo {
  return {
    id: r.id,
    classId: r.class_id,
    title: r.title,
    storagePath: r.storage_path,
    durationSeconds: r.duration_seconds,
    publishedAt: r.published_at,
    views: r.video_views.map((v) => ({
      studentId: v.student_id,
      watchedSeconds: v.watched_seconds,
      updatedAt: v.updated_at,
    })),
  };
}

export async function listAdminVideos(classId: string): Promise<AdminVideo[]> {
  const { data, error } = await supabase
    .from("videos")
    .select(ADMIN_COLUMNS)
    .eq("class_id", classId)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data.map(toAdminVideo);
}

export async function getAdminVideo(id: string): Promise<AdminVideo | null> {
  const { data, error } = await supabase
    .from("videos")
    .select(ADMIN_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toAdminVideo(data) : null;
}

/** 퇴원생을 뺀 반 명단(이름순). */
export async function listRoster(
  classId: string,
): Promise<{ studentId: string; name: string }[]> {
  const { data, error } = await supabase
    .from("class_roster")
    .select("student_id, name")
    .eq("class_id", classId)
    .order("name");
  if (error) throw error;
  return data.flatMap((r) =>
    r.student_id === null || r.name === null
      ? []
      : [{ studentId: r.student_id, name: r.name }],
  );
}

export async function updateVideo(
  id: string,
  patch: { title: string; publishedAt?: string },
): Promise<void> {
  const { data, error } = await supabase
    .from("videos")
    .update(
      patch.publishedAt === undefined
        ? { title: patch.title }
        : { title: patch.title, published_at: patch.publishedAt },
    )
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
}

/**
 * 행을 먼저 지워요(이 순간 학생 접근이 끊겨요). 그다음 파일을 지우고,
 * 파일 삭제가 실패해도 행은 되살리지 않아요.
 */
export async function deleteVideo(video: {
  id: string;
  storagePath: string;
}): Promise<{ fileRemoved: boolean }> {
  const { data, error } = await supabase
    .from("videos")
    .delete()
    .eq("id", video.id)
    .select("id");
  if (error) throw error;
  if (data.length === 0) throw new SaveNotAppliedError();
  try {
    await removeVideoObject(video.storagePath);
    return { fileRemoved: true };
  } catch {
    return { fileRemoved: false };
  }
}
