import { supabase } from "@/core/supabase/client";
import {
  parseClassRow,
  SaveNotAppliedError,
  type ClassFormOutput,
  type ClassSummary,
} from "../model/classes";

const COLUMNS = "id, name, level, schedule, capacity, class_members(count)";

export async function listClasses(): Promise<ClassSummary[]> {
  const { data, error } = await supabase
    .from("classes")
    .select(COLUMNS)
    .order("name");
  if (error) throw error;
  return data.map(parseClassRow);
}

export async function getClass(id: string): Promise<ClassSummary | null> {
  const { data, error } = await supabase
    .from("classes")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? parseClassRow(data) : null;
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
