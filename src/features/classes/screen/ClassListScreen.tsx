"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { formatSchedule, LEVEL_LABELS } from "../model/classes";
import { useClasses } from "../state/useClasses";

const HEADERS = ["반 이름", "구분", "시간표", "정원", "학생 수"];

export function ClassListScreen() {
  const router = useRouter();
  const query = useClasses();
  const classes = query.data ?? [];
  const open = (id: string) =>
    router.push(`/admin/classes/edit?id=${encodeURIComponent(id)}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-h2 text-text">반</h1>
        <Button
          size="md"
          icon={Plus}
          onClick={() => router.push("/admin/classes/new")}
        >
          반 추가
        </Button>
      </div>
      {query.isError && query.data === undefined ? (
        <p
          role="alert"
          className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
        >
          {classifyError(query.error).message}
        </p>
      ) : query.isPending ? (
        <p role="status" className="text-body text-text-muted">
          불러오는 중이에요.
        </p>
      ) : classes.length === 0 ? (
        <Card tone="raised">
          <p className="text-body text-text-muted">
            아직 반이 없어요. 반 추가를 눌러 첫 반을 만들어 주세요.
          </p>
        </Card>
      ) : (
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
              {classes.map((c) => (
                <tr
                  key={c.id}
                  tabIndex={0}
                  onClick={() => open(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") open(c.id);
                  }}
                  className="h-10 cursor-pointer border-b border-border text-text last:border-b-0 hover:bg-bg-subtle focus-visible:bg-bg-subtle"
                >
                  <td className="px-4">{c.name}</td>
                  <td className="px-4">{LEVEL_LABELS[c.level]}</td>
                  <td className="px-4">{formatSchedule(c.schedule)}</td>
                  <td className="px-4">
                    {c.capacity === null ? "제한 없음" : `${c.capacity}명`}
                  </td>
                  <td className="px-4">{c.memberCount}명</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
