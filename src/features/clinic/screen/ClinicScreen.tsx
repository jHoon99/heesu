"use client";

import Link from "next/link";
import { Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import type { ClinicBoardItem } from "../model/clinic";
import { useClinicBoard } from "../state/useClinic";
import { ClinicRow } from "../components/ClinicRow";

function Who({ item }: { item: ClinicBoardItem }) {
  return (
    <Link
      href={`/admin/students/detail?id=${encodeURIComponent(item.studentId)}&tab=clinic`}
      className="text-label text-text-brand underline-offset-2 hover:underline"
    >
      {item.studentName}
      <span className="ml-1 text-caption text-text-muted">{item.grade}</span>
    </Link>
  );
}

function List({ items, empty }: { items: ClinicBoardItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-body-sm text-text-muted">{empty}</p>;
  }
  return (
    <ul className="flex flex-col">
      {items.map((i) => (
        <ClinicRow key={i.id} item={i} who={<Who item={i} />} />
      ))}
    </ul>
  );
}

/** 클리닉 명단: 전체 학생의 해야 할 보완(오래된 것 먼저)과 최근 끝낸 보완. */
export function ClinicScreen() {
  const query = useClinicBoard();

  let body;
  if (query.isError && query.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else {
    body = (
      <>
        <Card tone="raised" title={`해야 할 보완 ${query.data.open.length}개`}>
          <List
            items={query.data.open}
            empty="해야 할 보완이 없어요. 수업일지에서 학생별로 체크하면 여기에 생겨요."
          />
        </Card>
        <Card tone="raised" title="최근 끝낸 보완">
          <List items={query.data.done} empty="아직 끝낸 보완이 없어요." />
        </Card>
      </>
    );
  }

  return (
    <div className="flex max-w-[720px] min-w-0 flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">클리닉</h1>
      {body}
    </div>
  );
}
