"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/core/supabase/database.types";
import { getSiteContent } from "../data/getSiteContent";
import { saveSiteContent } from "../data/saveSiteContent";
import { uploadSiteImage } from "../data/siteImages";
import type { SiteContentKey } from "../model/siteContentWrite";

// 랜딩·학생 홈의 useSiteContent와 같은 키(raw 행을 캐시에 둔다).
const SITE_CONTENT_KEY = ["site-content"] as const;

export function useSiteContentRows() {
  return useQuery({
    queryKey: SITE_CONTENT_KEY,
    queryFn: getSiteContent,
    refetchOnMount: "always",
  });
}

export function useSaveSiteContent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { key: SiteContentKey; value: NonNullable<Json> }) =>
      saveSiteContent(v.key, v.value),
    onSuccess: () => client.invalidateQueries({ queryKey: SITE_CONTENT_KEY }),
  });
}

export function useUploadSiteImage() {
  return useMutation({ mutationFn: (file: File) => uploadSiteImage(file) });
}
