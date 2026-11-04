import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  House,
  MessageCircle,
  PanelsTopLeft,
  Phone,
  Receipt,
  Settings,
  Trophy,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

export type MenuValue =
  | "today"
  | "attendance"
  | "sessions"
  | "students"
  | "classes"
  | "videos"
  | "questions"
  | "consultations"
  | "points"
  | "payments"
  | "site"
  | "settings";

export type MenuItem = {
  value: MenuValue;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type MenuEntry = { group: string } | MenuItem;

export const ADMIN_MENU: MenuEntry[] = [
  { group: "수업" },
  { value: "today", label: "오늘", href: "/admin", icon: House },
  {
    value: "attendance",
    label: "출결·숙제",
    href: "/admin/attendance",
    icon: ClipboardCheck,
  },
  {
    value: "sessions",
    label: "수업일지",
    href: "/admin/sessions",
    icon: BookOpen,
  },
  { value: "students", label: "학생", href: "/admin/students", icon: Users },
  { value: "classes", label: "반", href: "/admin/classes", icon: CalendarDays },
  { value: "videos", label: "영상", href: "/admin/videos", icon: Video },
  {
    value: "questions",
    label: "질문",
    href: "/admin/questions",
    icon: MessageCircle,
  },
  { value: "points", label: "포인트", href: "/admin/points", icon: Trophy },
  { group: "학부모" },
  {
    value: "consultations",
    label: "상담",
    href: "/admin/consultations",
    icon: Phone,
  },
  { value: "payments", label: "결제", href: "/admin/payments", icon: Receipt },
  { group: "운영" },
  {
    value: "site",
    label: "홈페이지 관리",
    href: "/admin/site",
    icon: PanelsTopLeft,
  },
  { value: "settings", label: "설정", href: "/admin/settings", icon: Settings },
];

const ITEMS = ADMIN_MENU.filter((e): e is MenuItem => "value" in e);

export function activeMenuFor(pathname: string): MenuValue {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  let best: MenuItem | undefined;
  for (const item of ITEMS) {
    if (item.value === "today") continue;
    const hit = path === item.href || path.startsWith(`${item.href}/`);
    if (hit && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.value ?? "today";
}
