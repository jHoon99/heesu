"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGuardianLinkStatus,
  getGuardianView,
  issueGuardianToken,
} from "../data/guardian";
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

export function useGuardianLinkStatus(studentId: string) {
  return useQuery({
    queryKey: guardianKeys.status(studentId),
    queryFn: () => getGuardianLinkStatus(studentId),
    refetchOnMount: "always",
  });
}

// 원문 토큰을 돌려받으니 캐시에 남기지 않는다: gcTime 0, 호출한 쪽이 reset().
export function useIssueGuardianToken(studentId: string) {
  const client = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: () => issueGuardianToken(studentId),
    onSettled: () =>
      client.invalidateQueries({ queryKey: guardianKeys.status(studentId) }),
  });
}
