export const videoKeys = {
  all: ["videos"] as const,
  adminList: (classId: string) => ["videos", "admin", classId] as const,
  detail: (id: string) => ["videos", "detail", id] as const,
  roster: (classId: string) => ["videos", "roster", classId] as const,
  allMine: ["videos", "mine"] as const,
  mine: (studentId: string) => ["videos", "mine", studentId] as const,
  playback: (id: string) => ["videos", "playback", id] as const,
};
