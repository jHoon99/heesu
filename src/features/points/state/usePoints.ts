"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addManualPoints,
  listPointHistory,
  listPointTotals,
} from "../data/points";
import type { ManualPointOutput } from "../model/points";

export const pointKeys = {
  all: ["points"] as const,
  totals: ["points", "totals"] as const,
  history: (id: string) => ["points", "history", id] as const,
};

export function usePointTotals() {
  return useQuery({
    queryKey: pointKeys.totals,
    queryFn: listPointTotals,
  });
}

export function usePointHistory(studentId: string | null) {
  return useQuery({
    queryKey: pointKeys.history(studentId ?? ""),
    queryFn: () => listPointHistory(studentId as string),
    enabled: studentId !== null,
  });
}

export function useAddManualPoints() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { studentId: string; input: ManualPointOutput }) =>
      addManualPoints(vars.studentId, vars.input),
    onSuccess: () => client.invalidateQueries({ queryKey: pointKeys.all }),
  });
}
