"use client";

import { useMyStudent } from "@/features/auth";
import { Card } from "@/design-system";
import { TodayHomeworkCard } from "@/features/homework";
import { useMyProfile } from "@/features/student-shell";
import { PointsCard } from "../components/PointsCard";
import { formatTodayLabel, greeting } from "../model/greeting";

export function StudentHomeScreen() {
  const profile = useMyProfile();
  const student = useMyStudent();
  const name = profile.data?.name ?? student.data?.name ?? "";
  const studentId = profile.data?.id ?? student.data?.id ?? null;
  const classNames = profile.data?.classes.map((c) => c.name) ?? [];
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-body-sm text-text-muted">
          {formatTodayLabel(new Date())}
          {classNames.length > 0 ? ` · ${classNames.join("·")}` : ""}
        </p>
        <h1 className="text-h1 text-text">{greeting(name)}</h1>
      </header>
      {studentId !== null ? (
        <>
          <PointsCard studentId={studentId} />
          <TodayHomeworkCard studentId={studentId} />
        </>
      ) : null}
      <Card title="새 영상">
        <p className="text-body text-text-muted">영상 수업은 곧 열려요.</p>
      </Card>
    </div>
  );
}
