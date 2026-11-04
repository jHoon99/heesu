"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Card, Input, Tabs } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { usePointTotals } from "@/features/points";
import { StudentTable } from "../components/StudentTable";
import { filterStudents, type StudentStatus } from "../model/students";
import { useStudents } from "../state/useStudents";

export function StudentListScreen() {
  const router = useRouter();
  const query = useStudents();
  const totals = usePointTotals();
  const [tab, setTab] = useState<StudentStatus | "all">("active");
  const [search, setSearch] = useState("");
  const students = query.data ?? [];
  const count = (s: StudentStatus) =>
    students.filter((x) => x.status === s).length;
  const points =
    totals.data === undefined
      ? null
      : Object.fromEntries(totals.data.map((t) => [t.studentId, t.total]));
  const shown = filterStudents(students, tab, search);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-h2 text-text">학생</h1>
        <Button
          size="md"
          icon={Plus}
          onClick={() => router.push("/admin/students/new")}
        >
          학생 추가
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
      ) : students.length === 0 ? (
        <Card tone="raised">
          <p className="text-body text-text-muted">
            아직 학생이 없어요. 학생 추가를 눌러 첫 학생을 등록해 주세요.
          </p>
        </Card>
      ) : (
        <>
          <Tabs
            ariaLabel="상태별 보기"
            value={tab}
            onChange={(v) => setTab(v as StudentStatus | "all")}
            items={[
              { value: "active", label: `재원 ${count("active")}` },
              { value: "paused", label: `휴원 ${count("paused")}` },
              { value: "left", label: `퇴원 ${count("left")}` },
              { value: "all", label: `전체 ${students.length}` },
            ]}
          />
          <div className="max-w-[360px]">
            <Input
              size="md"
              aria-label="학생 검색"
              placeholder="이름이나 아이디로 찾기"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {shown.length === 0 ? (
            <Card tone="raised">
              <p className="text-body text-text-muted">
                조건에 맞는 학생이 없어요.
              </p>
            </Card>
          ) : (
            <StudentTable
              students={shown}
              points={points}
              onOpen={(id) =>
                router.push(
                  `/admin/students/detail?id=${encodeURIComponent(id)}`,
                )
              }
            />
          )}
        </>
      )}
    </div>
  );
}
