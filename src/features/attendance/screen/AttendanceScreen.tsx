"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import {
  AttendanceTable,
  Button,
  Card,
  Tabs,
  buttonVariants,
  useToast,
} from "@/design-system";
import { useClasses } from "@/features/classes";
import {
  nextScheduleDate,
  toLocalDateKey,
  useStartSession,
} from "@/features/sessions";
import { toTableDates } from "../model/board";
import { attendanceKeys, useBoard, useSetCell } from "../state/useBoard";

const attendancePath = (classId: string) =>
  `/admin/attendance?class=${encodeURIComponent(classId)}`;
const sessionsPath = (classId: string) =>
  `/admin/sessions?class=${encodeURIComponent(classId)}`;

const Alert = ({ error }: { error: unknown }) => (
  <p
    role="alert"
    className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
  >
    {classifyError(error).message}
  </p>
);

const Loading = () => (
  <p role="status" className="text-body text-text-muted">
    불러오는 중이에요.
  </p>
);

const Empty = ({ children }: { children: ReactNode }) => (
  <Card tone="raised">
    <p className="text-body text-text-muted">{children}</p>
  </Card>
);

export function AttendanceScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const wanted = useSearchParams().get("class");
  const classes = useClasses();
  const list = classes.data ?? [];
  const known = list.find((c) => c.id === wanted);
  const selected = known ?? list[0];
  const classId = selected?.id ?? null;
  const board = useBoard(classId);
  const setCell = useSetCell(classId ?? "");
  const start = useStartSession();
  const today = toLocalDateKey(new Date());

  useEffect(() => {
    if (wanted !== null && selected && !known) {
      router.replace(attendancePath(selected.id));
    }
  }, [wanted, selected, known, router]);

  const data = board.data;
  const canAddToday =
    selected !== undefined &&
    data !== undefined &&
    !data.sessions.some((s) => s.date === today);

  function addToday() {
    if (!selected) return;
    start.mutate(
      {
        classId: selected.id,
        date: today,
        homeworkDue: nextScheduleDate(selected.schedule, today),
      },
      {
        onSuccess: (res) => {
          void client.invalidateQueries({
            queryKey: attendanceKeys.board(selected.id),
          });
          if (res.created) {
            toast.show({ tone: "success", message: "오늘 수업을 추가했어요." });
          }
        },
        onError: (e) =>
          toast.show({
            tone: "danger",
            message: `오늘 수업을 추가하지 못했어요. ${saveErrorMessage(e)}`,
          }),
      },
    );
  }

  let body;
  if (classes.isError && classes.data === undefined) {
    body = <Alert error={classes.error} />;
  } else if (classes.isPending) {
    body = <Loading />;
  } else if (!selected) {
    body = (
      <Card tone="raised">
        <p className="text-body text-text-muted">먼저 반을 만들어 주세요.</p>
        <Link
          href="/admin/classes/new"
          className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
        >
          반 추가
        </Link>
      </Card>
    );
  } else {
    let content;
    if (board.isError && data === undefined) {
      content = <Alert error={board.error} />;
    } else if (data === undefined) {
      content = <Loading />;
    } else if (data.students.length === 0) {
      content = (
        <Empty>
          이 반에 배정된 학생이 없어요. 학생 상세에서 반을 배정해 주세요.
        </Empty>
      );
    } else if (data.sessions.length === 0) {
      content = (
        <Empty>아직 수업이 없어요. 오늘 수업 추가를 눌러 시작해 주세요.</Empty>
      );
    } else {
      const dates = toTableDates(data.sessions, today);
      const names = new Map(data.students.map((s) => [s.id, s.name]));
      const labels = new Map(dates.map((d) => [d.key, d.label]));
      content = (
        <>
          <Card tone="raised" className="overflow-hidden p-0">
            <AttendanceTable
              students={data.students.map((s) => ({
                id: s.id,
                name: s.name,
                meta: s.grade,
              }))}
              dates={dates}
              records={data.records}
              maxHeight={560}
              onChange={(studentId, sessionId, field, value) =>
                setCell.mutate({
                  sessionId,
                  studentId,
                  field,
                  value,
                  previous:
                    data.records[studentId]?.[sessionId]?.[field] ?? "none",
                  studentName: names.get(studentId) ?? "",
                  dateLabel: labels.get(sessionId) ?? "",
                })
              }
            />
          </Card>
          <AttendanceTable.Legend />
        </>
      );
    }
    body = (
      <>
        <Tabs
          ariaLabel="반"
          items={list.map((c) => ({
            value: c.id,
            label: c.name,
            count: c.memberCount,
          }))}
          value={selected.id}
          onChange={(id) => router.replace(attendancePath(id))}
        />
        {content}
        <p className="text-caption text-text-muted">
          수업 내용과 숙제는{" "}
          <Link
            href={sessionsPath(selected.id)}
            className="text-text-brand underline underline-offset-2"
          >
            수업일지
          </Link>
          에 적어요.
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-caption text-text-muted">수업</p>
          <h1 className="font-serif text-h2 text-text">출결·숙제</h1>
        </div>
        {canAddToday ? (
          <Button
            size="md"
            icon={Plus}
            onClick={addToday}
            disabled={start.isPending}
          >
            오늘 수업 추가
          </Button>
        ) : null}
      </div>
      {body}
    </div>
  );
}
