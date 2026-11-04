export const videoKeys = {
  all: ["videos"] as const,
  adminList: (classId: string) => ["videos", "admin", classId] as const,
  detail: (id: string) => ["videos", "detail", id] as const,
  views: (id: string) => ["videos", "views", id] as const,
  mine: (studentId: string) => ["videos", "mine", studentId] as const,
  playback: (id: string) => ["videos", "playback", id] as const,
};
