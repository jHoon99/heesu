"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { buttonVariants } from "@/design-system";
import { useMyStudent } from "@/features/auth";
import { TodayHomeworkCard } from "@/features/homework";
import { NewVideoCard } from "@/features/videos";
import { useMyProfile } from "@/features/student-shell";
import { MyScheduleCard } from "../components/MyScheduleCard";
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
      <header className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-body-sm text-text-muted">
            {formatTodayLabel(new Date())}
            {classNames.length > 0 ? ` · ${classNames.join("·")}` : ""}
          </p>
          <h1 className="text-h1 break-words text-text">{greeting(name)}</h1>
        </div>
        <Link
          href="/s/me"
          className={`${buttonVariants({ variant: "ghost", size: "md" })} shrink-0`}
        >
          <UserRound size={20} aria-hidden="true" />내 정보
        </Link>
      </header>
      {studentId !== null ? (
        <>
          {profile.data ? (
            <MyScheduleCard classes={profile.data.classes} />
          ) : null}
          <TodayHomeworkCard studentId={studentId} />
          <PointsCard studentId={studentId} />
          <NewVideoCard studentId={studentId} />
        </>
      ) : null}
    </div>
  );
}
