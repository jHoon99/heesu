import { Coins, Trophy } from "lucide-react";
import { cn } from "../../cn";
import { CountUp, ProgressFill } from "../../motion/motion";
import { Badge } from "../Badge/Badge";

export interface PointsProgressProps {
  points: number;
  goal: number;
  goalLabel?: string;
  rank?: number;
  rankTotal?: number;
  rankScope?: string;
  delta?: number;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function pointsRemaining(points: number, goal: number): number {
  return Math.max(0, goal - points);
}

export function progressPercent(points: number, goal: number): number {
  if (goal <= 0) return 100;
  return Math.min(100, Math.max(0, (points / goal) * 100));
}

export function PointsProgress({
  points,
  goal,
  goalLabel = "보상",
  rank,
  rankTotal,
  rankScope = "전체",
  delta,
  label = "내 포인트",
  compact = false,
  className,
}: PointsProgressProps) {
  const remaining = pointsRemaining(points, goal);
  const showRank = !compact && rank !== undefined && rankTotal !== undefined;
  const rankText = showRank ? `${rankScope} ${rankTotal}명 중 ${rank}등` : "";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-points-soft",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      {compact ? null : (
        <>
          <span
            aria-hidden="true"
            className="absolute -top-8 -right-8 size-28 rounded-full bg-points/20"
          />
          <span
            aria-hidden="true"
            className="absolute top-10 -right-4 size-16 rounded-full bg-points/20"
          />
        </>
      )}
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-label text-points-ink">
          <Coins size={16} aria-hidden="true" />
          <span>{label}</span>
          {delta !== undefined && delta > 0 ? (
            <Badge tone="points" className="ml-1">
              +{delta}점
            </Badge>
          ) : null}
        </div>
        <div className="flex items-baseline gap-1">
          <CountUp
            value={points}
            className={cn("text-text", compact ? "text-h1" : "text-number-xl")}
          />
          <span className="text-body text-text-muted">점</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(Math.max(points, 0), goal)}
          aria-label={`${goalLabel}까지 진행`}
          className="h-2 overflow-hidden rounded-full bg-bg-surface"
        >
          <ProgressFill
            value={progressPercent(points, goal)}
            className="h-full rounded-full bg-points"
          />
        </div>
        <p className="text-body-sm text-text">
          {remaining > 0
            ? `${goalLabel}까지 ${remaining}점 남았어요`
            : `${goalLabel} 목표를 달성했어요! 원장님께 말씀해 주세요.`}
        </p>
        {showRank ? (
          rank <= 3 ? (
            <Badge tone="points" icon={Trophy} className="self-start">
              {rankText}
            </Badge>
          ) : (
            <p className="text-body-sm text-text-muted">{rankText}</p>
          )
        ) : null}
      </div>
    </div>
  );
}
