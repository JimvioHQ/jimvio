import type { SupabaseClient } from "@supabase/supabase-js";

export type MerchantStoreSummary = {
  id: string;
  name: string;
  handle: string;
  status: string;
  logo_url: string | null;
  default_currency: string;
};

export async function listVendorJimvioStores(
  db: SupabaseClient,
  vendorId: string
): Promise<MerchantStoreSummary[]> {
  const { data } = await db
    .from("jimvio_stores")
    .select("id, name, handle, status, logo_url, default_currency")
    .eq("vendor_id", vendorId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  return (data ?? []) as MerchantStoreSummary[];
}

export function pickActiveStore(
  stores: MerchantStoreSummary[],
  storeId?: string | null
): MerchantStoreSummary | null {
  if (!stores.length) return null;
  if (storeId) {
    const match = stores.find((s) => s.id === storeId);
    if (match) return match;
  }
  return stores[0] ?? null;
}
