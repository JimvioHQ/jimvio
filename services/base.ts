
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cache } from "react";
import { timedFetch } from "@/lib/supabase/timed-fetch";
import type { Database } from "@/types/supabase";

import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
export const getDB = cache(async () => {
  return createClient();
});

let _adminClient: ReturnType<typeof createAdminClient<Database>> | null = null;

export function getAdminDB() {
  if (!_adminClient) {
    _adminClient = createAdminClient<Database>(
      getSupabaseUrl(),
      getSupabaseSecretKey(),
      { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: timedFetch() } }
    );
  }
  return _adminClient;
}