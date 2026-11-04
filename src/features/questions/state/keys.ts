export const questionKeys = {
  all: ["questions"] as const,
  admin: ["questions", "admin"] as const,
  unanswered: ["questions", "unanswered"] as const,
  mine: (studentId: string) => ["questions", "mine", studentId] as const,
  linkOptions: (studentId: string) =>
    ["questions", "link-options", studentId] as const,
};
