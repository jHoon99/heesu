import { supabase } from "@/core/supabase/client";

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
