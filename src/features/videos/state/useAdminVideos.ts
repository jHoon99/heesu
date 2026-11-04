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
    queryKey: videoKeys.roster(classId ?? ""),
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
      patch: { title: string; publishedAt?: string };
    }) => updateVideo(vars.id, vars.patch),
    onSuccess: () => client.invalidateQueries({ queryKey: videoKeys.all }),
  });
}

export function useDeleteVideo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (video: { id: string; storagePath: string }) =>
      deleteVideo(video),
    // 지운 영상의 상세는 다시 불러오지 않아요(없는 영상 화면이 잠깐 보이지 않게).
    // 다시 열면 refetchOnMount: "always"가 새로 불러와요.
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: videoKeys.all,
        predicate: (q) => q.queryKey[1] !== "detail",
      }),
  });
}
