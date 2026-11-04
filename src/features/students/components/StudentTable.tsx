"use client";

import { Badge } from "@/design-system";
import { STATUS_LABELS, type StudentSummary } from "../model/students";

const HEADERS = ["이름", "아이디", "학년", "학교", "반", "상태", "등록일"];
const STATUS_TONE = {
  active: "brand",
  paused: "neutral",
  left: "neutral",
} as const;

export function StudentTable({
  students,
  onOpen,
}: {
  students: StudentSummary[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-surface-raised">
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
          {students.map((s) => (
            <tr
              key={s.id}
              tabIndex={0}
              onClick={() => onOpen(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onOpen(s.id);
              }}
              className="h-10 cursor-pointer border-b border-border text-text last:border-b-0 hover:bg-bg-subtle focus-visible:bg-bg-subtle"
            >
              <td className="px-4">{s.name}</td>
              <td className="px-4">{s.loginId}</td>
              <td className="px-4">{s.grade}</td>
              <td className="px-4">{s.school ?? "-"}</td>
              <td className="px-4">
                {s.classes.length === 0
                  ? "미배정"
                  : s.classes.map((c) => c.name).join(", ")}
              </td>
              <td className="px-4">
                <Badge tone={STATUS_TONE[s.status]}>
                  {STATUS_LABELS[s.status]}
                </Badge>
              </td>
              <td className="px-4">{s.joinedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
