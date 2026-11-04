import { Card } from "@/design-system";
import { STATUS_LABELS, type StudentSummary } from "../model/students";

export function StudentInfoCard({ student }: { student: StudentSummary }) {
  const rows: [string, string][] = [
    ["아이디", student.loginId],
    ["학년", student.grade],
    ["등록일", student.joinedAt],
    ["상태", STATUS_LABELS[student.status]],
  ];
  return (
    <Card tone="raised" title="기본 정보">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-text-muted">{k}</dt>
            <dd className="text-text">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
