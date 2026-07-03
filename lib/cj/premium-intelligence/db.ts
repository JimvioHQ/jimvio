import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Untyped admin client for CJ premium intelligence tables (pre-codegen migration 065). */
let _catalogDb: SupabaseClient | null = null;

export function getCatalogDB(): SupabaseClient {
  if (!_catalogDb) {
    _catalogDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _catalogDb;
}
