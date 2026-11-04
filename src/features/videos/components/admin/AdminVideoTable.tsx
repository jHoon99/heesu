"use client";

import Link from "next/link";
import { Badge, Card } from "@/design-system";
import {
  dayLabelOf,
  formatShortDate,
  toLocalDateKey,
} from "@/features/sessions";
import { formatDuration } from "../../model/videos";
import { isScheduled } from "../../model/views";

export type AdminVideoRow = {
  id: string;
  title: string;
  durationSeconds: number;
  publishedAt: string;
  /** 명단 학생 중 다 본 수. 명단을 아직 모르면 null. */
  completed: number | null;
};

const HEADERS = ["제목", "길이", "공개일", "시청"];

export function AdminVideoTable({
  rows,
  rosterSize,
  now,
}: {
  rows: AdminVideoRow[];
  rosterSize: number | null;
  now: Date;
}) {
  return (
    <Card tone="raised" className="overflow-x-auto p-0">
      <table className="w-full text-left text-table">
        <thead>
          <tr className="h-10 border-b border-border text-text-muted">
            {HEADERS.map((h) => (
              <th key={h} scope="col" className="px-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const key = toLocalDateKey(new Date(v.publishedAt));
            return (
              <tr
                key={v.id}
                className="h-10 border-b border-border text-text last:border-b-0"
              >
                <td className="px-4">
                  <Link
                    href={`/admin/videos/detail?id=${encodeURIComponent(v.id)}`}
                    className="text-text-brand underline-offset-2 hover:underline"
                  >
                    {v.title}
                  </Link>
                </td>
                <td className="px-4 tabular-nums">
                  {formatDuration(v.durationSeconds)}
                </td>
                <td className="px-4">
                  <span className="inline-flex items-center gap-2">
                    {formatShortDate(key)}({dayLabelOf(key)})
                    {isScheduled(v.publishedAt, now) ? (
                      <Badge tone="warning">공개 예정</Badge>
                    ) : null}
                  </span>
                </td>
                <td className="px-4 tabular-nums">
                  {v.completed === null || rosterSize === null
                    ? "-"
                    : `다 본 학생 ${v.completed}/${rosterSize}명`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
