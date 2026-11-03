import {
  AlertCircle,
  Check,
  Clock,
  Minus,
  Repeat,
  X,
  type LucideIcon,
} from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "../../cn";

export type Attendance = "none" | "present" | "late" | "absent" | "makeup";
export type Homework = "none" | "done" | "missing";

const ATTENDANCE_ORDER: Attendance[] = [
  "none",
  "present",
  "late",
  "absent",
  "makeup",
];
const HOMEWORK_ORDER: Homework[] = ["none", "done", "missing"];

export function nextAttendance(a: Attendance): Attendance {
  const i = ATTENDANCE_ORDER.indexOf(a);
  return ATTENDANCE_ORDER[(i + 1) % ATTENDANCE_ORDER.length] ?? "none";
}

export function nextHomework(h: Homework): Homework {
  const i = HOMEWORK_ORDER.indexOf(h);
  return HOMEWORK_ORDER[(i + 1) % HOMEWORK_ORDER.length] ?? "none";
}

type Status = Attendance | Homework;

const META: Record<Status, { text: string; icon: LucideIcon; tone: string }> = {
  none: {
    text: "미입력",
    icon: Minus,
    tone: "border border-dashed border-border-strong bg-transparent text-text-subtle",
  },
  present: {
    text: "출석",
    icon: Check,
    tone: "bg-success-50 text-success-700",
  },
  late: { text: "지각", icon: Clock, tone: "bg-warning-50 text-warning-700" },
  absent: { text: "결석", icon: X, tone: "bg-danger-50 text-danger-700" },
  makeup: { text: "보강", icon: Repeat, tone: "bg-info-50 text-info-700" },
  done: { text: "완료", icon: Check, tone: "bg-success-50 text-success-700" },
  missing: {
    text: "미완료",
    icon: AlertCircle,
    tone: "bg-incomplete-50 text-incomplete-700",
  },
};

const chip = cva(
  "inline-flex items-center gap-1 text-caption whitespace-nowrap transition-colors duration-(--dur-instant) ease-out",
  {
    variants: {
      size: { sm: "h-6 rounded-sm px-2", md: "h-7 rounded-full px-3" },
    },
  },
);

export interface StatusChipProps {
  status: Status;
  label?: string;
  size?: "sm" | "md";
  onClick?: () => void;
  ariaLabel?: string;
}

export function StatusChip({
  status,
  label,
  size = "md",
  onClick,
  ariaLabel,
}: StatusChipProps) {
  const meta = META[status];
  const Icon = meta.icon;
  const className = cn(chip({ size }), meta.tone);
  const content = (
    <>
      <Icon size={12} strokeWidth={2.25} aria-hidden="true" />
      <span>{label ?? meta.text}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(className, "cursor-pointer")}
      >
        {content}
      </button>
    );
  }
  return (
    <span className={className} aria-label={ariaLabel}>
      {content}
    </span>
  );
}
