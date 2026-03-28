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
 * Service Role client for bypass RLS and admin tasks
 */
export function getAdminDB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
