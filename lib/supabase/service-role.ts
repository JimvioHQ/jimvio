import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/public-env";

export { getSupabasePublishableKey, getSupabaseUrl };

/** Secret key for server admin / cron / webhooks (bypasses RLS). */
export function getSupabaseSecretKey(): string {
  // Runtime guard: this module is transitively imported by some client paths
  // (e.g. post-login-redirect helpers). Do not use import "server-only" here.
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseSecretKey is server-only");
  }
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
  if (typeof window !== "undefined") {
    throw new Error("createServiceRoleClient is server-only");
  }
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
