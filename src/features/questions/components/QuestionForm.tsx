"use client";

import { useState } from "react";
import { Button, Card, Input, Select, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { useMyVideos } from "@/features/videos";
import {
  buildLinkOptions,
  initialLinkValue,
  parseLinkValue,
} from "../model/linkOptions";
import { bodySchema, QUESTION_BODY_MAX } from "../model/questions";
import { useAskQuestion, useRecentSessions } from "../state/useQuestions";

export function QuestionForm({
  studentId,
  initialLink,
}: {
  studentId: string;
  initialLink: { video: string | null; session: string | null };
}) {
  const toast = useToast();
  const ask = useAskQuestion(studentId);
  const videos = useMyVideos(studentId);
  const sessions = useRecentSessions(studentId);
  const options = buildLinkOptions(videos.data ?? [], sessions.data ?? []);
  // 고르기 전에는 주소로 받은 연결을 쓰고, 목록이 늦게 와도 따라가요.
  const [chosen, setChosen] = useState<string | null>(null);
  const link = chosen ?? initialLinkValue(initialLink, options);
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
    const sentRaw = text;
    try {
      const sent = await ask.submit({
        body: parsed.data,
        ...parseLinkValue(link),
      });
      if (!sent) return;
      // 보내는 동안 더 쓴 내용은 지우지 않아요.
      setText((cur) => (cur === sentRaw ? "" : cur));
      toast.show({
        tone: "success",
        message: "질문을 보냈어요. 원장님이 답하면 여기에 보여요.",
      });
    } catch (err) {
      toast.show({
        tone: "danger",
        message: saveErrorMessage(err) || classifyError(err).message,
      });
    }
  }

  return (
    <Card size="lg" title="질문하기">
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <Select
          size="lg"
          label="무엇에 대한 질문인가요?"
          options={options}
          value={link}
          onChange={(e) => setChosen(e.target.value)}
        />
        <Input
          multiline
          size="lg"
          label="질문 내용"
          value={text}
          onChange={(e) => setText(e.target.value)}
          error={error}
          hint={`${text.length}/${QUESTION_BODY_MAX}`}
        />
        <Button type="submit" size="lg" block disabled={ask.isPending}>
          질문 보내기
        </Button>
      </form>
    </Card>
  );
}
