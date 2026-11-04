import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteVideo,
  getAdminVideo,
  listAdminVideos,
  listRoster,
  updateVideo,
} from "../data/videos";
import { videoKeys } from "./keys";

export function useAdminVideos(classId: string | null) {
  return useQuery({
    queryKey: videoKeys.adminList(classId ?? ""),
    queryFn: () => listAdminVideos(classId as string),
    enabled: classId !== null,
    refetchOnMount: "always",
  });
}

export function useAdminVideo(id: string) {
  return useQuery({
    queryKey: videoKeys.detail(id),
    queryFn: () => getAdminVideo(id),
    refetchOnMount: "always",
  });
}

export function useRoster(classId: string | null) {
  return useQuery({
    queryKey: [...videoKeys.all, "roster", classId ?? ""] as const,
    queryFn: () => listRoster(classId as string),
    enabled: classId !== null,
    refetchOnMount: "always",
  });
}

export function useUpdateVideo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      patch: { title: string; publishedAt: string };
    }) => updateVideo(vars.id, vars.patch),
    onSuccess: () => client.invalidateQueries({ queryKey: videoKeys.all }),
  });
}

export function useDeleteVideo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (video: { id: string; storagePath: string }) =>
      deleteVideo(video),
    onSuccess: () => client.invalidateQueries({ queryKey: videoKeys.all }),
  });
}
