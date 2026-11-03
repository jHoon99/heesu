// 희수영어 — window.Heesu (React 18). Types are documentation.
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";

export type IconName = "check" | "x" | "clock" | "repeat" | "alert" | "minus" | "home" | "book" | "play" | "video" | "trophy" | "user" | "users" | "calendar" | "clipboard" | "chat" | "settings" | "chart" | "chevronDown" | "chevronLeft" | "chevronRight" | "bell" | "phone" | "sparkle" | "search" | "download" | "pin";
export type Attendance = "none" | "present" | "late" | "absent" | "makeup";
export type Homework = "none" | "done" | "missing";

export interface IconProps { name: IconName; size?: number; label?: string; strokeWidth?: number; className?: string }
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; block?: boolean; icon?: IconName; iconRight?: IconName }
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> { label?: ReactNode; hint?: ReactNode; error?: ReactNode; required?: boolean; size?: "md" | "lg"; multiline?: boolean }
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> { label?: ReactNode; hint?: ReactNode; error?: ReactNode; size?: "md" | "lg"; placeholder?: string; options: (string | { value: string; label: string })[] }
export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> { label: ReactNode; description?: ReactNode }
export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> { label: ReactNode; description?: ReactNode }
export interface StatusChipProps { status: Attendance | Homework; label?: string; size?: "sm" | "md"; onClick?: () => void; ariaLabel?: string }
export interface BadgeProps { tone?: "neutral" | "brand" | "solid" | "points" | "new" | "count"; icon?: IconName; children: ReactNode }
export interface CardProps { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; tone?: "raised" | "subtle"; size?: "md" | "lg"; as?: string; children?: ReactNode }
export interface TabsProps { items: { value: string; label: ReactNode; count?: number }[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; variant?: "line" | "segment"; ariaLabel?: string }
export interface ModalProps { open: boolean; title: ReactNode; children?: ReactNode; footer?: ReactNode; onClose?: () => void; width?: number; inline?: boolean }
export interface ToastProps { tone?: "neutral" | "success" | "danger" | "info" | "points"; children: ReactNode; actionLabel?: string; onAction?: () => void; icon?: IconName }
export interface AttendanceTableProps {
  students: { id: string; name: string; meta?: string }[];
  dates: { key: string; label: string; day: string; today?: boolean }[];
  records?: Record<string, Record<string, { att?: Attendance; hw?: Homework }>>;
  defaultRecords?: AttendanceTableProps["records"];
  onChange?: (studentId: string, dateKey: string, field: "att" | "hw", value: Attendance | Homework) => void;
  showHomework?: boolean; maxHeight?: number;
}
export interface AdminSidebarProps { active?: string; items?: ({ group: string } | { value: string; label: string; icon: IconName; count?: number })[]; onNavigate?: (v: string) => void; logoSrc?: string; academyName?: string; userName?: string; userRole?: string }
export interface StudentTabBarProps { active?: string; items?: { value: string; label: string; icon: IconName; dot?: boolean }[]; onNavigate?: (v: string) => void }
export interface VideoCardProps { title: ReactNode; subtitle?: ReactNode; unit?: string; duration?: string; progress?: number; isNew?: boolean; layout?: "column" | "row"; onClick?: () => void }
export interface PointsProgressProps { points: number; goal: number; goalLabel?: string; rank?: number; rankScope?: string; delta?: number; label?: string; compact?: boolean }
export interface ConsultFormProps { onSubmit?: (data: { parent: string; phone: string; grade: string; school?: string; time: string; message?: string; agree: "y" }) => void; submitLabel?: string }

// ---------- Motion ----------
export interface RevealProps { children: ReactNode; delay?: number; distance?: "rise-sm" | "rise-md"; immediate?: boolean; as?: string; className?: string }
export interface TextRiseProps { lines: string[]; delay?: number; stagger?: number; immediate?: boolean; as?: string }
export interface LeafDrawProps { size?: number; color?: string; delay?: number; immediate?: boolean }
export interface CountUpProps { value: number; from?: number; duration?: number; immediate?: boolean; format?: boolean; suffix?: ReactNode }
export interface PointsBurstProps { amount: number; trigger: unknown; children: ReactNode }
export interface ConfettiProps { fire: unknown; originX?: number; originY?: number; count?: number }
export declare function useReducedMotion(): boolean;
