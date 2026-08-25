import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Marketplace roles a signed-in user may receive through a trusted server path. */
export const CLAIMABLE_USER_ROLES = [
  "vendor",
  "affiliate",
  "influencer",
  "community_owner",
] as const;

export type ClaimableUserRole = (typeof CLAIMABLE_USER_ROLES)[number];

const CLAIMABLE = new Set<string>(CLAIMABLE_USER_ROLES);

/**
 * Attach a non-privileged role to the authenticated caller.
 * The role is chosen by the server caller, never by a client-supplied SQL row.
 * Admin / super_admin cannot be provisioned here.
 */
export async function provisionOwnNonPrivilegedRole(
  role: ClaimableUserRole,
): Promise<{ ok: true } | { error: string }> {
  const requested = String(role);
  if (!CLAIMABLE.has(requested) || requested === "admin" || requested === "super_admin") {
    return { error: "That role cannot be self-provisioned." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin.from("user_roles").upsert(
    { user_id: user.id, role, is_active: true },
    { onConflict: "user_id,role" },
  );
  if (error) return { error: error.message };
  return { ok: true };
}
