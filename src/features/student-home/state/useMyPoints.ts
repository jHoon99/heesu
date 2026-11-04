"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getMyPointTotal, getMyRank } from "../data/points";

export const pointsKeys = {
  total: (studentId: string) => ["points", studentId, "total"] as const,
  rank: (studentId: string) => ["points", studentId, "rank"] as const,
};

export function useMyPointTotal(
  studentId: string | null,
): UseQueryResult<number> {
  return useQuery({
    queryKey: pointsKeys.total(studentId ?? ""),
    queryFn: () => getMyPointTotal(studentId as string),
    enabled: studentId !== null,
  });
}

export function useMyRank(
  studentId: string | null,
): UseQueryResult<{ rank: number; total: number } | null> {
  return useQuery({
    queryKey: pointsKeys.rank(studentId ?? ""),
    queryFn: getMyRank,
    enabled: studentId !== null,
  });
}
