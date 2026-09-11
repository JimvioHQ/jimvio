import type { SupabaseClient } from "@supabase/supabase-js";

export type Plan = "free" | "pro" | "business" | "enterprise";

const DEFAULTS: Record<
  Plan,
  {
    max_stores: number;
    max_products: number;
    max_orders_per_month: number;
    max_api_calls_per_day: number;
  }
> = {
  free: { max_stores: 1, max_products: 50, max_orders_per_month: 100, max_api_calls_per_day: 1000 },
  pro: { max_stores: 3, max_products: 500, max_orders_per_month: 2000, max_api_calls_per_day: 20000 },
  business: {
    max_stores: 10,
    max_products: 5000,
    max_orders_per_month: 20000,
    max_api_calls_per_day: 100000,
  },
  enterprise: {
    max_stores: 100,
    max_products: 100000,
    max_orders_per_month: 1000000,
    max_api_calls_per_day: 1000000,
  },
};

export async function getOrCreateEntitlements(db: SupabaseClient, vendorId: string) {
  const { data } = await db
    .from("ds_entitlements")
    .select("*")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (data) return data;

  const defaults = DEFAULTS.free;
  const { data: created } = await db
    .from("ds_entitlements")
    .insert({
      vendor_id: vendorId,
      plan: "free",
      ...defaults,
    })
    .select("*")
    .single();
  return created;
}

export async function assertCanConnectStore(
  db: SupabaseClient,
  vendorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ent = await getOrCreateEntitlements(db, vendorId);
  const { count } = await db
    .from("merchant_stores")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId)
    .neq("status", "disconnected");

  if ((count ?? 0) >= (ent?.max_stores ?? 1)) {
    return {
      ok: false,
      error: `Your ${ent?.plan ?? "free"} plan allows ${ent?.max_stores ?? 1} connected store(s). Upgrade to add more.`,
    };
  }
  return { ok: true };
}
