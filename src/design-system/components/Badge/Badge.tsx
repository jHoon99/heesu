import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "../../cn";

const badge = cva(
  "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-caption whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-gray-100 text-gray-700",
        warning: "bg-warning-50 text-warning-700",
        brand: "bg-primary-soft text-text-brand",
        solid: "bg-primary text-text-on-brand",
        points: "bg-points-soft text-points-ink",
        new: "bg-brown-900 text-text-on-brand",
        count: "min-w-5 bg-primary px-1.5 text-text-on-brand tabular-nums",
      },
    },
  },
);

export interface BadgeProps {
  tone?: "neutral" | "warning" | "brand" | "solid" | "points" | "new" | "count";
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function Badge({
  tone = "neutral",
  icon: Icon,
  className,
  children,
}: BadgeProps) {
  return (
    <span className={cn(badge({ tone }), className)}>
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
