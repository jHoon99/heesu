"use client";

import { useQuery } from "@tanstack/react-query";
import { getGuardianView } from "../data/guardian";
import { isGuardianLinkError } from "../model/guardian";

// 키에 토큰을 넣지 않는다(devtools·캐시 키에 원문이 남지 않게).
export const guardianKeys = {
  all: ["guardian"] as const,
  view: ["guardian", "view"] as const,
  status: (studentId: string) => ["guardian", "status", studentId] as const,
};

export function useGuardianView(token: string | null) {
  return useQuery({
    queryKey: guardianKeys.view,
    queryFn: () => getGuardianView(token as string),
    enabled: token !== null,
    retry: (n, e) => !isGuardianLinkError(e) && n < 2,
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
}
