/**
 * Affiliate campaign CRUD + analytics helpers.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { DEFAULT_ATTRIBUTION_WINDOW_DAYS, type AttributionModel } from "@/lib/affiliate/attribution";

function db() {
  return createServiceRoleClient() as any;
}

function trackingCode(): string {
  return `CMP-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export type CampaignStatus = "draft" | "active" | "paused" | "archived";

export async function createAffiliateCampaign(input: {
  createdBy: string;
  vendorId?: string | null;
  name: string;
  description?: string | null;
  commissionRate?: number;
  budgetAmount?: number | null;
  currency?: string;
  productId?: string | null;
  communityId?: string | null;
  attributionModel?: AttributionModel;
  attributionWindowDays?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const { data, error } = await db()
    .from("affiliate_campaigns")
    .insert({
      created_by: input.createdBy,
      vendor_id: input.vendorId ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      tracking_code: trackingCode(),
      status: "draft",
      commission_rate: input.commissionRate ?? 10,
      budget_amount: input.budgetAmount ?? null,
      currency: (input.currency ?? "USD").toUpperCase(),
      product_id: input.productId ?? null,
      community_id: input.communityId ?? null,
      attribution_model: input.attributionModel ?? "last_touch",
      attribution_window_days:
        input.attributionWindowDays ?? DEFAULT_ATTRIBUTION_WINDOW_DAYS,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setCampaignStatus(
  campaignId: string,
  userId: string,
  status: CampaignStatus
) {
  const client = db();
  const { data: existing } = await client
    .from("affiliate_campaigns")
    .select("id, created_by, status")
    .eq("id", campaignId)
    .maybeSingle();
  if (!existing || existing.created_by !== userId) {
    throw new Error("Campaign not found");
  }

  const allowed: Record<string, CampaignStatus[]> = {
    draft: ["active", "archived"],
    active: ["paused", "archived"],
    paused: ["active", "archived"],
    archived: [],
  };
  if (!allowed[existing.status]?.includes(status)) {
    throw new Error(`Cannot transition from ${existing.status} to ${status}`);
  }

  const { data, error } = await client
    .from("affiliate_campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .select("*")
    .single();
  if (error) throw error;

  try {
    const { notifyCampaignUpdate } = await import("@/lib/notifications/publishers");
    await notifyCampaignUpdate({
      userId,
      campaignId,
      campaignName: data.name ?? "Campaign",
      status,
    });
  } catch (err) {
    console.warn("[setCampaignStatus] notification skipped:", err);
  }

  return data;
}

export async function listCampaignsForUser(userId: string) {
  const { data } = await db()
    .from("affiliate_campaigns")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getCampaignAnalytics(campaignId: string) {
  const client = db();
  const { data: campaign } = await client
    .from("affiliate_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) throw new Error("Campaign not found");

  const [{ count: clicks }, { data: commissions }] = await Promise.all([
    client
      .from("affiliate_clicks")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId),
    client
      .from("affiliate_commissions")
      .select("commission_amount, order_amount, lifecycle_status")
      .eq("campaign_id", campaignId),
  ]);

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

  return {
    campaign,
    clicks: clickCount,
    conversions,
    revenue,
    commission,
    ctr,
    epc,
    budgetAmount: campaign.budget_amount != null ? Number(campaign.budget_amount) : null,
    budgetSpent: Number(campaign.budget_spent ?? 0),
  };
}

export async function createAffiliateLink(input: {
  affiliateId: string;
  productId?: string | null;
  vendorId?: string | null;
  campaignId?: string | null;
  destinationUrl: string;
  commissionRate?: number | null;
}) {
  const client = db();

  // Idempotent pick: reuse active link for same affiliate + product.
  if (input.productId) {
    const existing = await findActiveProductLink(client, input.affiliateId, input.productId);
    if (existing?.link_code) {
      return refreshAffiliateLinkIfNeeded(client, existing, input);
    }
  }

  const linkCode = `LNK-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const fullUrl = input.destinationUrl.includes("?")
    ? `${input.destinationUrl}&ref=${linkCode}`
    : `${input.destinationUrl}?ref=${linkCode}`;

  const { data, error } = await client
    .from("affiliate_links")
    .insert({
      affiliate_id: input.affiliateId,
      product_id: input.productId ?? null,
      vendor_id: input.vendorId ?? null,
      campaign_id: input.campaignId ?? null,
      link_code: linkCode,
      destination_url: input.destinationUrl,
      full_url: fullUrl,
      commission_rate: input.commissionRate ?? null,
      is_active: true,
    })
    .select("*")
    .single();

  // Concurrent pick: unique index race → return the winner.
  if (error && input.productId && isUniqueViolation(error)) {
    const raced = await findActiveProductLink(client, input.affiliateId, input.productId);
    if (raced) return refreshAffiliateLinkIfNeeded(client, raced, input);
  }
  if (error) throw error;
  return data;
}

async function findActiveProductLink(
  client: any,
  affiliateId: string,
  productId: string,
) {
  const { data } = await client
    .from("affiliate_links")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

async function refreshAffiliateLinkIfNeeded(
  client: any,
  existing: any,
  input: {
    destinationUrl: string;
    commissionRate?: number | null;
    vendorId?: string | null;
  },
) {
  const needsRefresh =
    existing.destination_url !== input.destinationUrl ||
    (input.commissionRate != null &&
      Number(existing.commission_rate ?? NaN) !== Number(input.commissionRate));
  if (!needsRefresh) return existing;

  const fullUrl = input.destinationUrl.includes("?")
    ? `${input.destinationUrl}&ref=${existing.link_code}`
    : `${input.destinationUrl}?ref=${existing.link_code}`;
  const { data: updated, error: updateError } = await client
    .from("affiliate_links")
    .update({
      destination_url: input.destinationUrl,
      full_url: fullUrl,
      commission_rate: input.commissionRate ?? existing.commission_rate,
      vendor_id: input.vendorId ?? existing.vendor_id,
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (!updateError && updated) return updated;
  return existing;
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return (
    e?.code === "23505" ||
    /duplicate key|unique constraint/i.test(String(e?.message ?? ""))
  );
}
