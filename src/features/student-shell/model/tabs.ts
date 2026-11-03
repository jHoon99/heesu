import {
  BookOpen,
  CirclePlay,
  House,
  MessageCircleQuestionMark,
  User,
} from "lucide-react";
import type { StudentTabItem } from "@/design-system";

export type StudentTab = "home" | "homework" | "videos" | "questions" | "me";

export const STUDENT_TABS: (StudentTabItem & { value: StudentTab })[] = [
  { value: "home", label: "홈", href: "/s", icon: House },
  { value: "homework", label: "숙제", href: "/s/homework", icon: BookOpen },
  { value: "videos", label: "영상", href: "/s/videos", icon: CirclePlay },
  {
    value: "questions",
    label: "질문",
    href: "/s/questions",
    icon: MessageCircleQuestionMark,
  },
  { value: "me", label: "내 정보", href: "/s/me", icon: User },
];

const PREFIXES: [string, StudentTab][] = [
  ["/s/homework", "homework"],
  ["/s/videos", "videos"],
  ["/s/questions", "questions"],
  ["/s/me", "me"],
];

export function activeTabFor(pathname: string): StudentTab {
  const path = pathname.replace(/\/+$/, "");
  for (const [prefix, tab] of PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return tab;
  }
  return "home";
}
