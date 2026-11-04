"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, buttonVariants, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { PointHistoryList } from "@/features/points";
import { ClassAssignCard } from "../components/ClassAssignCard";
import { ConsentCard } from "../components/ConsentCard";
import { GuardianCard } from "../components/GuardianCard";
import { PasswordResetCard } from "../components/PasswordResetCard";
import { RecentRecordsCard } from "../components/RecentRecordsCard";
import { StudentInfoCard } from "../components/StudentInfoCard";
import { STATUS_LABELS, STATUS_TONE } from "../model/students";
import { useStudent } from "../state/useStudents";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_PATH = "/admin/students";

function NotFound() {
  return (
    <Card tone="raised">
      <p className="text-body text-text">
        학생을 찾을 수 없어요. 목록에서 다시 골라 주세요.
      </p>
      <Link
        href={LIST_PATH}
        className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
      >
        학생 목록으로
      </Link>
    </Card>
  );
}

export function StudentDetailScreen() {
  const rawId = useSearchParams().get("id");
  const id = rawId !== null && UUID_RE.test(rawId) ? rawId : null;
  const query = useStudent(id);

  if (id === null) return <NotFound />;
  if (query.isError && query.data === undefined) {
    return (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  }
  if (query.isPending || !query.isFetchedAfterMount) {
    return (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  }
  const student = query.data;
  if (!student) return <NotFound />;

  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-h2 text-text">{student.name}</h1>
        <Badge tone={STATUS_TONE[student.status]}>
          {STATUS_LABELS[student.status]}
        </Badge>
        <Link
          href={`/admin/students/edit?id=${encodeURIComponent(id)}`}
          className={`${buttonVariants({ variant: "secondary", size: "md" })} ml-auto`}
        >
          정보 수정
        </Link>
      </div>
      <StudentInfoCard student={student} />
      <ClassAssignCard
        key={student.classes.map((c) => c.id).join(",")}
        studentId={id}
        currentIds={student.classes.map((c) => c.id)}
      />
      <RecentRecordsCard studentId={id} />
      <Card tone="raised" title="포인트 내역">
        <PointHistoryList studentId={id} />
      </Card>
      <GuardianCard studentId={id} />
      <ConsentCard studentId={id} />
      <PasswordResetCard studentId={id} left={student.status === "left"} />
    </div>
  );
}
