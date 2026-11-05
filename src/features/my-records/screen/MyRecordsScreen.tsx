"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/design-system";
import { useMyStudent } from "@/features/auth";
import { MyClinicList } from "@/features/clinic";
import { MyTestList } from "@/features/test-records";

const TABS = [
  { value: "tests", label: "테스트 기록" },
  { value: "clinic", label: "클리닉" },
] as const;
type RecordTab = (typeof TABS)[number]["value"];

export function parseRecordTab(raw: string | null): RecordTab {
  return raw === "clinic" ? "clinic" : "tests";
}

/** 학생 "기록" 탭: 테스트 기록과 클리닉(재시험·보완)을 나눠 봐요. */
export function MyRecordsScreen() {
  const router = useRouter();
  const tab = parseRecordTab(useSearchParams().get("tab"));
  const student = useMyStudent();
  const studentId = student.data?.id ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-h1 text-text">기록</h1>
      <Tabs
        variant="segment"
        ariaLabel="기록 종류"
        items={TABS.map((t) => ({ value: t.value, label: t.label }))}
        value={tab}
        onChange={(next) =>
          router.replace(`/s/records?tab=${encodeURIComponent(next)}`, {
            scroll: false,
          })
        }
      />
      <div role="tabpanel" className="flex min-w-0 flex-col gap-4">
        {studentId === null ? (
          <p className="text-body text-text-muted">불러오는 중이에요.</p>
        ) : tab === "tests" ? (
          <MyTestList studentId={studentId} />
        ) : (
          <MyClinicList studentId={studentId} />
        )}
      </div>
    </div>
  );
}
