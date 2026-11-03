import type { ElementType, ReactNode } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../cn";

const card = cva("border", {
  variants: {
    tone: {
      default: "border-border bg-bg-surface",
      raised: "border-border bg-bg-surface-raised",
      subtle: "border-primary-soft bg-bg-subtle",
    },
    size: { md: "rounded-lg p-4", lg: "rounded-xl p-5" },
  },
});

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tone?: "raised" | "subtle";
  size?: "md" | "lg";
  as?: ElementType;
  children?: ReactNode;
}

export function Card({
  title,
  subtitle,
  actions,
  tone,
  size = "md",
  as,
  children,
}: CardProps) {
  const Tag: ElementType = as ?? "div";
  const hasHeader = Boolean(title) || Boolean(subtitle) || Boolean(actions);
  return (
    <Tag className={cn(card({ tone: tone ?? "default", size }))}>
      {hasHeader ? (
        <div
          className={cn(
            "flex items-start justify-between gap-3",
            children ? "mb-3" : "",
          )}
        >
          <div className="min-w-0">
            {title ? <h3 className="text-h3 text-text">{title}</h3> : null}
            {subtitle ? (
              <p className="text-body-sm text-text-muted">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}
