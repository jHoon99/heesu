import { supabase } from "@/core/supabase/client";
import { parseSchedule, type ScheduleSlot } from "@/features/classes";

export type MyProfile = {
  id: string;
  name: string;
  grade: string;
  loginId: string;
  /** 반 이름순. schedule이 형식에 안 맞으면 빈 목록. */
  classes: { id: string; name: string; schedule: ScheduleSlot[] }[];
};

export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const { data, error } = await supabase
    .from("students")
    .select(
      "id, name, grade, login_id, class_members(classes(id, name, schedule))",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const classes = data.class_members
    .flatMap((m) =>
      m.classes
        ? [
            {
              id: m.classes.id,
              name: m.classes.name,
              schedule: parseSchedule(m.classes.schedule).schedule,
            },
          ]
        : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return {
    id: data.id,
    name: data.name,
    grade: data.grade,
    loginId: data.login_id,
    classes,
  };
}
