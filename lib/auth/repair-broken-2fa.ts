import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminDb = SupabaseClient;

export type BrokenTwoFactorState = {
  broken: boolean;
  profileEnabled: boolean;
  hasActiveSecret: boolean;
  hasSecretsRow: boolean;
};

/** Active 2FA = non-empty TOTP secret on file (not merely the profile flag). */
export function hasActiveTwoFactorSecret(secret: string | null | undefined): boolean {
  return typeof secret === "string" && secret.trim().length > 0;
}

export async function getBrokenTwoFactorState(
  admin: AdminDb,
  userId: string,
): Promise<BrokenTwoFactorState> {
  const [{ data: profile }, { data: secretRow }] = await Promise.all([
    admin.from("profiles").select("two_factor_enabled").eq("id", userId).maybeSingle(),
    admin
      .from("user_2fa_secrets")
      .select("secret")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const profileEnabled = profile?.two_factor_enabled === true;
  const hasActiveSecret = hasActiveTwoFactorSecret(secretRow?.secret);
  const broken = profileEnabled && !hasActiveSecret;

  return {
    broken,
    profileEnabled,
    hasActiveSecret,
    hasSecretsRow: Boolean(secretRow),
  };
}

/**
 * Clears incomplete 2FA enrollment: profile flag without a usable TOTP secret.
 * Does not disable legitimately enrolled 2FA (secret present).
 */
export async function repairBrokenTwoFactorState(
  userId: string,
  admin: AdminDb = createAdminClient(),
): Promise<{ repaired: boolean; reason?: string }> {
  const state = await getBrokenTwoFactorState(admin, userId);
  if (!state.broken) {
    return { repaired: false, reason: "not_broken" };
  }

  const now = new Date().toISOString();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ two_factor_enabled: false, updated_at: now })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to clear broken 2FA profile flag: ${profileError.message}`);
  }

  if (state.hasSecretsRow) {
    const { error: deleteError } = await admin
      .from("user_2fa_secrets")
      .delete()
      .eq("user_id", userId);
    if (deleteError) {
      throw new Error(`Failed to remove incomplete 2FA secret row: ${deleteError.message}`);
    }
  }

  return { repaired: true };
}
