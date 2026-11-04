import { supabase } from "@/core/supabase/client";

export async function getSiteContent(): Promise<
  { key: string; value: unknown }[]
> {
  const { data, error } = await supabase
    .from("site_content")
    .select("key, value");
  if (error) throw error;
  return data;
}
