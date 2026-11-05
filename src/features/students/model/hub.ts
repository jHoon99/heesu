/** 학생 허브 탭: 원장 그림 순서 그대로. 주소의 `tab=` 값이에요. */
export const HUB_TABS = [
  { value: "info", label: "기본 정보" },
  { value: "attendance", label: "출결" },
  { value: "lessons", label: "수업 일지" },
  { value: "tests", label: "테스트" },
  { value: "clinic", label: "클리닉" },
  { value: "counsel", label: "상담" },
  { value: "payments", label: "수납" },
] as const;

export type HubTab = (typeof HUB_TABS)[number]["value"];

/** 없거나 모르는 값이면 "기본 정보". */
export function parseHubTab(raw: string | null): HubTab {
  return HUB_TABS.find((t) => t.value === raw)?.value ?? "info";
}

/** "김하늘 | 양현고 고1". 학교가 없으면 학년만. */
export function hubHeading(
  name: string,
  school: string | null,
  grade: string,
): { name: string; meta: string } {
  const s = school?.trim();
  return { name, meta: s ? `${s} ${grade}` : grade };
}
