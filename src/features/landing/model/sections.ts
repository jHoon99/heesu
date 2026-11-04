export type SectionId =
  | "about"
  | "director"
  | "program"
  | "classes"
  | "tuition"
  | "location"
  | "consult";

export const SECTIONS: readonly { id: SectionId; label: string }[] = [
  { id: "about", label: "소개" },
  { id: "director", label: "원장" },
  { id: "program", label: "수업 방식" },
  { id: "classes", label: "반·시간표" },
  { id: "tuition", label: "수강료" },
  { id: "location", label: "오시는 길" },
  { id: "consult", label: "상담" },
];

/** 모바일 하단 CTA 바: 조금 스크롤한 뒤부터, 상담 섹션이 가까워지면 숨겨요. */
export function shouldShowCtaBar(
  scrollY: number,
  consultTop: number,
  viewportHeight: number,
): boolean {
  return scrollY > 480 && consultTop > viewportHeight * 0.8;
}
