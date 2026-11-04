"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  questionTopic,
  subscribeQuestionChanges,
  type QuestionScope,
} from "../data/realtime";
import { questionKeys } from "./keys";

const ADMIN_SCOPE: QuestionScope = { kind: "admin" };

export function useQuestionsRealtime(scope: QuestionScope | null): void {
  const client = useQueryClient();
  // 매 렌더 새 객체여도 다시 구독하지 않도록 주제 문자열로 의존한다.
  const topic = scope ? questionTopic(scope) : null;
  useEffect(() => {
    if (!scope) return;
    return subscribeQuestionChanges(scope, () => {
      void client.invalidateQueries({ queryKey: questionKeys.all });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- topic이 scope를 대신한다
  }, [topic, client]);
}

export function useAdminQuestionFeed(): void {
  useQuestionsRealtime(ADMIN_SCOPE);
}
