"use server";

import { revalidatePath } from "next/cache";
import { getAdminDB } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/security";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { CLAIMABLE_USER_ROLES, isPrivilegedUserRole } from "@/lib/auth/provision-nonprivileged-role";
import {
  getBrokenTwoFactorState,
  repairBrokenTwoFactorState,
} from "@/lib/auth/repair-broken-2fa";
import { getPublicAppUrl } from "@/lib/app-url";
import { writeAuditEvent } from "@/services/ops/audit";
import {
  type AccountStatus,
  isDeletedAccountEmail,
  tombstoneEmailFor,
} from "@/lib/users/account-status";

export type { AccountStatus } from "@/lib/users/account-status";

export type AdminUserEditInput = {
  full_name: string;
  username: string;
  phone: string;
  bio: string;
  website: string;
  city: string;
  country: string;
  is_verified: boolean;
};

async function assertAdminAccess() {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return { ok: true as const, adminId: auth.user.id };
}

async function userHasAdminRole(userId: string) {
  const admin = getAdminDB();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();
  return !!data;
}

async function applyRoleSideEffects(
  userId: string,
  status: AccountStatus,
  reason: string,
) {
  const admin = getAdminDB();
  const inactive = status !== "active";

  const [{ data: vendor }, { data: influencer }, { data: affiliate }] =
    await Promise.all([
      admin.from("vendors").select("id").eq("user_id", userId).maybeSingle(),
      admin.from("influencers").select("id").eq("user_id", userId).maybeSingle(),
      admin.from("affiliates").select("id").eq("user_id", userId).maybeSingle(),
    ]);

  if (vendor?.id && inactive) {
    await admin
      .from("vendors")
      .update({
        verification_status: status === "banned" ? "suspended" : "suspended",
        is_active: false,
        verification_notes: reason,
      } as Record<string, unknown>)
      .eq("id", vendor.id);
  } else if (vendor?.id && !inactive) {
    await admin
      .from("vendors")
      .update({ is_active: true, verification_notes: null } as Record<string, unknown>)
      .eq("id", vendor.id);
  }

  if (influencer?.id) {
    await admin
      .from("influencers")
      .update({ is_active: !inactive, is_verified: inactive ? false : undefined })
      .eq("id", influencer.id);
  }

  if (affiliate?.id) {
    await admin.from("affiliates").update({ is_active: !inactive }).eq("id", affiliate.id);
  }

  if (inactive) {
    await admin
      .from("user_roles")
      .update({ is_active: false })
      .eq("user_id", userId)
      .neq("role", "admin");
  }
}

export async function updateAdminManagedUser(
  userId: string,
  input: AdminUserEditInput,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.full_name.trim()) {
    return { success: false, error: "Full name is required." };
  }

  if (input.username.trim() && !/^[a-z0-9_]{3,30}$/.test(input.username.trim())) {
    return {
      success: false,
      error: "Username must be 3–30 characters: lowercase letters, numbers, underscores.",
    };
  }

  const admin = getAdminDB();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      username: input.username.trim() || null,
      phone: input.phone.trim() || null,
      bio: input.bio.trim() || null,
      website: input.website.trim() || null,
      city: input.city.trim() || null,
      country: input.country.trim() || null,
      is_verified: input.is_verified,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function setUserAccountStatus(
  userId: string,
  status: AccountStatus,
  reason: string,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (userId === auth.adminId) {
    return { success: false, error: "You cannot moderate your own account." };
  }

  const isTargetAdmin = await userHasAdminRole(userId);
  if (isTargetAdmin) {
    return { success: false, error: "Platform admin accounts cannot be suspended or banned here." };
  }

  if (!reason.trim() && status !== "active") {
    return { success: false, error: "A reason is required for moderation actions." };
  }

  const admin = getAdminDB();
  const trimmedReason = reason.trim();
  const now = new Date().toISOString();

  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authUser?.user) {
    return { success: false, error: authErr?.message ?? "User not found in auth." };
  }

  const existingMeta = (authUser.user.user_metadata ?? {}) as Record<string, unknown>;

  if (existingMeta.account_status === "deleted") {
    return { success: false, error: "Deleted accounts cannot be modified. View them under Deleted (backup) in admin users." };
  }

  if (status === "active") {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
      user_metadata: {
        ...existingMeta,
        account_status: "active",
        moderation_reason: null,
        moderated_by: null,
        moderated_at: null,
      },
    });
    await admin
      .from("profiles")
      .update({ is_active: true, updated_at: now })
      .eq("id", userId);
    await applyRoleSideEffects(userId, "active", trimmedReason);
  } else {
    const metadata = {
      ...existingMeta,
      account_status: status,
      moderation_reason: trimmedReason,
      moderated_by: auth.adminId,
      moderated_at: now,
    };

    if (status === "banned") {
      await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
        user_metadata: metadata,
      });
    } else {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: metadata,
      });
    }

    await admin
      .from("profiles")
      .update({ is_active: false, updated_at: now })
      .eq("id", userId);
    await applyRoleSideEffects(userId, status, trimmedReason);
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/verifications");
  return { success: true };
}

