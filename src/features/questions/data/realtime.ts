import { supabase } from "@/core/supabase/client";

export type QuestionScope =
  { kind: "admin" } | { kind: "student"; studentId: string };

export function questionTopic(scope: QuestionScope): string {
  return scope.kind === "admin"
    ? "questions:admin"
    : `questions:student:${scope.studentId}`;
}

/**
 * private 채널로 questions·answers 변경을 듣고, 바뀔 때마다 onChange만 부른다(행 내용은 읽지 않는다).
 * 채널이 (다시) 붙을 때도 onChange를 불러 끊긴 사이 놓친 변경을 메운다.
 * 반환 함수: setAuth가 끝나기 전이면 채널을 아예 만들지 않고, 만든 뒤면 removeChannel을 한 번만 부른다.
 */
export function subscribeQuestionChanges(
  scope: QuestionScope,
  onChange: () => void,
): () => void {
  let cancelled = false;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  void (async () => {
    try {
      await supabase.realtime.setAuth();
    } catch {
      return;
    }
    if (cancelled) return;
    const filter =
      scope.kind === "student" ? `student_id=eq.${scope.studentId}` : undefined;
    channel = supabase
      .channel(questionTopic(scope), { config: { private: true } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter },
        () => onChange(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers" },
        () => onChange(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onChange();
      });
  })();

  return () => {
    if (cancelled) return;
    cancelled = true;
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}
