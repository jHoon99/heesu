import { supabase } from "@/core/supabase/client";
import {
  parseClassRow,
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
  const { error } = await supabase
    .from("classes")
    .update(payload(input))
    .eq("id", id);
  if (error) throw error;
}
