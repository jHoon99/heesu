import type { Json } from "@/core/supabase/database.types";
import { supabase } from "@/core/supabase/client";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import type { SiteContentKey } from "../model/siteContentWrite";

export async function saveSiteContent(
  key: SiteContentKey,
  value: NonNullable<Json>,
): Promise<void> {
  const { data, error } = await supabase
    .from("site_content")
    .upsert({ key, value }, { onConflict: "key" })
    .select("key");
  if (error) throw error;
  if (!data || data.length === 0) throw new SaveNotAppliedError();
}
