/**
 * Marketplace Intelligence v4 — database access (read-only on products).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
let _db: SupabaseClient | null = null;

export function getIntelligenceDB(): SupabaseClient {
  if (!_db) {
    _db = createClient(
      getSupabaseUrl(),
      getSupabaseSecretKey(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _db;
}

export const INTELLIGENCE_BATCH_SIZE = 500;
