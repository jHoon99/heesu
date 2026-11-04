"use client";

import { Coins } from "lucide-react";
import { classifyError } from "@/core/supabase/error";
import { PointsProgress } from "@/design-system";
import { useSiteContent } from "@/features/site-content";
import { useGoalCelebration } from "../state/useGoalCelebration";
import { useMyPointTotal, useMyRank } from "../state/useMyPoints";

export function PointsCard({ studentId }: { studentId: string }) {
  const total = useMyPointTotal(studentId);
  const rank = useMyRank(studentId);
  const site = useSiteContent();
  // 목표는 사이트 내용을 성공적으로 받았을 때만 믿는다(실패하면 기본값으로 축하하지 않는다).
  const goal = site.isSuccess ? site.content.pointsGoal : undefined;
  useGoalCelebration(studentId, total.data, goal);

  if (total.data === undefined && total.isError) {
    return (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(total.error).message}
      </p>
    );
  }
  if (total.data === undefined || site.isLoading) {
    return (
      <div aria-busy="true" className="h-[168px] rounded-xl bg-points-soft" />
    );
  }
  const rankProps = rank.data
    ? { rank: rank.data.rank, rankTotal: rank.data.total }
    : {};
  if (goal === undefined) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-points-soft p-5">
        <div className="flex items-center gap-1.5 text-label text-points-ink">
          <Coins size={16} aria-hidden="true" />
          <span>내 포인트</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-number-xl text-text">{total.data}</span>
          <span className="text-body text-text-muted">점</span>
        </div>
        {rank.data ? (
          <p className="text-body-sm text-text-muted">
            전체 {rank.data.total}명 중 {rank.data.rank}등
          </p>
        ) : null}
      </div>
    );
  }
  return <PointsProgress points={total.data} goal={goal} {...rankProps} />;
}
