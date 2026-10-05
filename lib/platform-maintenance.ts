import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseSecretKey } from "@/lib/supabase/service-role";
import { isBootstrapAdminEmail } from "@/lib/auth/platform-admin";

export const MAINTENANCE_LOGIN_ERROR =
  "The platform is in maintenance mode. Only administrators can sign in right now.";

type FeaturesRow = {
  maintenance_mode?: boolean;
};

let cachedMaintenance: { value: boolean; expiresAt: number } | null = null;
const CACHE_MS = 60_000;

export function isAdminEmail(email: string | null | undefined): boolean {
  return isBootstrapAdminEmail(email);
}

const MAINTENANCE_LOOKUP_MS = 400;
/** Brief negative cache so a saturated DB cannot stampede every request. */
const MAINTENANCE_FAIL_CACHE_MS = 5_000;

export async function getMaintenanceModeEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedMaintenance && cachedMaintenance.expiresAt > now) {
    return cachedMaintenance.value;
  }

  if (!hasSupabaseSecretKey()) {
    return false;
  }

  try {
    const admin = createAdminClient();
    const lookup = admin
      .from("platform_settings")
      .select("value")
      .eq("key", "features")
      .maybeSingle();

    // Middleware runs on nearly every request — never block the edge on a
    // saturated Postgres. Soft-fail to "not in maintenance" on timeout.
    const timedOut = Symbol("maintenance-timeout");
    const raced = await Promise.race([
      lookup.then((result) => ({ kind: "ok" as const, result })),
      new Promise<{ kind: "timeout"; token: typeof timedOut }>((resolve) => {
        setTimeout(() => resolve({ kind: "timeout", token: timedOut }), MAINTENANCE_LOOKUP_MS);
      }),
    ]);

    if (raced.kind === "timeout") {
      cachedMaintenance = { value: false, expiresAt: now + MAINTENANCE_FAIL_CACHE_MS };
      return false;
    }

    const { data, error } = raced.result;
    if (error) {
      console.error("[maintenance] failed to read platform settings:", error.message);
      cachedMaintenance = { value: false, expiresAt: now + MAINTENANCE_FAIL_CACHE_MS };
      return false;
    }

    const features =
      data?.value && typeof data.value === "object"
        ? (data.value as FeaturesRow)
        : null;
    const enabled = Boolean(features?.maintenance_mode);

    cachedMaintenance = { value: enabled, expiresAt: now + CACHE_MS };
    return enabled;
  } catch (err) {
    console.error("[maintenance] failed to read platform settings:", err);
    cachedMaintenance = { value: false, expiresAt: now + MAINTENANCE_FAIL_CACHE_MS };
    return false;
  }
}

export async function userIsPlatformAdmin(
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (isAdminEmail(email)) return true;

  if (!hasSupabaseSecretKey()) {
    return false;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("is_active", true);

    return (data ?? []).length > 0;
  } catch (err) {
    console.error("[maintenance] admin role lookup failed:", err);
    return isAdminEmail(email);
  }
}

export async function canSignInDuringMaintenance(
  userId: string,
  email?: string | null
): Promise<boolean> {
  const maintenance = await getMaintenanceModeEnabled();
  if (!maintenance) return true;
  return userIsPlatformAdmin(userId, email);
}

export function isMaintenanceExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth")
  );
}