export async function toggleManagedUserRole(
  userId: string,
  role: string,
  active: boolean,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (role === "admin" || isPrivilegedUserRole(role)) {
    return { success: false, error: "Admin role cannot be changed from this panel." };
  }

  const allowed = new Set<string>(["buyer", ...CLAIMABLE_USER_ROLES]);
  if (!allowed.has(role)) {
    return { success: false, error: "That role cannot be assigned from this panel." };
  }

  const admin = getAdminDB();
  const { error } = await admin.from("user_roles").upsert(
    {
      user_id: userId,
      role: role as "buyer" | "vendor" | "affiliate" | "influencer" | "community_owner",
      is_active: active,
      activated_at: active ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,role" },
  );

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function deleteManagedUser(
  userId: string,
  reason: string,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (userId === auth.adminId) {
    return { success: false, error: "You cannot delete your own account." };
  }

  if (await userHasAdminRole(userId)) {
    return { success: false, error: "Platform admin accounts cannot be deleted." };
  }

  if (!reason.trim()) {
    return { success: false, error: "A reason is required to delete a user." };
  }

  const admin = getAdminDB();
  const trimmedReason = reason.trim();
  const now = new Date().toISOString();

  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authUser?.user) {
    return { success: false, error: authErr?.message ?? "User not found in auth." };
  }

  const existingMeta = (authUser.user.user_metadata ?? {}) as Record<string, unknown>;
  if (existingMeta.account_status === "deleted") {
    return { success: false, error: "This account is already deleted." };
  }

  const originalEmail = authUser.user.email ?? "";
  const { data: profileRow } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const tombstoneEmail = tombstoneEmailFor(userId);
  const metadata = {
    ...existingMeta,
    account_status: "deleted" as const,
    moderation_reason: `Account deleted: ${trimmedReason}`,
    moderated_by: auth.adminId,
    moderated_at: now,
    deleted_at: now,
    deleted_by: auth.adminId,
    backup_email: originalEmail,
    backup_full_name: profileRow?.full_name ?? null,
  };

  const { error: authUpdateErr } = await admin.auth.admin.updateUserById(userId, {
    email: tombstoneEmail,
    ban_duration: "876000h",
    user_metadata: metadata,
  });
  if (authUpdateErr) {
    return { success: false, error: authUpdateErr.message };
  }

  try {
    await admin.auth.admin.signOut(userId, "global");
  } catch {
    // Session revocation is best-effort; ban still blocks new sign-ins.
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      email: tombstoneEmail,
      full_name: "Deleted account",
      username: null,
      avatar_url: null,
      bio: null,
      website: null,
      phone: null,
      is_active: false,
      updated_at: now,
    })
    .eq("id", userId);

  if (profileErr) return { success: false, error: profileErr.message };

  await applyRoleSideEffects(userId, "banned", trimmedReason);

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/verifications");
  return { success: true };
}

export async function repairManagedUserBrokenMfa(
  userId: string,
  reason: string,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!reason.trim()) {
    return { success: false, error: "A reason is required to repair broken 2FA." };
  }

  const admin = getAdminDB();
  const state = await getBrokenTwoFactorState(admin, userId);
  if (!state.broken) {
    return { success: false, error: "This account does not have broken 2FA enrollment." };
  }

  await repairBrokenTwoFactorState(userId, admin);

  await writeAuditEvent({
    actorId: auth.adminId,
    action: "admin.user.mfa_repair_broken",
    entityType: "user",
    entityId: userId,
    metadata: { reason: reason.trim() },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function clearManagedUserMfa(
  userId: string,
  reason: string,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!reason.trim()) {
    return { success: false, error: "A reason is required to clear 2FA." };
  }

  const admin = getAdminDB();
  const now = new Date().toISOString();

  const { error: profileError } = await admin
    .from("profiles")
    .update({ two_factor_enabled: false, updated_at: now })
    .eq("id", userId);

  if (profileError) return { success: false, error: profileError.message };

  const { error: deleteError } = await admin
    .from("user_2fa_secrets")
    .delete()
    .eq("user_id", userId);

  if (deleteError) return { success: false, error: deleteError.message };

  await writeAuditEvent({
    actorId: auth.adminId,
    action: "admin.user.mfa_clear",
    entityType: "user",
    entityId: userId,
    metadata: { reason: reason.trim() },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function sendManagedUserPasswordReset(userId: string): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = getAdminDB();
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authUser?.user?.email) {
    return { success: false, error: authErr?.message ?? "User email not found." };
  }

  const email = authUser.user.email;
  if (isDeletedAccountEmail(email)) {
    return { success: false, error: "Deleted accounts cannot receive password resets." };
  }

  const redirectTo = `${getPublicAppUrl()}/auth/callback?next=/settings/security`;
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { success: false, error: error.message };

  await writeAuditEvent({
    actorId: auth.adminId,
    action: "admin.user.password_reset_email",
    entityType: "user",
    entityId: userId,
    metadata: { email_domain: email.split("@")[1] ?? null },
  });

  return { success: true };
}

export async function revokeManagedUserSessions(
  userId: string,
  reason: string,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (userId === auth.adminId) {
    return { success: false, error: "You cannot revoke your own active session from here." };
  }

  if (!reason.trim()) {
    return { success: false, error: "A reason is required to revoke sessions." };
  }

  const admin = getAdminDB();
  try {
    await admin.auth.admin.signOut(userId, "global");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke sessions.";
    return { success: false, error: message };
  }

  await writeAuditEvent({
    actorId: auth.adminId,
    action: "admin.user.sessions_revoke",
    entityType: "user",
    entityId: userId,
    metadata: { reason: reason.trim() },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}
