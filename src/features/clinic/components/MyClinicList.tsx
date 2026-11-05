"use client";

import { format } from "date-fns";
import { Badge, Button, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import {
  CLINIC_KIND_LABELS,
  clinicSource,
  type ClinicItem,
} from "../model/clinic";
import { useStudentClinic } from "../state/useClinic";

function Row({ item }: { item: ClinicItem }) {
  return (
    <li className="flex min-w-0 flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={item.kind === "word_retest" ? "warning" : "brand"}>
          {CLINIC_KIND_LABELS[item.kind]}
        </Badge>
        <span className="text-caption text-text-muted">
          {clinicSource(item)}
          {item.doneAt
            ? ` · ${format(new Date(item.doneAt), "M/d")} 끝냄`
            : null}
        </span>
      </div>
      {item.memo ? (
        <p className="text-body-sm break-words text-text">{item.memo}</p>
      ) : null}
    </li>
  );
}

/** 학생 화면 "클리닉": 해야 할 재시험·보완과 끝낸 것(읽기만). 끝냄 처리는 원장이 해요. */
export function MyClinicList({ studentId }: { studentId: string }) {
  const query = useStudentClinic(studentId);

  if (query.isError && query.data === undefined) {
    return (
      <Card>
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-body text-danger-700">
            {classifyError(query.error).message}
          </p>
          <Button
            variant="secondary"
            block
            onClick={() => void query.refetch()}
          >
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }
  if (query.data === undefined) {
    return <p className="text-body text-text-muted">불러오는 중이에요.</p>;
  }
  const open = query.data.filter((i) => i.status === "open");
  const done = query.data.filter((i) => i.status === "done");
  return (
    <>
      <Card title={`해야 할 보완 ${open.length}개`}>
        {open.length === 0 ? (
          <p className="text-body text-text-muted">
            지금은 해야 할 재시험·보완이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col">
            {open.map((i) => (
              <Row key={i.id} item={i} />
            ))}
          </ul>
        )}
      </Card>
      {done.length > 0 ? (
        <Card title="끝낸 보완">
          <ul className="flex flex-col">
            {done.map((i) => (
              <Row key={i.id} item={i} />
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
