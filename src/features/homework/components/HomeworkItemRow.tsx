import { Check } from "lucide-react";
import { Button, StatusChip } from "@/design-system";
import {
  dayLabelOf,
  formatShortDate,
  toLocalDateKey,
} from "@/features/sessions";
import {
  canSubmit,
  formatSubmittedAt,
  type HomeworkItem,
} from "../model/homework";

const dateLabel = (date: string) =>
  `${formatShortDate(date)}(${dayLabelOf(date)})`;

export function HomeworkItemRow({
  item,
  onSubmit,
  submitting,
}: {
  item: HomeworkItem;
  onSubmit: (sessionId: string) => void;
  submitting: boolean;
}) {
  // 마감이 지나도 제출은 막지 않아요. 안내만 해요.
  const pastDue =
    item.due !== null &&
    item.due < toLocalDateKey(new Date()) &&
    canSubmit(item);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-caption text-text-muted">
          {dateLabel(item.date)} · {item.className}
        </p>
        {item.status !== "none" ? (
          <StatusChip status={item.status} size="sm" />
        ) : null}
      </div>
      <p className="min-w-0 text-body break-words whitespace-pre-line text-text">
        {item.homework}
      </p>
      {item.due ? (
        <p className="text-body-sm text-text-muted">
          마감 {dateLabel(item.due)}
          {pastDue ? " · 마감 지남" : ""}
        </p>
      ) : null}
      {canSubmit(item) ? (
        <Button
          variant="secondary"
          size="lg"
          block
          disabled={submitting}
          aria-busy={submitting}
          onClick={() => onSubmit(item.sessionId)}
        >
          제출했어요
        </Button>
      ) : item.submittedAt ? (
        <p className="flex items-center gap-1 text-body-sm text-text-muted">
          <Check aria-hidden className="size-4" />
          제출했어요 · {formatSubmittedAt(item.submittedAt)}
        </p>
      ) : null}
    </div>
  );
}
