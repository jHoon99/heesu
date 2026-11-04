"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  answerQuestion,
  countUnansweredQuestions,
  listAdminQuestions,
} from "../data/questions";
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
