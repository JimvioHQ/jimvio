import { createClient } from "@supabase/supabase-js";

/**
 * Supabase API key resolvers — new keys preferred, legacy fallbacks for compatibility.
 *
 * Frontend / user-scoped: SUPABASE_PUBLISHABLE_KEY (sb_publishable_...)
 * Backend / admin:        SUPABASE_SECRET_KEY (sb_secret_...)
 */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

/** Publishable key for browser + cookie-scoped server clients (RLS applies). */
export function getSupabasePublishableKey(): string {
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  if (!key) {
    throw new Error(
      "Missing SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  return key;
}

/** Secret key for server admin / cron / webhooks (bypasses RLS). */
export function getSupabaseSecretKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return key;
}

export function hasSupabaseSecretKey(): boolean {
  return Boolean(
    process.env.SUPABASE_SECRET_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/** Server-only client that bypasses RLS. Use only after authorizing the user in application code. */
export function createServiceRoleClient() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
