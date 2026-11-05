import {
  BookOpen,
  CirclePlay,
  ClipboardCheck,
  FolderOpen,
  MessageCircleQuestionMark,
} from "lucide-react";
import type { StudentTabItem } from "@/design-system";

/**
 * 원장 그림의 학생 메뉴(나의 수업 · 내신 강의실 · 학습 자료실 · 테스트 기록 · 클리닉)에 맞춘 하단 탭.
 * 탭은 5개까지라 강의실(수업 영상 + 내신 강의실), 기록(테스트 기록 + 클리닉)으로 묶고,
 * 질문은 원장 답을 들을 때까지 탭으로 둬요. 숙제·내 정보는 나의 수업 안에서 열어요.
 */
export type StudentTab =
  "mine" | "videos" | "materials" | "records" | "questions";

export const STUDENT_TABS: (StudentTabItem & { value: StudentTab })[] = [
  { value: "mine", label: "나의 수업", href: "/s", icon: BookOpen },
  { value: "videos", label: "강의실", href: "/s/videos", icon: CirclePlay },
  {
    value: "materials",
    label: "자료실",
    href: "/s/materials",
    icon: FolderOpen,
  },
  { value: "records", label: "기록", href: "/s/records", icon: ClipboardCheck },
  {
    value: "questions",
    label: "질문",
    href: "/s/questions",
    icon: MessageCircleQuestionMark,
  },
];

const PREFIXES: [string, StudentTab][] = [
  ["/s/videos", "videos"],
  ["/s/materials", "materials"],
  ["/s/records", "records"],
  ["/s/questions", "questions"],
];

/** /s, /s/homework, /s/me와 모르는 주소는 "나의 수업". */
export function activeTabFor(pathname: string): StudentTab {
  const path = pathname.replace(/\/+$/, "");
  for (const [prefix, tab] of PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return tab;
  }
  return "mine";
}
