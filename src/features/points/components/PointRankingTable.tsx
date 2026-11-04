import { Badge, cn } from "@/design-system";
import type { PointTotal } from "../model/points";

type Row = PointTotal & { rank: number };

const HEADERS = ["순위", "이름", "학년", "포인트"];

export function PointRankingTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Row[];
  selectedId: string | null;
  onSelect: (studentId: string) => void;
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
          {rows.map((r) => {
            const top = r.rank <= 3;
            const selected = r.studentId === selectedId;
            return (
              <tr
                key={r.studentId}
                tabIndex={0}
                aria-selected={selected}
                onClick={() => onSelect(r.studentId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect(r.studentId);
                }}
                className={cn(
                  "h-10 cursor-pointer border-b border-border text-text last:border-b-0 hover:bg-bg-subtle focus-visible:bg-bg-subtle",
                  top && "font-semibold",
                  selected && "bg-bg-subtle",
                )}
              >
                <td className="px-4">
                  {top ? <Badge tone="brand">{r.rank}등</Badge> : `${r.rank}등`}
                </td>
                <td className="px-4">{r.name}</td>
                <td className="px-4">{r.grade}</td>
                <td className="px-4 tabular-nums">{r.total}점</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
