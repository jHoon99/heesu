"use client";

import { Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useSessionNotes } from "../state/useClinic";
import { LessonNoteEditor, noteKey } from "./LessonNoteEditor";

/** 수업일지 수정 화면 아래: 반 학생마다 메모와 보완 체크(퇴원생은 명단에서 빠져요). */
export function SessionNotesCard({
  sessionId,
  classId,
}: {
  sessionId: string;
  classId: string;
}) {
  const query = useSessionNotes(sessionId, classId);

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
        이 반에 학생이 없어요. 학생 상세에서 반을 배정해 주세요.
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col">
        {query.data.map((r) => (
          <LessonNoteEditor
            key={noteKey(r.studentId, r.note)}
            sessionId={sessionId}
            studentId={r.studentId}
            initial={r.note}
            heading={r.name}
          />
        ))}
      </div>
    );
  }

  return (
    <Card
      tone="raised"
      className="max-w-[640px]"
      title="학생별 기록"
      subtitle="체크하고 저장하면 클리닉 명단에 들어가요."
    >
      {body}
    </Card>
  );
}
