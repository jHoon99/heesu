import { supabase } from "@/core/supabase/client";

export type MyStudent = {
  id: string;
  name: string;
  mustChangePassword: boolean;
};

export async function getMyStudent(userId: string): Promise<MyStudent | null> {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, must_change_password")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    mustChangePassword: data.must_change_password,
  };
}

export async function updateMyPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function markPasswordChanged(): Promise<void> {
  const { error } = await supabase.rpc("password_changed");
  if (error) throw error;
}
