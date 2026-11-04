"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listConsultations,
  updateConsultation,
} from "../data/adminConsultations";
import type { ConsultationStatus } from "../model/adminConsultation";

export const consultationKeys = {
  all: ["consultations"] as const,
  list: ["consultations", "list"] as const,
  newCount: ["consultations", "newCount"] as const,
};

export function useConsultations() {
  return useQuery({
    queryKey: consultationKeys.list,
    queryFn: listConsultations,
    refetchOnMount: "always",
  });
}

export function useUpdateConsultation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      id: string;
      status: ConsultationStatus;
      memo: string | null;
    }) => updateConsultation(v.id, { status: v.status, memo: v.memo }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: consultationKeys.all }),
  });
}
