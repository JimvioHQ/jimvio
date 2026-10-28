/**
 * Affiliate dashboard + analytics aggregates for creator workspace surfaces.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAffiliateAnalytics } from "@/lib/affiliate/analytics";
import { getAffiliateBalances, getAffiliateLedger } from "@/lib/affiliate/commissions";
import {
  getLinkMetricsMap,
  mergeLinkMetrics,
} from "@/lib/affiliate/link-metrics";

function db() {
  return createServiceRoleClient() as any;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function emptySeries(days: number) {
  const out: Array<{ date: string; clicks: number; conversions: number; revenue: number; commission: number }> =
    [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      clicks: 0,
      conversions: 0,
      revenue: 0,
      commission: 0,
    });
  }
  return out;
}

export async function getAffiliateDashboardBundle(affiliateId: string, days = 30) {
  const client = db();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const [
    analytics,
    balances,
    ledger,
    { data: clickRows },
    { data: commissionRows },
    { data: links },
    { count: todayClicks },
    { data: todayCommissions },
  ] = await Promise.all([
    getAffiliateAnalytics(affiliateId, days),
    getAffiliateBalances(affiliateId),
    getAffiliateLedger(affiliateId, 30),
    client
      .from("affiliate_clicks")
      .select("id, created_at, country, device_type, referrer, converted, link_id")
      .eq("affiliate_id", affiliateId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000),
    client
      .from("affiliate_commissions")
      .select(
        "id, commission_amount, order_amount, lifecycle_status, product_id, created_at, link_id"
      )
      .eq("affiliate_id", affiliateId)
      .gte("created_at", since)
      .limit(2000),
    client
      .from("affiliate_links")
      .select(
        "id, link_code, custom_slug, destination_url, full_url, commission_rate, total_clicks, total_conversions, total_earnings, is_active, expires_at, created_at, product_id, products(id, name, slug, images, currency)"
      )
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("affiliate_clicks")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliateId)
      .gte("created_at", todayIso),
    client
      .from("affiliate_commissions")
      .select("commission_amount, lifecycle_status, order_amount")
      .eq("affiliate_id", affiliateId)
      .gte("created_at", todayIso),
  ]);

  const seriesMap = new Map(emptySeries(days).map((r) => [r.date, { ...r }]));
  const countries = new Map<string, number>();
  const platforms = new Map<string, number>();
  const sources = new Map<string, number>();

  for (const row of clickRows ?? []) {
    const key = dayKey(String(row.created_at));
    const bucket = seriesMap.get(key);
    if (bucket) bucket.clicks += 1;
    const country = (row.country || "Unknown").trim() || "Unknown";
    countries.set(country, (countries.get(country) ?? 0) + 1);
    const platform = (row.device_type || "unknown").toLowerCase();
    platforms.set(platform, (platforms.get(platform) ?? 0) + 1);
    let source = "Direct";
    const ref = String(row.referrer ?? "");
    if (ref) {
      try {
        const host = new URL(ref).hostname.replace(/^www\./, "");
        source = host || "Referral";
      } catch {
        source = "Referral";
      }
    }
    sources.set(source, (sources.get(source) ?? 0) + 1);
  }

  const productAgg = new Map<
    string,
    { productId: string; conversions: number; revenue: number; commission: number }
  >();

  for (const row of commissionRows ?? []) {
    const key = dayKey(String(row.created_at));
    const bucket = seriesMap.get(key);
    const amount = Number(row.commission_amount ?? 0);
    const revenue = Number(row.order_amount ?? 0);
    if (bucket) {
      bucket.conversions += 1;
      bucket.commission += amount;
      bucket.revenue += revenue;
    }
    if (row.product_id) {
      const cur = productAgg.get(row.product_id) ?? {
        productId: row.product_id,
        conversions: 0,
        revenue: 0,
        commission: 0,
      };
      cur.conversions += 1;
      cur.revenue += revenue;
      cur.commission += amount;
      productAgg.set(row.product_id, cur);
    }
  }

  const topProductIds = [...productAgg.values()]
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 8)
    .map((p) => p.productId);

  let topProducts: Array<{
    id: string;
    name: string;
    slug: string | null;
    image: string | null;
    conversions: number;
    revenue: number;
    commission: number;
  }> = [];

  if (topProductIds.length) {
    const { data: products } = await client
      .from("products")
      .select("id, name, slug, images")
      .in("id", topProductIds);
    topProducts = (products ?? [])
      .map((p: any) => {
        const agg = productAgg.get(p.id)!;
        let image: string | null = null;
        const imgs = p.images;
        if (Array.isArray(imgs) && imgs.length) {
          const first = imgs[0];
          image =
            typeof first === "string"
              ? first
              : typeof first?.url === "string"
                ? first.url
                : null;
        }
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          image,
          conversions: agg.conversions,
          revenue: agg.revenue,
          commission: agg.commission,
        };
      })
      .sort((a: any, b: any) => b.commission - a.commission);
  }

  const todayConvRows = todayCommissions ?? [];
  const todayConversions = todayConvRows.filter((r: any) =>
    ["pending", "approved", "partial_refund"].includes(r.lifecycle_status)
  ).length;
  const todayCommission = todayConvRows.reduce(
    (s: number, r: any) => s + Number(r.commission_amount ?? 0),
    0
  );

  const rankMap = (m: Map<string, number>, limit = 8) =>
    [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

  const recentLinkRows = links ?? [];
  const productByLinkId: Record<string, string | null | undefined> = {};
  for (const l of recentLinkRows) {
    productByLinkId[l.id] = l.product_id;
  }
  const linkMetrics = await getLinkMetricsMap(
    recentLinkRows.map((l: any) => l.id as string),
    { affiliateId, productByLinkId }
  );

  return {
    affiliateId,
    analytics,
    balances: {
      pending: balances.pendingBalance,
      available: balances.availableBalance,
      paid: balances.paidEarnings,
      total: balances.totalEarnings,
      withdrawalEligible: balances.withdrawalEligible,
      minWithdrawal: balances.minWithdrawal,
    },
    ledger,
    today: {
      clicks: todayClicks ?? 0,
      conversions: todayConversions,
      commission: todayCommission,
      ctr:
        (todayClicks ?? 0) > 0
          ? Number(((todayConversions / (todayClicks ?? 1)) * 100).toFixed(2))
          : 0,
    },
    series: [...seriesMap.values()],
    topProducts,
    countries: rankMap(countries),
    platforms: rankMap(platforms),
    trafficSources: rankMap(sources),
    recentLinks: recentLinkRows.map((l: any) => {
      const metrics = mergeLinkMetrics(linkMetrics.get(l.id), {
        clicks: Number(l.total_clicks ?? 0),
        conversions: Number(l.total_conversions ?? 0),
        earnings: Number(l.total_earnings ?? 0),
      });
      return {
        id: l.id,
        linkCode: l.link_code,
        customSlug: l.custom_slug,
        destinationUrl: l.destination_url,
        fullUrl: l.full_url,
        commissionRate: l.commission_rate != null ? Number(l.commission_rate) : null,
        clicks: metrics.clicks,
        conversions: metrics.conversions,
        earnings: metrics.earnings,
        isActive: Boolean(l.is_active),
        expiresAt: l.expires_at,
        createdAt: l.created_at,
        product: l.products
          ? {
              id: l.products.id,
              name: l.products.name,
              slug: l.products.slug,
              currency: l.products.currency,
            }
          : null,
      };
    }),
  };
}
