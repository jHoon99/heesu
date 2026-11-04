"use client";

import { Badge, Button } from "@/design-system";
import {
  CONSULTATION_STATUS_LABELS,
  CONSULTATION_STATUS_TONE,
  formatSeoulDateTime,
  phoneHref,
  type ConsultationRecord,
} from "../../model/adminConsultation";

const HEADERS = ["신청일", "학부모", "연락처", "학년", "상태", "궁금한 점"];

export function ConsultationTable({
  rows,
  onOpen,
}: {
  rows: ConsultationRecord[];
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
            <th scope="col" className="px-4">
              <span className="sr-only">보기</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="h-10 border-b border-border text-text last:border-b-0"
            >
              <td className="px-4 whitespace-nowrap tabular-nums">
                {formatSeoulDateTime(r.createdAt)}
              </td>
              <td className="px-4 whitespace-nowrap">{r.parentName}</td>
              <td className="px-4 whitespace-nowrap tabular-nums">
                <a href={phoneHref(r.phone)} className="underline">
                  {r.phone}
                </a>
              </td>
              <td className="px-4 whitespace-nowrap">{r.grade}</td>
              <td className="px-4">
                <Badge tone={CONSULTATION_STATUS_TONE[r.status]}>
                  {CONSULTATION_STATUS_LABELS[r.status]}
                </Badge>
              </td>
              <td className="max-w-64 min-w-0 px-4">
                <span className="block truncate">{r.message ?? "—"}</span>
              </td>
              <td className="px-4">
                <Button
                  variant="ghost"
                  size="md"
                  aria-label={`${r.parentName} 상담 보기`}
                  onClick={() => onOpen(r.id)}
                >
                  보기
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
