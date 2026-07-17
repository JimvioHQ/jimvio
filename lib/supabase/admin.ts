// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

export function createAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseSecretKey();

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Returns a Supabase client that uses the Secret API key (bypasses RLS).
 * Only use in server-side admin actions.
 */
export function getAdminDB() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
