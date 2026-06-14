import { createAdminClient } from "@/lib/supabase/admin";

export const MAINTENANCE_LOGIN_ERROR =
  "The platform is in maintenance mode. Only administrators can sign in right now.";

type FeaturesRow = {
  maintenance_mode?: boolean;
};

let cachedMaintenance: { value: boolean; expiresAt: number } | null = null;
const CACHE_MS = 15_000;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function getMaintenanceModeEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedMaintenance && cachedMaintenance.expiresAt > now) {
    return cachedMaintenance.value;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "features")
      .maybeSingle();

    const features =
      data?.value && typeof data.value === "object"
        ? (data.value as FeaturesRow)
        : null;
    const enabled = Boolean(features?.maintenance_mode);

    cachedMaintenance = { value: enabled, expiresAt: now + CACHE_MS };
    return enabled;
  } catch (err) {
    console.error("[maintenance] failed to read platform settings:", err);
    return false;
  }
}

export async function userIsPlatformAdmin(
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (isAdminEmail(email)) return true;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

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
