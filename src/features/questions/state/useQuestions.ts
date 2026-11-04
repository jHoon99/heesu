"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  answerQuestion,
  countUnansweredQuestions,
  listAdminQuestions,
  askQuestion,
  listMyQuestions,
  listRecentSessions,
} from "../data/questions";
import { toLocalDateKey } from "@/features/sessions";
import { questionKeys } from "./keys";

export function useAdminQuestions() {
  return useQuery({
    queryKey: questionKeys.admin,
    queryFn: listAdminQuestions,
    refetchOnMount: "always",
  });
}

export function useUnansweredQuestionCount() {
  return useQuery({
    queryKey: questionKeys.unanswered,
    queryFn: countUnansweredQuestions,
    staleTime: 60_000,
  });
}

export function useAnswerQuestion() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (v: { questionId: string; body: string }) =>
      answerQuestion(v.questionId, v.body),
    onSuccess: () => client.invalidateQueries({ queryKey: questionKeys.all }),
  });
  const busy = useRef(false);
  // pending 중 다시 보내도 무시한다.
  async function submit(v: { questionId: string; body: string }) {
    if (busy.current) return false;
    busy.current = true;
    try {
      await mutation.mutateAsync(v);
      return true;
    } finally {
      busy.current = false;
    }
  }
  return { submit, isPending: mutation.isPending };
}

export function useMyQuestions(studentId: string | null) {
  return useQuery({
    queryKey: questionKeys.mine(studentId ?? ""),
    queryFn: listMyQuestions,
    enabled: studentId !== null,
    refetchOnMount: "always",
  });
}

export function useRecentSessions(studentId: string | null) {
  const today = toLocalDateKey(new Date());
  return useQuery({
    queryKey: [...questionKeys.linkOptions(studentId ?? ""), today] as const,
    queryFn: () => listRecentSessions(today),
    enabled: studentId !== null,
  });
}

export function useAskQuestion(studentId: string | null) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (v: Parameters<typeof askQuestion>[0]) => askQuestion(v),
    onSuccess: () => client.invalidateQueries({ queryKey: questionKeys.all }),
  });
  const busy = useRef(false);
  // pending 중 다시 보내도 무시한다.
  async function submit(v: {
    body: string;
    videoId: string | null;
    sessionId: string | null;
  }) {
    if (busy.current || studentId === null) return false;
    busy.current = true;
    try {
      await mutation.mutateAsync(v);
      return true;
    } finally {
      busy.current = false;
    }
  }
  return { submit, isPending: mutation.isPending };
}
