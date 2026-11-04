"use client";

import { formatDuration } from "../../model/videos";
import { formatDateTime, type ViewRow } from "../../model/views";

const HEADERS = ["학생", "본 위치", "진행", "마지막 시청"];

export function VideoViewsTable({
  rows,
  duration,
}: {
  rows: ViewRow[];
  duration: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
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
          {rows.map((r) => (
            <tr
              key={r.studentId}
              className="h-10 border-b border-border text-text last:border-b-0"
            >
              <td className="px-4">{r.name}</td>
              <td className="px-4 tabular-nums">
                {formatDuration(r.watchedSeconds)} / {formatDuration(duration)}
              </td>
              <td className="px-4 tabular-nums">{r.percent}%</td>
              <td className="px-4">
                {r.updatedAt === null
                  ? "아직 안 봤어요"
                  : formatDateTime(r.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
