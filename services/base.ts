
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/types/supabase";

export const getDB = cache(async () => {
  return createClient();
});

let _adminClient: ReturnType<typeof createAdminClient<Database>> | null = null;

export function getAdminDB() {
  if (!_adminClient) {
    _adminClient = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _adminClient;
}