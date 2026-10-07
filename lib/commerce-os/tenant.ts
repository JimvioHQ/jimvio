import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureSellerVendor } from "@/lib/actions/seller-products";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getOrCreateEntitlements } from "@/lib/dropshipping/entitlements/plans";
import { cosTable } from "./db";

export function cosAdminDb() {
  return createServiceRoleClient();
}

export async function requireCommerceMerchant(): Promise<
  | { ok: true; userId: string; vendorId: string }
  | { ok: false; status: 401 | 403; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Authentication required." };
  const vendor = await ensureSellerVendor(user.id);
  if (!vendor?.id) {
    return { ok: false, status: 403, error: "Seller account required for Commerce OS." };
  }
  return { ok: true, userId: user.id, vendorId: vendor.id };
}

export function slugifyHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Platform routes / hosts that must never be merchant store handles. */
export const RESERVED_STORE_HANDLES = new Set([
  "www",
  "api",
  "app",
  "admin",
  "commerce",
  "marketplace",
  "communities",
  "community",
  "affiliates",
  "affiliate",
  "login",
  "register",
  "signup",
  "signin",
  "checkout",
  "account",
  "products",
  "orders",
  "cart",
  "wallet",
  "help",
  "support",
  "status",
  "docs",
  "cdn",
  "static",
  "assets",
  "mail",
  "email",
  "auth",
  "verify",
  "billing",
  "seller",
  "vendor",
  "store",
  "stores",
  "ugc",
  "live",
  "jimvio",
]);

export function isReservedStoreHandle(handle: string): boolean {
  return RESERVED_STORE_HANDLES.has(handle.trim().toLowerCase());
}

export async function assertCanCreateJimvioStore(
  db: SupabaseClient,
  vendorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ent = await getOrCreateEntitlements(db, vendorId);
  const { count } = await cosTable(db, "jimvio_stores")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId)
    .neq("status", "archived");

  // Native stores share entitlement pool with dropshipping external stores conceptually
  const max = Math.max(1, Number(ent?.max_stores ?? 1));
  if ((count ?? 0) >= max) {
    return {
      ok: false,
      error: `Your ${ent?.plan ?? "free"} plan allows ${max} Jimvio store(s). Upgrade to add more.`,
    };
  }
  return { ok: true };
}

export async function assertStoreOwnedByVendor(
  db: SupabaseClient,
  storeId: string,
  vendorId: string
): Promise<boolean> {
  const { data } = await cosTable(db, "jimvio_stores")
    .select("id")
    .eq("id", storeId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  return Boolean(data?.id);
}
