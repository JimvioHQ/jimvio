import { createAdminClient } from "@/lib/supabase/admin";

type RecoverResult = {
  ok?: boolean;
  reason?: string;
};

function isRecoverOk(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  return (data as RecoverResult).ok === true;
}

/**
 * Idempotent profile / role / wallet recovery for a live Auth user.
 * Relinks an orphan profile that already owns the same email when that
 * profile id is not a live auth.users row. Never creates a second Auth user.
 */
export async function ensureUserProfile(
  userId: string,
  email: string,
  fullName?: string,
): Promise<boolean> {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.rpc("recover_profile_for_auth_user", {
      p_auth_user_id: userId,
      p_email: email,
      p_full_name: fullName || email.split("@")[0],
    });
    if (error) {
      console.error("[auth] recover_profile_for_auth_user failed:", error.message);
      return false;
    }
    if (!isRecoverOk(data)) {
      console.error("[auth] recover_profile_for_auth_user declined:", data);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[auth] ensureUserProfile error:", err);
    return false;
  }
}

export async function authProvidersForEmail(
  email: string,
): Promise<{ userId: string; providers: string[] } | null> {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.rpc("auth_identity_providers_for_email", {
      p_email: email,
    });
    if (error) {
      console.error("[auth] identity lookup failed:", error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") return null;
    const userId = (row as { user_id?: string }).user_id;
    const providers = (row as { providers?: string[] }).providers;
    if (!userId) return null;
    return {
      userId,
      providers: Array.isArray(providers) ? providers.filter(Boolean) : [],
    };
  } catch (err) {
    console.error("[auth] identity lookup failed:", err);
    return null;
  }
}
