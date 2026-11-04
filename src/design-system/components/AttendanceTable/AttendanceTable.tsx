"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../cn";
import {
  StatusChip,
  nextAttendance,
  nextHomework,
  type Attendance,
  type Homework,
} from "../StatusChip/StatusChip";

export type AttendanceCell = {
  att?: Attendance;
  hw?: Homework;
  /** 학생이 숙제를 제출한 시각(ISO). 표시만 하고 바꾸지 않아요. */
  submittedAt?: string | null;
};
export type AttendanceRecords = Record<string, Record<string, AttendanceCell>>;

export interface AttendanceTableProps {
  students: { id: string; name: string; meta?: string }[];
  dates: { key: string; label: string; day: string; today?: boolean }[];
  records?: AttendanceRecords;
  defaultRecords?: AttendanceRecords;
  onChange?: (
    studentId: string,
    dateKey: string,
    field: "att" | "hw",
    value: Attendance | Homework,
  ) => void;
  showHomework?: boolean;
  maxHeight?: number;
}

const SEOUL_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 제출 시각을 서울 시간 "11/4 15:30"으로 보여줘요. */
export function formatSubmittedAt(iso: string): string {
  const p = Object.fromEntries(
    SEOUL_TIME.formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

const LOW_RATE = 0.6;
const ATTENDED: Attendance[] = ["present", "late", "makeup"];

export function summarizeAttendanceRow(cells: (AttendanceCell | undefined)[]) {
  let attended = 0;
  let entered = 0;
  let hwDone = 0;
  let hwEntered = 0;
  for (const cell of cells) {
    if (cell?.att && cell.att !== "none") {
      entered += 1;
      if (ATTENDED.includes(cell.att)) attended += 1;
    }
    if (cell?.hw && cell.hw !== "none") {
      hwEntered += 1;
      if (cell.hw === "done") hwDone += 1;
    }
  }
  return {
    attended,
    entered,
    hwDone,
    hwEntered,
    attLow: entered > 0 && attended / entered < LOW_RATE,
    hwLow: hwEntered > 0 && hwDone / hwEntered < LOW_RATE,
  };
}

function Rate({
  prefix,
  done,
  total,
  low,
}: {
  prefix: string;
  done: number;
  total: number;
  low: boolean;
}) {
  if (total === 0) return <span className="text-text-subtle">{prefix} –</span>;
  const pct = Math.round((done / total) * 100);
  return (
    <span className="inline-flex items-center gap-1">
      {low ? (
        <AlertTriangle
          size={12}
          className="text-danger-700"
          aria-hidden="true"
        />
      ) : null}
      <span className={cn("hs-num", low && "font-semibold text-danger-700")}>
        {`${prefix} ${done}/${total} · ${pct}%`}
      </span>
      {low ? <span className="sr-only">60% 미만</span> : null}
    </span>
  );
}

const TH =
  "h-10 bg-bg-surface-raised px-3 text-left text-caption text-text-muted";

export function AttendanceTable({
  students,
  dates,
  records,
  defaultRecords,
  onChange,
  showHomework = true,
  maxHeight,
}: AttendanceTableProps) {
  const [internal, setInternal] = useState<AttendanceRecords>(
    defaultRecords ?? {},
  );
  const data = records ?? internal;

  function change(
    studentId: string,
    dateKey: string,
    field: "att" | "hw",
    value: Attendance | Homework,
  ) {
    if (!records) {
      setInternal((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [dateKey]: { ...prev[studentId]?.[dateKey], [field]: value },
        },
      }));
    }
    onChange?.(studentId, dateKey, field, value);
  }

  return (
    <div
      className={cn("rounded-md", maxHeight !== undefined && "overflow-auto")}
      style={maxHeight !== undefined ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-table">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className={cn(TH, "sticky top-0 left-0 z-20 align-bottom")}
            >
              이름
            </th>
            {dates.map((d) => (
              <th
                key={d.key}
                colSpan={showHomework ? 2 : 1}
                className={cn(
                  TH,
                  "sticky top-0 z-10 text-center",
                  d.today && "bg-brown-100",
                )}
              >
                {d.label} <span className="text-text-subtle">{d.day}</span>
              </th>
            ))}
            <th
              rowSpan={2}
              className={cn(TH, "sticky top-0 z-10 align-bottom")}
            >
              {showHomework ? "출석 · 숙제" : "출석"}
            </th>
          </tr>
          <tr>
            {dates.map((d) => (
              <FieldHeads key={d.key} today={d.today} homework={showHomework} />
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const row = data[s.id] ?? {};
            const sum = summarizeAttendanceRow(dates.map((d) => row[d.key]));
            return (
              <tr key={s.id} className="h-10 border-t border-border">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-bg-surface-raised px-3 text-left font-normal"
                >
                  <div className="text-text">{s.name}</div>
                  {s.meta ? (
                    <div className="text-caption text-text-muted">{s.meta}</div>
                  ) : null}
                </th>
                {dates.flatMap((d) => {
                  const cell = row[d.key];
                  const submitted = cell?.submittedAt
                    ? formatSubmittedAt(cell.submittedAt)
                    : null;
                  const bg = d.today ? "bg-brown-50" : undefined;
                  const tds = [
                    <td key={`${d.key}-att`} className={cn("px-1", bg)}>
                      <StatusChip
                        size="sm"
                        status={cell?.att ?? "none"}
                        ariaLabel={`${s.name} ${d.label} 출결`}
                        onClick={() =>
                          change(
                            s.id,
                            d.key,
                            "att",
                            nextAttendance(cell?.att ?? "none"),
                          )
                        }
                      />
                    </td>,
                  ];
                  if (showHomework)
                    tds.push(
                      <td key={`${d.key}-hw`} className={cn("px-1", bg)}>
                        <span
                          className="relative inline-flex"
                          title={
                            submitted ? `학생 제출 ${submitted}` : undefined
                          }
                        >
                          <StatusChip
                            size="sm"
                            status={cell?.hw ?? "none"}
                            ariaLabel={`${s.name} ${d.label} 숙제${submitted ? `, 학생 제출 ${submitted}` : ""}`}
                            onClick={() =>
                              change(
                                s.id,
                                d.key,
                                "hw",
                                nextHomework(cell?.hw ?? "none"),
                              )
                            }
                          />
                          {submitted ? (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-bg-surface"
                            />
                          ) : null}
                        </span>
                      </td>,
                    );
                  return tds;
                })}
                <td className="px-3 whitespace-nowrap text-text-muted">
                  <div>
                    <Rate
                      prefix="출석"
                      done={sum.attended}
                      total={sum.entered}
                      low={sum.attLow}
                    />
                  </div>
                  {showHomework ? (
                    <div>
                      <Rate
                        prefix="숙제"
                        done={sum.hwDone}
                        total={sum.hwEntered}
                        low={sum.hwLow}
                      />
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FieldHeads({
  today,
  homework,
}: {
  today?: boolean;
  homework: boolean;
}) {
  const cls = cn(TH, "sticky top-10 z-10 text-center", today && "bg-brown-100");
  return (
    <>
      <th className={cls}>출결</th>
      {homework ? <th className={cls}>숙제</th> : null}
    </>
  );
}

export function AttendanceTableLegend() {
  return (
    <div aria-label="범례" role="group" className="flex flex-wrap gap-2">
      <StatusChip size="sm" status="present" />
      <StatusChip size="sm" status="late" />
      <StatusChip size="sm" status="absent" />
      <StatusChip size="sm" status="makeup" />
      <StatusChip size="sm" status="done" label="숙제 완료" />
      <StatusChip size="sm" status="missing" label="숙제 미완료" />
      <StatusChip size="sm" status="none" />
    </div>
  );
}

AttendanceTable.Legend = AttendanceTableLegend;
