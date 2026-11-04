"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button, Card, Tabs, buttonVariants } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useClasses } from "@/features/classes";
import { dayLabelOf, formatShortDate } from "../model/sessions";
import { useClassSessions } from "../state/useSessions";

const HEADERS = ["날짜", "수업 내용", "숙제", "숙제 마감"];
const sessionsPath = (classId: string) =>
  `/admin/sessions?class=${encodeURIComponent(classId)}`;

const Cell = ({ text }: { text: string | null }) => (
  <td className="max-w-0 px-4">
    <span className="block truncate">{text ?? "-"}</span>
  </td>
);

export function SessionListScreen() {
  const router = useRouter();
  const wanted = useSearchParams().get("class");
  const classes = useClasses();
  const list = classes.data ?? [];
  const known = list.find((c) => c.id === wanted);
  const selected = known ?? list[0];
  const sessions = useClassSessions(selected?.id ?? null);
  const rows = sessions.data ?? [];

  useEffect(() => {
    if (wanted !== null && selected && !known) {
      router.replace(sessionsPath(selected.id));
    }
  }, [wanted, selected, known, router]);

  const open = (id: string) =>
    router.push(`/admin/sessions/edit?id=${encodeURIComponent(id)}`);

  let body;
  if (classes.isError && classes.data === undefined) {
    body = (
      <p
        role="alert"
        className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
      >
        {classifyError(classes.error).message}
      </p>
    );
  } else if (classes.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
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
    body = (
      <>
        <Tabs
          ariaLabel="반"
          items={list.map((c) => ({ value: c.id, label: c.name }))}
          value={selected.id}
          onChange={(id) => router.replace(sessionsPath(id))}
        />
        {sessions.isError && sessions.data === undefined ? (
          <p
            role="alert"
            className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {classifyError(sessions.error).message}
          </p>
        ) : sessions.isPending ? (
          <p role="status" className="text-body text-text-muted">
            불러오는 중이에요.
          </p>
        ) : rows.length === 0 ? (
          <Card tone="raised">
            <p className="text-body text-text-muted">
              아직 수업이 없어요. 수업 추가를 눌러 수업일지를 써 주세요.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-bg-surface-raised">
            <table className="w-full table-fixed text-left text-table">
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
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    tabIndex={0}
                    onClick={() => open(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") open(s.id);
                    }}
                    className="h-10 cursor-pointer border-b border-border text-text last:border-b-0 hover:bg-bg-subtle focus-visible:bg-bg-subtle"
                  >
                    <td className="px-4">
                      {formatShortDate(s.date)} ({dayLabelOf(s.date)})
                    </td>
                    <Cell text={s.summary} />
                    <Cell text={s.homework} />
                    <td className="px-4">
                      {s.homeworkDue ? formatShortDate(s.homeworkDue) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-h2 text-text">수업일지</h1>
        <Button
          size="md"
          icon={Plus}
          onClick={() =>
            router.push(
              selected
                ? `/admin/sessions/new?class=${encodeURIComponent(selected.id)}`
                : "/admin/sessions/new",
            )
          }
        >
          수업 추가
        </Button>
      </div>
      {body}
    </div>
  );
}
