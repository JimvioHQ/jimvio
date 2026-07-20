import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RevenueRow = { source: string; amount: number; currency: string; created_at: string };
function db() { return createServiceRoleClient(); }
const sum = (rows: RevenueRow[]) => rows.reduce((value, row) => value + row.amount, 0);

export async function getCreatorRevenue(userId: string, days = 30) {
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000).toISOString();
  const client = db();
  const { data: communities } = await client.from("communities").select("id").eq("owner_id", userId);
  const { data: vendor } = await client.from("vendors").select("id").eq("user_id", userId).maybeSingle();
  const { data: affiliate } = await client.from("affiliates").select("id").eq("user_id", userId).maybeSingle();
  const communityIds = (communities ?? []).map((c) => c.id);
  const [membershipResult, salesResult, affiliateResult, influencerResult] = await Promise.all([
    communityIds.length ? client.from("community_payments").select("creator_earnings, amount, currency, created_at").in("community_id", communityIds).eq("status", "completed").gte("created_at", since) : Promise.resolve({ data: [] }),
    vendor ? client.from("order_items").select("total_price, created_at, orders!inner(payment_status, currency)").eq("vendor_id", vendor.id).eq("orders.payment_status", "paid").gte("created_at", since) : Promise.resolve({ data: [] }),
    affiliate ? client.from("affiliate_commissions").select("commission_amount, created_at, orders!inner(currency)").eq("affiliate_id", affiliate.id).gte("created_at", since) : Promise.resolve({ data: [] }),
    client.from("influencers").select("id").eq("user_id", userId).maybeSingle().then(async ({ data }) => data ? client.from("short_video_earnings").select("amount, currency, created_at").eq("creator_id", data.id).gte("created_at", since) : { data: [] }),
  ]);
  const membership = (membershipResult.data ?? []).map((r) => ({ source: "membership", amount: Number(r.creator_earnings ?? r.amount), currency: r.currency ?? "USD", created_at: r.created_at }));
  const marketplace = (salesResult.data ?? []).map((r) => ({ source: "marketplace", amount: Number(r.total_price), currency: (r.orders as unknown as { currency?: string })?.currency ?? "USD", created_at: r.created_at }));
  const affiliateRevenue = (affiliateResult.data ?? []).map((r) => ({ source: "affiliate", amount: Number(r.commission_amount), currency: (r.orders as unknown as { currency?: string })?.currency ?? "USD", created_at: r.created_at }));
  const live = (influencerResult.data ?? []).map((r) => ({ source: "live", amount: Number(r.amount), currency: r.currency ?? "USD", created_at: r.created_at }));
  const rows = [...membership, ...marketplace, ...affiliateRevenue, ...live] as RevenueRow[];
  const series = new Map<string, number>();
  rows.forEach((row) => { const day = row.created_at.slice(0, 10); series.set(day, (series.get(day) ?? 0) + row.amount); });
  return { total: sum(rows), sources: { membership: sum(membership), marketplace: sum(marketplace), affiliate: sum(affiliateRevenue), live: sum(live), liveNote: "Short-video earnings are used as the available live-related earnings source." }, series: [...series.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })), rows };
}

export function revenueCsv(report: Awaited<ReturnType<typeof getCreatorRevenue>>) {
  return ["source,amount,currency,created_at", ...report.rows.map((r) => [r.source, r.amount, r.currency, r.created_at].map((v) => JSON.stringify(v)).join(","))].join("\n");
}
