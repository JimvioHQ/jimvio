import type { SupabaseClient } from "@supabase/supabase-js";

export type BrandRole = "owner" | "manager" | "reviewer" | "finance" | "viewer";

const ROLE_PERMS: Record<BrandRole, Set<string>> = {
  owner: new Set([
    "campaigns.manage",
    "campaigns.review",
    "creators.invite",
    "finance.view",
    "finance.payout",
    "team.manage",
    "automations.manage",
    "webhooks.manage",
    "contracts.manage",
    "disputes.manage",
  ]),
  manager: new Set([
    "campaigns.manage",
    "campaigns.review",
    "creators.invite",
    "finance.view",
    "automations.manage",
    "contracts.manage",
    "disputes.manage",
  ]),
  reviewer: new Set(["campaigns.review", "creators.invite", "contracts.manage"]),
  finance: new Set(["finance.view", "finance.payout", "disputes.manage"]),
  viewer: new Set(["finance.view"]),
};

export function roleCan(role: BrandRole, permission: string) {
  return ROLE_PERMS[role]?.has(permission) ?? false;
}

export function memberCan(role: BrandRole | null | undefined, permission: string) {
  if (!role) return false;
  return roleCan(role, permission);
}

/** Resolve the caller's brand role. Vendor owners are treated as owner even without a membership row. */
export async function resolveBrandRole(
  db: SupabaseClient,
  brandId: string,
  userId: string,
): Promise<BrandRole | null> {
  const { data: vendor } = await db
    .from("vendors")
    .select("user_id")
    .eq("id", brandId)
    .maybeSingle();
  if (vendor?.user_id === userId) return "owner";

  const { data: member } = await db
    .from("ugc_brand_members")
    .select("role")
    .eq("brand_id", brandId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const role = member?.role as BrandRole | undefined;
  if (role && ROLE_PERMS[role]) return role;
  return null;
}

export async function requireBrandPermission(
  db: SupabaseClient,
  brandId: string,
  userId: string,
  permission: string,
): Promise<{ ok: true; role: BrandRole } | { ok: false }> {
  const role = await resolveBrandRole(db, brandId, userId);
  if (!memberCan(role, permission) || !role) return { ok: false };
  return { ok: true, role };
}

/** Filter already-accessible brand IDs down to those with a server-derived permission. */
export async function filterBrandIdsByPermission(
  db: SupabaseClient,
  userId: string,
  brandIds: string[],
  permission: string,
): Promise<string[]> {
  const allowed: string[] = [];
  for (const brandId of brandIds) {
    const role = await resolveBrandRole(db, brandId, userId);
    if (memberCan(role, permission)) allowed.push(brandId);
  }
  return allowed;
}

export function defaultPermissions(role: BrandRole) {
  return Array.from(ROLE_PERMS[role] ?? []);
}
