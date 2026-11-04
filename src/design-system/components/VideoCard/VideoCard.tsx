import type { ElementType, ReactNode } from "react";
import { Check, Play } from "lucide-react";
import { cn } from "../../cn";
import { ProgressFill } from "../../motion/motion";
import { Badge } from "../Badge/Badge";

export interface VideoCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  unit?: string;
  duration?: string;
  progress?: number;
  isNew?: boolean;
  layout?: "column" | "row";
  href?: string;
  linkComponent?: ElementType;
  onClick?: () => void;
  className?: string;
}

export function clampProgress(p: number | undefined): number | undefined {
  if (p === undefined) return undefined;
  return Math.min(100, Math.max(0, Math.round(p)));
}

export function VideoCard({
  title,
  subtitle,
  unit,
  duration,
  progress,
  isNew,
  layout = "column",
  href,
  linkComponent: Link = "a",
  onClick,
  className,
}: VideoCardProps) {
  const p = clampProgress(progress);
  const isRow = layout === "row";
  const interactive = href !== undefined || onClick !== undefined;
  const rootClass = cn(
    "flex w-full gap-3 rounded-xl border border-border bg-bg-surface p-3 text-left",
    isRow ? "flex-row items-center" : "flex-col",
    interactive &&
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
    className,
  );

  const content: ReactNode = (
    <>
      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-lg bg-primary-soft",
          isRow ? "w-28 shrink-0" : "w-full",
        )}
      >
        <span
          aria-hidden="true"
          className="absolute -top-6 -left-6 size-24 rounded-full bg-primary/10"
        />
        <span
          aria-hidden="true"
          className="absolute -right-8 -bottom-8 size-28 rounded-full bg-primary/10"
        />
        {unit ? (
          <span className="absolute top-2 left-3 font-serif text-h3 text-text-brand">
            {unit}
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg-surface text-text-brand"
        >
          <Play size={18} />
        </span>
        {duration ? (
          <span className="hs-num absolute right-1.5 bottom-1.5 rounded bg-brown-900/80 px-1.5 text-caption text-text-on-brand">
            {duration}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {isNew ? (
          <span>
            <Badge tone="new">새 영상</Badge>
          </span>
        ) : null}
        <span className="line-clamp-2 text-body font-semibold break-words text-text">
          {title}
        </span>
        {subtitle ? (
          <span className="text-body-sm text-text-muted">{subtitle}</span>
        ) : null}
        {p === 100 ? (
          <span className="inline-flex items-center gap-1 text-body-sm text-success-700">
            <Check size={14} aria-hidden="true" />다 봤어요
          </span>
        ) : p !== undefined && p > 0 ? (
          <span className="flex flex-col gap-1">
            <span
              role="progressbar"
              aria-label="시청 진행"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={p}
              className="block h-1.5 overflow-hidden rounded-full bg-bg-subtle"
            >
              <ProgressFill
                value={p}
                className="h-1.5 rounded-full bg-primary"
              />
            </span>
            <span className="text-caption text-text-muted">{p}% 봤어요</span>
          </span>
        ) : null}
      </div>
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} className={rootClass}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rootClass}>
        {content}
      </button>
    );
  }
  return <div className={rootClass}>{content}</div>;
}
