import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import {
  parseClassRow,
  type ClassFormOutput,
  type ClassSummary,
} from "../model/classes";

const COLUMNS = "id, name, level, schedule, capacity";

// 인원 수는 class_roster(퇴원생 제외)에서 센다. class_members를 직접 세면 퇴원생이 섞여요.
async function rosterCounts(classId?: string): Promise<Map<string, number>> {
  const base = supabase.from("class_roster").select("class_id");
  const { data, error } = await (classId === undefined
    ? base
    : base.eq("class_id", classId));
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data) {
    const id = row.class_id;
    if (id === null) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export async function listClasses(): Promise<ClassSummary[]> {
  const [{ data, error }, counts] = await Promise.all([
    supabase.from("classes").select(COLUMNS).order("name"),
    rosterCounts(),
  ]);
  if (error) throw error;
  return data.map((row) => parseClassRow(row, counts.get(row.id) ?? 0));
}

export async function getClass(id: string): Promise<ClassSummary | null> {
  const [{ data, error }, counts] = await Promise.all([
    supabase.from("classes").select(COLUMNS).eq("id", id).maybeSingle(),
    rosterCounts(id),
  ]);
  if (error) throw error;
  return data ? parseClassRow(data, counts.get(id) ?? 0) : null;
}

function payload(input: ClassFormOutput) {
  return {
    name: input.name.trim(),
    level: input.level,
    schedule: input.schedule,
    capacity: input.capacity,
  };
}

export async function createClass(input: ClassFormOutput): Promise<string> {
  const { data, error } = await supabase
    .from("classes")
    .insert(payload(input))
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateClass(
  id: string,
  input: ClassFormOutput,
): Promise<void> {
  const { data, error } = await supabase
    .from("classes")
    .update(payload(input))
    .eq("id", id)
    .select("id");
  if (error) throw error;
  // RLS가 막거나 없는 id면 오류 없이 0행이 돌아와요.
  if (data.length === 0) throw new SaveNotAppliedError();
}
