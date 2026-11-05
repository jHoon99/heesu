import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMaterial,
  listClassMaterials,
  listMyMaterials,
  materialDownloadUrl,
  uploadMaterial,
} from "../data/materials";

export const materialKeys = {
  all: ["materials"] as const,
  byClass: (classId: string) => ["materials", "class", classId] as const,
  mine: ["materials", "mine"] as const,
};

export function useClassMaterials(classId: string | null) {
  return useQuery({
    queryKey: materialKeys.byClass(classId ?? ""),
    queryFn: () => listClassMaterials(classId as string),
    enabled: classId !== null,
  });
}

export function useMyMaterials() {
  return useQuery({
    queryKey: materialKeys.mine,
    queryFn: listMyMaterials,
  });
}

export function useUploadMaterial() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: uploadMaterial,
    onSettled: () => client.invalidateQueries({ queryKey: materialKeys.all }),
  });
}

export function useDeleteMaterial() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteMaterial,
    onSettled: () => client.invalidateQueries({ queryKey: materialKeys.all }),
  });
}

/** 누르면 짧은 주소를 받아 바로 내려받아요. */
export function useDownloadMaterial() {
  return useMutation({
    mutationFn: async (m: { storagePath: string; fileName: string }) => {
      const url = await materialDownloadUrl(m);
      window.location.assign(url);
    },
  });
}
