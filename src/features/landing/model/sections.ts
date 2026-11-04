export type SectionId = "about" | "director" | "tuition" | "consult";

export const SECTIONS: readonly { id: SectionId; label: string }[] = [
  { id: "about", label: "소개" },
  { id: "director", label: "원장" },
  { id: "tuition", label: "수강료" },
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
