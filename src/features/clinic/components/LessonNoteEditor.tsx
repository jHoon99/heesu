"use client";

import { useState, type ReactNode } from "react";
import { Button, Checkbox, Input, useToast } from "@/design-system";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import {
  CLINIC_KIND_LABELS,
  noteChanged,
  noteTextSchema,
  type LessonNote,
} from "../model/clinic";
import { useSaveLessonNote } from "../state/useClinic";

/**
 * 수업 한 번 × 학생 한 명의 메모와 보완 체크. 체크하고 저장하면 DB가 클리닉 명단에 넣어요.
 * 저장된 값이 바뀌면 부모가 key를 바꿔 새로 그려요.
 */
export function LessonNoteEditor({
  sessionId,
  studentId,
  initial,
  heading,
  context,
}: {
  sessionId: string;
  studentId: string;
  initial: LessonNote;
  heading: ReactNode;
  context?: ReactNode;
}) {
  const toast = useToast();
  const save = useSaveLessonNote();
  const [note, setNote] = useState(initial.note ?? "");
  const [wordRetest, setWordRetest] = useState(initial.wordRetest);
  const [conceptReview, setConceptReview] = useState(initial.conceptReview);
  const [error, setError] = useState<string | null>(null);
  const dirty = noteChanged(initial, { note, wordRetest, conceptReview });

  async function onSave() {
    setError(null);
    const parsed = noteTextSchema.safeParse(note);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    try {
      await save.mutateAsync({
        sessionId,
        studentId,
        note: { note: parsed.data, wordRetest, conceptReview },
      });
      toast.show({
        tone: "success",
        message:
          wordRetest || conceptReview
            ? "저장했어요. 체크한 보완은 클리닉 명단에 들어갔어요."
            : "메모를 저장했어요.",
      });
    } catch (e) {
      setError(saveErrorMessage(e));
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-label text-text">{heading}</p>
        {context ? (
          <p className="text-body-sm break-words whitespace-pre-line text-text-muted">
            {context}
          </p>
        ) : null}
      </div>
      <Input
        size="md"
        multiline
        aria-label="학생 메모"
        placeholder="이 학생에 대한 한 줄 메모"
        maxLength={1000}
        value={note}
        error={error ?? undefined}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Checkbox
          label={CLINIC_KIND_LABELS.word_retest}
          checked={wordRetest}
          onChange={(e) => setWordRetest(e.target.checked)}
        />
        <Checkbox
          label={CLINIC_KIND_LABELS.concept_review}
          checked={conceptReview}
          onChange={(e) => setConceptReview(e.target.checked)}
        />
        <Button
          variant="secondary"
          size="md"
          className="ml-auto"
          disabled={!dirty || save.isPending}
          onClick={() => void onSave()}
        >
          저장
        </Button>
      </div>
    </div>
  );
}

/** 저장된 메모 값이 바뀌면 편집기를 새로 그리도록 쓰는 key. */
export function noteKey(id: string, note: LessonNote): string {
  return `${id}:${note.note ?? ""}:${note.wordRetest}:${note.conceptReview}`;
}
