"use client";

import Link from "next/link";
import { Badge, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { homeworkProgress, pickTodayHomework } from "../model/homework";
import { useMyHomework, useSubmitHomework } from "../state/useHomework";
import { HomeworkItemRow } from "./HomeworkItemRow";

export function TodayHomeworkCard({ studentId }: { studentId: string }) {
  const homework = useMyHomework(studentId);
  const { submit, submittingIds } = useSubmitHomework(studentId);
  const items = pickTodayHomework(homework.data ?? []);
  const { finished, total } = homeworkProgress(items);
  return (
    <Card
      title="오늘 숙제"
      actions={
        total > 0 ? (
          <Badge tone="brand">
            {finished} / {total}
          </Badge>
        ) : null
      }
    >
      {homework.isError && homework.data === undefined ? (
        <p role="alert" className="text-body text-danger-700">
          {classifyError(homework.error).message}
        </p>
      ) : homework.data === undefined ? (
        <p className="text-body text-text-muted">불러오는 중이에요.</p>
      ) : items.length === 0 ? (
        <p className="text-body text-text-muted">지금은 할 숙제가 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.sessionId} className="min-w-0">
              <HomeworkItemRow
                item={item}
                onSubmit={submit}
                submitting={submittingIds.has(item.sessionId)}
              />
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/s/homework"
        className="mt-4 inline-block text-label text-text-brand"
      >
        숙제 전체 보기
      </Link>
    </Card>
  );
}
