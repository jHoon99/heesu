"use client";

import { Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { shortDate } from "../model/clinic";
import { useStudentLessons } from "../state/useClinic";
import { LessonNoteEditor, noteKey } from "./LessonNoteEditor";

/** 학생 허브 "수업 일지" 탭: 이 학생 반의 최근 수업마다 학생 메모와 보완 체크. */
export function StudentLessonsTab({ studentId }: { studentId: string }) {
  const query = useStudentLessons(studentId);

  let body;
  if (query.isError && query.data === undefined) {
    body = (
      <p role="alert" className="text-body-sm text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  } else if (query.isPending || !query.isFetchedAfterMount) {
    body = (
      <p role="status" className="text-body-sm text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (query.data.length === 0) {
    body = (
      <p className="text-body-sm text-text-muted">
        아직 수업이 없어요. 반을 배정하고 수업일지에서 수업을 추가해 주세요.
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col">
        {query.data.map((l) => (
          <LessonNoteEditor
            key={noteKey(l.sessionId, l.note)}
            sessionId={l.sessionId}
            studentId={studentId}
            initial={l.note}
            heading={`${shortDate(l.date)} · ${l.className}`}
            context={l.summary ?? "수업 내용을 아직 안 적었어요."}
          />
        ))}
      </div>
    );
  }

  return (
    <Card
      tone="raised"
      title="수업 일지"
      subtitle="단어 재시험·개념 보완을 체크하고 저장하면 클리닉 명단에 들어가요."
    >
      {body}
    </Card>
  );
}
