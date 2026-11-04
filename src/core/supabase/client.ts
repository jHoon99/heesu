import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/core/env";
import type { Database } from "./database.types";

export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.supabaseUrl,
  env.supabasePublishableKey,
  { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true } },
);

export type { Session, User, AuthError } from "@supabase/supabase-js";
