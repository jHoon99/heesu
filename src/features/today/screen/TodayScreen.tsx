"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button, Card, buttonVariants, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { useDayProgress } from "@/features/attendance";
import {
  LEVEL_LABELS,
  useClasses,
  type ClassSummary,
} from "@/features/classes";
import { useNewConsultationCount } from "@/features/consultations";
import {
  isoDayOf,
  nextScheduleDate,
  toLocalDateKey,
  useStartSession,
} from "@/features/sessions";
import { useUnansweredQuestionCount } from "@/features/questions";
import { formatTodayHeading, todaysClasses } from "../model/today";

const attendancePath = (classId: string) =>
  `/admin/attendance?class=${encodeURIComponent(classId)}`;

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-body-sm text-text-muted">{label}</p>
      <p className="text-h3 text-text">{value}</p>
    </>
  );
  return (
    <Card tone="raised">
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

export function TodayScreen() {
  const router = useRouter();
  const toast = useToast();
  const today = toLocalDateKey(new Date());
  const classes = useClasses();
  const progress = useDayProgress(today);
  const consults = useNewConsultationCount();
  const unanswered = useUnansweredQuestionCount();
  const start = useStartSession();
  const busy = useRef(false);

  async function onStart(cls: ClassSummary) {
    if (busy.current) return;
    busy.current = true;
    try {
      await start.mutateAsync({
        classId: cls.id,
        date: today,
        homeworkDue: nextScheduleDate(cls.schedule, today),
      });
      router.push(attendancePath(cls.id));
    } catch (e) {
      toast.show({ tone: "danger", message: saveErrorMessage(e) });
    } finally {
      busy.current = false;
    }
  }

  const rows = todaysClasses(classes.data ?? [], isoDayOf(today));
  const invalid = (classes.data ?? []).filter((c) => c.scheduleInvalid);
  const newCount =
    consults.isError || consults.data === undefined
      ? "-"
      : `${consults.data}건`;

  const unansweredText =
    unanswered.isError || unanswered.data === undefined
      ? "-"
      : `${unanswered.data}개`;

  let body;
  if (classes.isError && classes.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(classes.error).message}
      </p>
    );
  } else if (classes.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (rows.length === 0) {
    body = (
      <Card tone="raised">
        <p className="text-body text-text">
          오늘은 시간표에 있는 수업이 없어요. 다른 날 수업은 출결·숙제에서
          추가할 수 있어요.
        </p>
        <Link
          href="/admin/attendance"
          className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
        >
          출결·숙제로
        </Link>
      </Card>
    );
  } else {
    body = rows.map(({ cls, slot }) => {
      const p = progress.data?.[cls.id];
      const pct =
        p && p.total > 0 ? Math.round((p.entered / p.total) * 100) : 0;
      return (
        <Card
          key={cls.id}
          tone="raised"
          title={cls.name}
          subtitle={`${LEVEL_LABELS[cls.level]} · ${slot.start}–${slot.end}`}
          actions={
            p ? (
              <Link
                href={attendancePath(cls.id)}
                className={buttonVariants({ variant: "secondary", size: "md" })}
              >
                출결 입력
              </Link>
            ) : (
              <Button
                variant="secondary"
                size="md"
                disabled={start.isPending}
                onClick={() => void onStart(cls)}
              >
                수업 시작
              </Button>
            )
          }
        >
          {p ? (
            <div className="flex flex-col gap-2">
              <p className="text-body text-text">
                출결 {p.entered}/{p.total}명 입력
              </p>
              <div className="h-2 w-full rounded-full bg-bg-subtle">
                <div
                  role="progressbar"
                  aria-label={`${cls.name} 출결 입력`}
                  aria-valuenow={p.entered}
                  aria-valuemin={0}
                  aria-valuemax={p.total}
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-body text-text-muted">
              {progress.isError
                ? "진행 상황을 불러오지 못했어요. 새로고침해 주세요."
                : "아직 수업을 시작하지 않았어요."}
            </p>
          )}
        </Card>
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-serif text-h2 text-text">오늘</h1>
        <p className="text-caption text-text-muted">
          {formatTodayHeading(today)}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="오늘 수업"
          value={classes.data === undefined ? "-" : `${rows.length}개`}
        />
        <Stat
          label="미답변 질문"
          value={unansweredText}
          href="/admin/questions"
        />
        <Stat label="새 상담" value={newCount} href="/admin/consultations" />
      </div>
      {invalid.length > 0 ? (
        <p
          role="alert"
          className="rounded-md bg-warning-50 px-3 py-2 text-body-sm text-warning-700"
        >
          {invalid.map((c) => c.name).join(", ")} 반의 시간표를 읽지 못해 오늘
          수업에 넣지 못했어요. 반 관리에서 시간표를 다시 저장해 주세요.
        </p>
      ) : null}
      {body}
    </div>
  );
}
