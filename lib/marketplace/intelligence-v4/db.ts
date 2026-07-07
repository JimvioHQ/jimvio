/**
 * Marketplace Intelligence v4 — database access (read-only on products).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _db: SupabaseClient | null = null;

export function getIntelligenceDB(): SupabaseClient {
  if (!_db) {
    _db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _db;
}

export const INTELLIGENCE_BATCH_SIZE = 500;
