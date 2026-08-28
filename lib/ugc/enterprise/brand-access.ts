import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isAdmin } from "@/lib/ugc/platform/auth";
import {
  requireBrandPermission,
  resolveBrandRole,
  type BrandRole,
} from "@/lib/ugc/enterprise/permissions";

type VendorRow = {
  id: string;
  user_id: string;
  business_name: string | null;
  business_logo: string | null;
  business_slug: string | null;
};

export async function listAccessibleBrandIds(
  db: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    db.from("vendors").select("id").eq("user_id", userId),
    db.from("ugc_brand_members").select("brand_id").eq("user_id", userId).eq("status", "active"),
  ]);
  const ids = new Set<string>();
  for (const row of owned ?? []) ids.add(row.id);
  for (const row of memberships ?? []) ids.add(row.brand_id);
  return [...ids];
}

type WorkspaceOk = {
  ok: true;
  db: ReturnType<typeof createServiceRoleClient>;
  vendor: VendorRow;
  brandId: string;
  role: BrandRole | null;
};

type WorkspaceErr = {
  ok: false;
  db: ReturnType<typeof createServiceRoleClient>;
  error: string;
  status: number;
};

/**
 * Resolve the brand workspace the caller may operate on.
 * Prefers an owned vendor, then an active membership. `requestedBrandId`
 * is honored only when the user is a member/owner (or admin).
 */
export async function requireBrandWorkspace(
  userId: string,
  requestedBrandId?: string | null,
): Promise<WorkspaceOk | WorkspaceErr> {
  const db = createServiceRoleClient();
  const admin = await isAdmin(userId);
  const accessible = await listAccessibleBrandIds(db, userId);

  const { data: owned } = await db
    .from("vendors")
    .select("id, user_id, business_name, business_logo, business_slug")
    .eq("user_id", userId)
    .maybeSingle();

  let brandId = requestedBrandId?.trim() || "";
  if (brandId) {
    if (!admin && !accessible.includes(brandId)) {
      return { ok: false, db, error: "Forbidden", status: 403 };
    }
  } else {
    brandId = owned?.id ?? accessible[0] ?? "";
  }

  if (!brandId) {
    return { ok: false, db, error: "Brand account required", status: 403 };
  }

  const { data: vendor } = await db
    .from("vendors")
    .select("id, user_id, business_name, business_logo, business_slug")
    .eq("id", brandId)
    .maybeSingle();

  if (!vendor) {
    return { ok: false, db, error: "Brand account required", status: 403 };
  }

  const role = admin ? ("owner" as BrandRole) : await resolveBrandRole(db, brandId, userId);
  return { ok: true, db, vendor: vendor as VendorRow, brandId, role };
}

export async function requireCampaignMember(
  userId: string,
  campaignId: string,
): Promise<
  | { ok: true; db: ReturnType<typeof createServiceRoleClient>; campaign: { id: string; brand_id: string }; role: BrandRole }
  | { ok: false; error: string; status: number }
> {
  const db = createServiceRoleClient();
  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campaign not found", status: 404 };
  if (await isAdmin(userId)) return { ok: true, db, campaign, role: "owner" };
  const role = await resolveBrandRole(db, campaign.brand_id, userId);
  if (!role) return { ok: false, error: "Forbidden", status: 403 };
  return { ok: true, db, campaign, role };
}

export async function requireCampaignPermission(
  userId: string,
  campaignId: string,
  permission: string,
): Promise<
  | { ok: true; db: ReturnType<typeof createServiceRoleClient>; campaign: { id: string; brand_id: string }; role: BrandRole }
  | { ok: false; error: string; status: number }
> {
  const db = createServiceRoleClient();
  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campaign not found", status: 404 };

  if (await isAdmin(userId)) {
    return { ok: true, db, campaign, role: "owner" };
  }

  const perm = await requireBrandPermission(db, campaign.brand_id, userId, permission);
  if (!perm.ok) return { ok: false, error: "Forbidden", status: 403 };
  return { ok: true, db, campaign, role: perm.role };
}

export async function canReadCampaign(
  db: SupabaseClient,
  userId: string | null,
  campaign: { status: string; brand_id: string },
): Promise<boolean> {
  if (campaign.status === "active") return true;
  if (!userId) return false;
  if (await isAdmin(userId)) return true;
  const role = await resolveBrandRole(db, campaign.brand_id, userId);
  return role != null;
}

export function brandIdFromRequest(req: { nextUrl: { searchParams: URLSearchParams } }) {
  return req.nextUrl.searchParams.get("brandId") ?? req.nextUrl.searchParams.get("brand_id");
}

export async function userCanAccessBrand(
  db: SupabaseClient,
  brandId: string,
  userId: string,
): Promise<boolean> {
  if (await isAdmin(userId)) return true;
  return (await resolveBrandRole(db, brandId, userId)) != null;
}

export async function requireBrandWorkspaceFromRequest(
  userId: string,
  req: { nextUrl: { searchParams: URLSearchParams } },
) {
  return requireBrandWorkspace(userId, brandIdFromRequest(req));
}

export async function requireBrandWorkspacePermission(
  userId: string,
  permission: string,
  requestedBrandId?: string | null,
): Promise<WorkspaceOk | WorkspaceErr> {
  const ws = await requireBrandWorkspace(userId, requestedBrandId);
  if (!ws.ok) return ws;
  if (await isAdmin(userId)) return ws;
  const perm = await requireBrandPermission(ws.db, ws.brandId, userId, permission);
  if (!perm.ok) return { ok: false, db: ws.db, error: "Forbidden", status: 403 };
  return { ...ws, role: perm.role };
}

/** Brand workspace when present; never 403s. For mixed creator/brand routes. */
export async function optionalBrandWorkspace(
  userId: string,
  requestedBrandId?: string | null,
): Promise<{
  db: ReturnType<typeof createServiceRoleClient>;
  vendor: VendorRow | null;
  brandId: string | null;
  role: BrandRole | null;
}> {
  const db = createServiceRoleClient();
  const accessible = await listAccessibleBrandIds(db, userId);
  const requested = requestedBrandId?.trim() || "";
  let brandId = requested;
  if (brandId && !accessible.includes(brandId) && !(await isAdmin(userId))) {
    return { db, vendor: null, brandId: null, role: null };
  }
  if (!brandId) {
    const { data: owned } = await db.from("vendors").select("id").eq("user_id", userId).maybeSingle();
    brandId = owned?.id ?? accessible[0] ?? "";
  }
  if (!brandId) return { db, vendor: null, brandId: null, role: null };
  const { data: vendor } = await db
    .from("vendors")
    .select("id, user_id, business_name, business_logo, business_slug")
    .eq("id", brandId)
    .maybeSingle();
  if (!vendor) return { db, vendor: null, brandId: null, role: null };
  const role = (await isAdmin(userId))
    ? ("owner" as BrandRole)
    : await resolveBrandRole(db, brandId, userId);
  return { db, vendor: vendor as VendorRow, brandId, role };
}
