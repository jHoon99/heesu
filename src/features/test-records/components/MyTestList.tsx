"use client";

import { Badge, Button, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { formatShortDate } from "@/features/sessions";
import {
  formatScore,
  isBelowPass,
  TEST_KIND_LABELS,
} from "../model/testRecords";
import { useTestResults } from "../state/useTestRecords";

/** 학생 화면 "테스트 기록": 내 단어·문법 테스트 결과(최근 순, 읽기만). RLS가 내 것만 줘요. */
export function MyTestList({ studentId }: { studentId: string }) {
  const query = useTestResults(studentId);

  if (query.isError && query.data === undefined) {
    return (
      <Card>
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-body text-danger-700">
            {classifyError(query.error).message}
          </p>
          <Button
            variant="secondary"
            block
            onClick={() => void query.refetch()}
          >
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }
  if (query.data === undefined) {
    return <p className="text-body text-text-muted">불러오는 중이에요.</p>;
  }
  if (query.data.length === 0) {
    return (
      <Card>
        <p className="text-body text-text-muted">
          아직 테스트 기록이 없어요. 테스트를 보면 여기에 쌓여요.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <ul className="flex flex-col">
        {query.data.map((r) => (
          <li
            key={r.id}
            className="flex min-w-0 flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm text-text-muted tabular-nums">
                {formatShortDate(r.takenOn)}
              </span>
              <Badge tone={r.kind === "word" ? "warning" : "brand"}>
                {TEST_KIND_LABELS[r.kind]}
              </Badge>
              {isBelowPass(r) ? <Badge tone="neutral">재시험</Badge> : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
              <p className="min-w-0 text-label break-words text-text">
                {r.title}
              </p>
              <p className="text-body text-text tabular-nums">
                {formatScore(r.score, r.maxScore)}
              </p>
            </div>
            {r.memo ? (
              <p className="text-body-sm break-words text-text-muted">
                {r.memo}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
