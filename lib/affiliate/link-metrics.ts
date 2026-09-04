/**
 * Canonical per-link affiliate metrics from event tables.
 * Prefer live aggregates over denormalized counters when available.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type LinkMetric = {
  clicks: number;
  conversions: number;
  earnings: number;
};

function db() {
  return createServiceRoleClient() as any;
}

const QUALIFYING = new Set(["pending", "approved", "partial_refund"]);

/**
 * Aggregate clicks / conversions / earnings for many links in few queries.
 * Also backfills conversions for commissions that lost link_id but match product.
 */
export async function getLinkMetricsMap(
  linkIds: string[],
  opts?: {
    affiliateId?: string;
    productByLinkId?: Record<string, string | null | undefined>;
  }
): Promise<Map<string, LinkMetric>> {
  const map = new Map<string, LinkMetric>();
  for (const id of linkIds) {
    map.set(id, { clicks: 0, conversions: 0, earnings: 0 });
  }
  if (linkIds.length === 0) return map;

  const client = db();
  const [{ data: clickRows }, { data: commissionRows }] = await Promise.all([
    client
      .from("affiliate_clicks")
      .select("link_id")
      .in("link_id", linkIds)
      .limit(20000),
    client
      .from("affiliate_commissions")
      .select("link_id, product_id, commission_amount, lifecycle_status")
      .in("link_id", linkIds)
      .limit(10000),
  ]);

  for (const row of clickRows ?? []) {
    const id = row.link_id as string | null;
    if (!id || !map.has(id)) continue;
    map.get(id)!.clicks += 1;
  }

  for (const row of commissionRows ?? []) {
    const id = row.link_id as string | null;
    if (!id || !map.has(id)) continue;
    if (!QUALIFYING.has(String(row.lifecycle_status ?? ""))) continue;
    const cur = map.get(id)!;
    cur.conversions += 1;
    cur.earnings += Number(row.commission_amount ?? 0);
  }

  // Historical commissions created without link_id — attribute by product match.
  const productByLink = opts?.productByLinkId ?? {};
  const productIds = [
    ...new Set(
      Object.values(productByLink).filter((v): v is string => Boolean(v))
    ),
  ];
  if (opts?.affiliateId && productIds.length) {
    const { data: orphanCommissions } = await client
      .from("affiliate_commissions")
      .select("product_id, commission_amount, lifecycle_status, link_id")
      .eq("affiliate_id", opts.affiliateId)
      .in("product_id", productIds)
      .is("link_id", null)
      .limit(5000);

    const productToLinks = new Map<string, string[]>();
    for (const [linkId, productId] of Object.entries(productByLink)) {
      if (!productId || !map.has(linkId)) continue;
      const list = productToLinks.get(productId) ?? [];
      list.push(linkId);
      productToLinks.set(productId, list);
    }

    for (const row of orphanCommissions ?? []) {
      if (!QUALIFYING.has(String(row.lifecycle_status ?? ""))) continue;
      const productId = row.product_id as string | null;
      if (!productId) continue;
      const targets = productToLinks.get(productId);
      if (!targets?.length) continue;
      const target = targets[0];
      const cur = map.get(target)!;
      cur.conversions += 1;
      cur.earnings += Number(row.commission_amount ?? 0);
    }
  }

  for (const [id, m] of map) {
    map.set(id, {
      clicks: m.clicks,
      conversions: m.conversions,
      earnings: Math.round(m.earnings * 100) / 100,
    });
  }

  return map;
}

/** Merge live aggregates with denormalized fallbacks (max of both). */
export function mergeLinkMetrics(
  live: LinkMetric | undefined,
  denormalized: Partial<LinkMetric>
): LinkMetric {
  const clicks = Math.max(live?.clicks ?? 0, Number(denormalized.clicks ?? 0));
  const conversions = Math.max(
    live?.conversions ?? 0,
    Number(denormalized.conversions ?? 0)
  );
  const earnings = Math.max(
    live?.earnings ?? 0,
    Number(denormalized.earnings ?? 0)
  );
  return {
    clicks,
    conversions,
    earnings: Math.round(earnings * 100) / 100,
  };
}
