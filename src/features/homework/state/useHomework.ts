"use client";

import { useCallback, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { toLocalDateKey } from "@/features/sessions";
import { listMyHomework, submitHomework } from "../data/homework";
import type { HomeworkItem } from "../model/homework";

export const homeworkKeys = {
  mine: (studentId: string) => ["homework", "mine", studentId] as const,
};

export function useMyHomework(studentId: string | null) {
  return useQuery({
    queryKey: homeworkKeys.mine(studentId ?? ""),
    queryFn: () =>
      listMyHomework(studentId as string, toLocalDateKey(new Date())),
    enabled: studentId !== null,
  });
}

function setSubmittedAt(
  client: QueryClient,
  studentId: string,
  sessionId: string,
  submittedAt: string | null,
) {
  client.setQueryData<HomeworkItem[]>(homeworkKeys.mine(studentId), (list) =>
    list?.map((i) => (i.sessionId === sessionId ? { ...i, submittedAt } : i)),
  );
}

type Vars = { sessionId: string };

export function useSubmitHomework(studentId: string) {
  const client = useQueryClient();
  const toast = useToast();
  // 같은 숙제를 두 번 누르는 것을 막아요. ref는 즉시, state는 화면 표시용이에요.
  const inFlight = useRef(new Set<string>());
  const [submittingIds, setSubmittingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const finish = (sessionId: string) => {
    inFlight.current.delete(sessionId);
    setSubmittingIds(new Set(inFlight.current));
    // 다른 제출이 진행 중이면 그 낙관적 값을 덮어쓰지 않도록 마지막에 한 번만 다시 불러와요.
    if (inFlight.current.size === 0) {
      void client.invalidateQueries({ queryKey: homeworkKeys.mine(studentId) });
    }
  };

  const mutation = useMutation<
    string,
    unknown,
    Vars,
    { previous: string | null }
  >({
    mutationFn: ({ sessionId }) => submitHomework(sessionId),
    onMutate: async ({ sessionId }) => {
      await client.cancelQueries({ queryKey: homeworkKeys.mine(studentId) });
      const list = client.getQueryData<HomeworkItem[]>(
        homeworkKeys.mine(studentId),
      );
      const previous =
        list?.find((i) => i.sessionId === sessionId)?.submittedAt ?? null;
      setSubmittedAt(client, studentId, sessionId, new Date().toISOString());
      return { previous };
    },
    onSuccess: (serverTime, { sessionId }) =>
      setSubmittedAt(client, studentId, sessionId, serverTime),
    onError: (e, { sessionId }, ctx) => {
      // 이 항목만 되돌려요. 동시에 제출한 다른 항목은 그대로 둬요.
      setSubmittedAt(client, studentId, sessionId, ctx?.previous ?? null);
      toast.show({ tone: "danger", message: classifyError(e).message });
    },
    onSettled: (_d, _e, { sessionId }) => finish(sessionId),
  });

  const { mutate } = mutation;
  const submit = useCallback(
    (sessionId: string) => {
      if (inFlight.current.has(sessionId)) return;
      inFlight.current.add(sessionId);
      setSubmittingIds(new Set(inFlight.current));
      mutate({ sessionId });
    },
    [mutate],
  );

  return { submit, submittingIds };
}
