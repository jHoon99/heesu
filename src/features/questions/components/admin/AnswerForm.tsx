"use client";

import { useState } from "react";
import { Button, Input, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { bodySchema, QUESTION_BODY_MAX } from "../../model/questions";
import { useAnswerQuestion } from "../../state/useQuestions";

export function AnswerForm({ questionId }: { questionId: string }) {
  const toast = useToast();
  const answer = useAnswerQuestion();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = bodySchema.safeParse(text);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "내용을 확인해 주세요.");
      return;
    }
    setError(null);
    try {
      const sent = await answer.submit({ questionId, body: parsed.data });
      if (!sent) return;
      setText("");
      toast.show({ tone: "success", message: "답변을 보냈어요." });
    } catch (err) {
      toast.show({
        tone: "danger",
        message: saveErrorMessage(err) || classifyError(err).message,
      });
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-2">
      <Input
        multiline
        size="md"
        label="답변"
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={error}
        hint={`${text.length}/${QUESTION_BODY_MAX}`}
      />
      <div>
        <Button
          type="submit"
          variant="secondary"
          size="md"
          disabled={answer.isPending}
        >
          답변 보내기
        </Button>
      </div>
    </form>
  );
}
