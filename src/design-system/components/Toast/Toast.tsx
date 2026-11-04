import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../cn";

type Tone = "neutral" | "success" | "danger" | "info" | "points";

const TONE: Record<Tone, { icon: LucideIcon; iconClass: string }> = {
  neutral: { icon: Info, iconClass: "text-gray-300" },
  success: { icon: CheckCircle2, iconClass: "text-success-500" },
  danger: { icon: AlertCircle, iconClass: "text-danger-500" },
  info: { icon: Info, iconClass: "text-info-500" },
  points: { icon: Sparkles, iconClass: "text-points" },
};

export interface ToastProps {
  tone?: Tone;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}

export function Toast({
  tone = "neutral",
  children,
  actionLabel,
  onAction,
  icon,
}: ToastProps) {
  const meta = TONE[tone];
  const Icon = icon ?? meta.icon;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className="inline-flex max-w-full items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-body-sm text-text-on-brand shadow-md"
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={cn("shrink-0", meta.iconClass)}
      />
      <span className="min-w-0">{children}</span>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="ml-1 shrink-0 cursor-pointer rounded-sm text-label text-honey-300 underline-offset-2 hover:underline"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
