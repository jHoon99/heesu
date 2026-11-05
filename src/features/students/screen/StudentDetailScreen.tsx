"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, buttonVariants, Card, Tabs } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import {
  openCount,
  StudentClinicTab,
  StudentLessonsTab,
  useStudentClinic,
} from "@/features/clinic";
import { StudentCounselTab } from "@/features/counsel-notes";
import { GuardianLinkCard } from "@/features/guardian";
import { PaymentHistoryCard } from "@/features/payments";
import { PointHistoryList } from "@/features/points";
import { StudentTestsTab } from "@/features/test-records";
import { ClassAssignCard } from "../components/ClassAssignCard";
import { ConsentCard } from "../components/ConsentCard";
import { GuardianCard } from "../components/GuardianCard";
import { PasswordResetCard } from "../components/PasswordResetCard";
import { RecentRecordsCard } from "../components/RecentRecordsCard";
import { StudentInfoCard } from "../components/StudentInfoCard";
import { HUB_TABS, hubHeading, parseHubTab, type HubTab } from "../model/hub";
import {
  STATUS_LABELS,
  STATUS_TONE,
  type StudentSummary,
} from "../model/students";
import { useStudent } from "../state/useStudents";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_PATH = "/admin/students";
const DETAIL_PATH = "/admin/students/detail";

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

function TabBody({ tab, student }: { tab: HubTab; student: StudentSummary }) {
  const id = student.id;
  const left = student.status === "left";
  switch (tab) {
    case "info":
      return (
        <>
          <StudentInfoCard student={student} />
          <ClassAssignCard
            key={student.classes.map((c) => c.id).join(",")}
            studentId={id}
            currentIds={student.classes.map((c) => c.id)}
          />
          <GuardianCard studentId={id} />
          <GuardianLinkCard key={id} studentId={id} left={left} />
          <ConsentCard studentId={id} />
          <PasswordResetCard studentId={id} left={left} />
        </>
      );
    case "attendance":
      return (
        <>
          <RecentRecordsCard studentId={id} />
          <Card tone="raised" title="포인트 내역">
            <PointHistoryList studentId={id} />
          </Card>
        </>
      );
    case "lessons":
      return <StudentLessonsTab studentId={id} />;
    case "tests":
      return <StudentTestsTab studentId={id} />;
    case "clinic":
      return <StudentClinicTab studentId={id} />;
    case "counsel":
      return <StudentCounselTab studentId={id} />;
    case "payments":
      return <PaymentHistoryCard studentId={id} />;
  }
}

function Hub({ student }: { student: StudentSummary }) {
  const router = useRouter();
  const tab = parseHubTab(useSearchParams().get("tab"));
  const clinic = useStudentClinic(student.id);
  const open = clinic.data ? openCount(clinic.data) : 0;
  const heading = hubHeading(student.name, student.school, student.grade);
  const tabRow = useRef<HTMLDivElement>(null);
  // 폰에서는 탭 줄이 옆으로 밀려요. 고른 탭이 화면 밖이면 보이게 옮겨요.
  useEffect(() => {
    tabRow.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [tab]);
  const go = (next: string) =>
    router.replace(
      `${DETAIL_PATH}?id=${encodeURIComponent(student.id)}&tab=${encodeURIComponent(next)}`,
      { scroll: false },
    );

  return (
    <div className="flex max-w-[720px] min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 font-serif text-h2 break-words text-text">
          {heading.name} <span className="text-text-subtle">|</span>{" "}
          <span className="text-text-muted">{heading.meta}</span>
        </h1>
        <Badge tone={STATUS_TONE[student.status]}>
          {STATUS_LABELS[student.status]}
        </Badge>
        <Link
          href={`/admin/students/edit?id=${encodeURIComponent(student.id)}`}
          className={`${buttonVariants({ variant: "secondary", size: "md" })} ml-auto`}
        >
          정보 수정
        </Link>
      </div>
      {student.school ? null : (
        <p className="text-body-sm text-text-muted">
          학교가 비어 있어요.{" "}
          <button
            type="button"
            className="text-text-brand underline underline-offset-2"
            onClick={() => go("info")}
          >
            기본 정보의 학교·보호자에서 입력해 주세요.
          </button>
        </p>
      )}
      <div ref={tabRow} className="min-w-0 overflow-x-auto">
        <Tabs
          ariaLabel="학생 기록"
          value={tab}
          onChange={go}
          items={HUB_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            count: t.value === "clinic" && open > 0 ? open : undefined,
          }))}
        />
      </div>
      <div role="tabpanel" className="flex min-w-0 flex-col gap-4">
        <TabBody tab={tab} student={student} />
      </div>
    </div>
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
  return <Hub student={student} />;
}
