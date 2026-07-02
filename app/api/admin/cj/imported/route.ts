import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const admin = createAdminClient();

  const { data: mapRows, error: mapError } = await admin
    .from("cj_product_map")
    .select("cj_pid, product_id");

  if (mapError) {
    return NextResponse.json({ error: mapError.message }, { status: 500 });
  }

  const productIds = (mapRows ?? [])
    .map((r) => r.product_id)
    .filter(Boolean) as string[];

  const { data: products } = productIds.length
    ? await admin
        .from("products")
        .select("id, name, source_metadata")
        .in("id", productIds)
    : { data: [] };

  const productById = new Map(
    (products ?? []).map((p) => [
      p.id,
      {
        name: p.name as string,
        sku: (p.source_metadata as { cj_sku?: string } | null)?.cj_sku,
      },
    ])
  );

  const map: Record<
    string,
    { productId: string; name?: string; sku?: string }
  > = {};

  for (const row of mapRows ?? []) {
    if (!row.cj_pid || !row.product_id) continue;
    const info = productById.get(row.product_id);
    map[row.cj_pid] = {
      productId: row.product_id,
      name: info?.name,
      sku: info?.sku,
    };
  }

  // SKU index for duplicate detection
  const skuIndex: Record<string, string> = {};
  for (const [pid, info] of Object.entries(map)) {
    if (info.sku) skuIndex[info.sku.toLowerCase()] = pid;
  }

  return NextResponse.json({ map, skuIndex });
}
