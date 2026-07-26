/**
 * Affiliate analytics — clicks, CTR, conversions, revenue, commission, EPC.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";

function db() {
  return createServiceRoleClient() as any;
}

export async function getAffiliateAnalytics(affiliateId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const client = db();

  const [
    { data: affiliate },
    { count: clicks },
    { data: commissions },
    { data: campaigns },
  ] = await Promise.all([
    client
      .from("affiliates")
      .select(
        "total_clicks, total_conversions, total_earnings, available_balance, pending_earnings, paid_earnings, conversion_rate, tier"
      )
      .eq("id", affiliateId)
      .maybeSingle(),
    client
      .from("affiliate_clicks")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliateId)
      .gte("created_at", since),
    client
      .from("affiliate_commissions")
      .select("commission_amount, order_amount, lifecycle_status, campaign_id, created_at")
      .eq("affiliate_id", affiliateId)
      .gte("created_at", since),
    client
      .from("affiliate_campaigns")
      .select("id, name, tracking_code, status, budget_spent, budget_amount")
      .in(
        "id",
        // filled after commissions; placeholder query avoided — fetch top by spend below
        []
      ),
  ]);

  void campaigns;

  const rows = commissions ?? [];
  const conversions = rows.filter((r: any) =>
    ["pending", "approved", "partial_refund"].includes(r.lifecycle_status)
  ).length;
  const revenue = rows.reduce((s: number, r: any) => s + Number(r.order_amount ?? 0), 0);
  const commission = rows.reduce(
    (s: number, r: any) => s + Number(r.commission_amount ?? 0),
    0
  );
  const clickCount = clicks ?? 0;
  const ctr = clickCount > 0 ? Number(((conversions / clickCount) * 100).toFixed(2)) : 0;
  const epc = clickCount > 0 ? Number((commission / clickCount).toFixed(4)) : 0;

  // Top campaigns by commission in window
  const byCampaign = new Map<string, { commission: number; conversions: number }>();
  for (const r of rows) {
    if (!r.campaign_id) continue;
    const cur = byCampaign.get(r.campaign_id) ?? { commission: 0, conversions: 0 };
    cur.commission += Number(r.commission_amount ?? 0);
    cur.conversions += 1;
    byCampaign.set(r.campaign_id, cur);
  }
  const campaignIds = [...byCampaign.keys()].slice(0, 10);
  let topCampaigns: Array<{
    id: string;
    name: string;
    tracking_code: string;
    status: string;
    commission: number;
    conversions: number;
  }> = [];
  if (campaignIds.length) {
    const { data: campRows } = await client
      .from("affiliate_campaigns")
      .select("id, name, tracking_code, status")
      .in("id", campaignIds);
    topCampaigns = (campRows ?? [])
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        tracking_code: c.tracking_code,
        status: c.status,
        commission: byCampaign.get(c.id)?.commission ?? 0,
        conversions: byCampaign.get(c.id)?.conversions ?? 0,
      }))
      .sort((a: any, b: any) => b.commission - a.commission);
  }

  return {
    windowDays: days,
    affiliate,
    clicks: clickCount,
    conversions,
    revenue,
    commission,
    ctr,
    epc,
    topCampaigns,
    balances: {
      pending: Number(affiliate?.pending_earnings ?? 0),
      available: Number(affiliate?.available_balance ?? 0),
      paid: Number(affiliate?.paid_earnings ?? 0),
      total: Number(affiliate?.total_earnings ?? 0),
    },
  };
}
