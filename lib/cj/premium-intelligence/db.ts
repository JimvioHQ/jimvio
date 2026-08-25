import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

/** Untyped admin client for CJ premium intelligence tables (pre-codegen migration 065). */
let _catalogDb: SupabaseClient | null = null;

export function getCatalogDB(): SupabaseClient {
  if (!_catalogDb) {
    _catalogDb = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _catalogDb;
}
