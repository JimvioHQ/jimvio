import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cache } from "react";

/**
 * Standard Supabase client (SSR)
 */
export const getDB = cache(async () => {
  return createClient();
});

/**
 * Service Role client for bypass RLS and admin tasks.
 * Uses a module-level singleton to avoid re-creating the client on every call.
 */
let _adminClient: ReturnType<typeof createAdminClient> | null = null;

export function getAdminDB() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _adminClient;
}
