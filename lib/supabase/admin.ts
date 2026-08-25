import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey } from "@/lib/supabase/service-role";
import { getSupabaseUrl } from "@/lib/supabase/public-env";

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
 * Only use in server-side admin actions after assertPlatformAdmin().
 */
export function getAdminDB() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
