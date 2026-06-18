"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/security";

export type AccountStatus = "active" | "suspended" | "banned" | "frozen";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdminRole = roles?.some((r) => r.role === "admin") ?? false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdminEmail = adminEmails.includes(user.email ?? "");

  if (!isAdminRole && !isAdminEmail) {
    return { ok: false as const, error: "Admin access required." };
  }

  return { ok: true as const, adminId: user.id };
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

  if (role === "admin") {
    return { success: false, error: "Admin role cannot be changed from this panel." };
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
    return { success: false, error: "A reason is required to remove a user." };
  }

  return setUserAccountStatus(userId, "banned", `Account removed: ${reason.trim()}`);
}
