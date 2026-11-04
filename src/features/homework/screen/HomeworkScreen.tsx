"use client";

import { Button, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useMyStudent } from "@/features/auth";
import { HomeworkItemRow } from "../components/HomeworkItemRow";
import { useMyHomework, useSubmitHomework } from "../state/useHomework";

export function HomeworkScreen() {
  const student = useMyStudent();
  const studentId = student.data?.id ?? null;
  const homework = useMyHomework(studentId);
  const { submit, submittingIds } = useSubmitHomework(studentId ?? "");
  const items = homework.data;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-h1 text-text">숙제</h1>
      <p className="text-body-sm text-text-muted">
        다 했으면 &lsquo;제출했어요&rsquo;를 눌러 주세요. 완료·미완료는 원장님이
        확인해요.
      </p>
      {homework.isError && items === undefined ? (
        <Card>
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-body text-danger-700">
              {classifyError(homework.error).message}
            </p>
            <Button
              variant="secondary"
              block
              onClick={() => void homework.refetch()}
            >
              다시 시도
            </Button>
          </div>
        </Card>
      ) : items === undefined ? (
        <p className="text-body text-text-muted">불러오는 중이에요.</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-body text-text-muted">아직 숙제가 없어요.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.sessionId} className="min-w-0">
              <Card className="min-w-0">
                <HomeworkItemRow
                  item={item}
                  onSubmit={submit}
                  submitting={submittingIds.has(item.sessionId)}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
