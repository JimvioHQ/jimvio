/**
 * Affiliate attribution engine — cookies, referral resolve, self-referral guards,
 * first/last touch, attribution window.
 */

import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  estimateAffiliateCommissionUsd,
  resolveCommissionRatePercent,
} from "@/lib/currency/platform";
import {
  normalizeProductSource,
  supportsAffiliateCommission,
  type ProductSource,
} from "@/lib/sources/product-source";

export const AFFILIATE_REF_COOKIE = "jimvio_ref";
export const AFFILIATE_REF_COOKIE_LEGACY = "_aff_ref";
/** First-touch cookie — set once, not overwritten by later visits. */
export const AFFILIATE_REF_FIRST_COOKIE = "jimvio_ref_ft";
export const AFFILIATE_REF_TS_COOKIE = "jimvio_ref_ts";

export const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30;
export const MIN_WITHDRAWAL_AMOUNT = 10;

export type AttributionModel = "first_touch" | "last_touch";

export type ResolvedReferral = {
  referralCode: string;
  affiliateId: string;
  affiliateUserId: string;
  linkId: string | null;
  campaignId: string | null;
  commissionRate: number | null;
  attributionModel: AttributionModel;
  attributionWindowDays: number;
  attributedAt: string;
  touch: AttributionModel;
};

export type LineAttribution = {
  affiliate_id: string;
  affiliate_link_id: string | null;
  affiliate_commission_rate: number;
  affiliate_commission_amount: number;
  campaign_id: string | null;
  attribution_model: AttributionModel;
};

function db() {
  return createServiceRoleClient();
}

export function attributionCookieOptions(maxAgeSeconds: number) {
  return {
    maxAge: maxAgeSeconds,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Read last-touch + first-touch codes and timestamp from cookies. */
export async function readReferralCookies(): Promise<{
  lastTouch: string | null;
  firstTouch: string | null;
  attributedAtMs: number | null;
}> {
  const jar = await cookies();
  const lastTouch =
    jar.get(AFFILIATE_REF_COOKIE)?.value?.trim() ||
    jar.get(AFFILIATE_REF_COOKIE_LEGACY)?.value?.trim() ||
    null;
  const firstTouch = jar.get(AFFILIATE_REF_FIRST_COOKIE)?.value?.trim() || null;
  const tsRaw = jar.get(AFFILIATE_REF_TS_COOKIE)?.value;
  const attributedAtMs = tsRaw && Number.isFinite(Number(tsRaw)) ? Number(tsRaw) : null;
  return { lastTouch, firstTouch, attributedAtMs };
}

/**
 * Persist referral cookies. First-touch is sticky; last-touch always updates.
 * Cross-device fallback: when a logged-in user later hits a ref link, cookies
 * still bind the session; order attribution also stores referral_code on the
 * order for post-login reconciliation.
 */
export async function setReferralCookies(code: string, windowDays = DEFAULT_ATTRIBUTION_WINDOW_DAYS) {
  const jar = await cookies();
  const maxAge = windowDays * 24 * 60 * 60;
  const opts = attributionCookieOptions(maxAge);
  const existingFt = jar.get(AFFILIATE_REF_FIRST_COOKIE)?.value;
  if (!existingFt) {
    jar.set(AFFILIATE_REF_FIRST_COOKIE, code, opts);
  }
  jar.set(AFFILIATE_REF_COOKIE, code, opts);
  jar.set(AFFILIATE_REF_COOKIE_LEGACY, code, opts);
  jar.set(AFFILIATE_REF_TS_COOKIE, String(Date.now()), opts);
}

export async function resolveReferralCode(
  code: string | null | undefined
): Promise<ResolvedReferral | null> {
  if (!code?.trim()) return null;
  const raw = code.trim();
  const client = db();

  let linkId: string | null = null;
  let affiliateId: string | null = null;
  let campaignId: string | null = null;
  let commissionRate: number | null = null;
  let attributionModel: AttributionModel = "last_touch";
  let attributionWindowDays = DEFAULT_ATTRIBUTION_WINDOW_DAYS;

  if (raw.startsWith("LNK-") || raw.startsWith("CMP-")) {
    if (raw.startsWith("LNK-")) {
      const { data: link } = await client
        .from("affiliate_links")
        .select("id, affiliate_id, campaign_id, commission_rate, is_active, expires_at")
        .eq("link_code", raw)
        .maybeSingle();
      if (!link?.is_active) return null;
      if (link.expires_at && new Date(link.expires_at) <= new Date()) return null;
      linkId = link.id;
      affiliateId = link.affiliate_id;
      campaignId = link.campaign_id;
      commissionRate = link.commission_rate != null ? Number(link.commission_rate) : null;
    }

    if (raw.startsWith("CMP-") || campaignId) {
      const tracking = raw.startsWith("CMP-") ? raw : null;
      const { data: campaign } = await client
        .from("affiliate_campaigns" as any)
        .select("id, status, commission_rate, attribution_model, attribution_window_days, tracking_code")
        .eq(tracking ? "tracking_code" : "id", tracking ?? campaignId!)
        .maybeSingle();
      if (campaign && (campaign as any).status === "active") {
        campaignId = (campaign as any).id;
        commissionRate =
          commissionRate ??
          ((campaign as any).commission_rate != null
            ? Number((campaign as any).commission_rate)
            : null);
        attributionModel =
          ((campaign as any).attribution_model as AttributionModel) || "last_touch";
        attributionWindowDays =
          Number((campaign as any).attribution_window_days) || DEFAULT_ATTRIBUTION_WINDOW_DAYS;
      } else if (raw.startsWith("CMP-")) {
        return null;
      }
    }
  } else {
    // AFF- profile code or bare code
    const { data: aff } = await client
      .from("affiliates")
      .select("id, is_active")
      .eq("affiliate_code", raw)
      .maybeSingle();
    if (!aff?.is_active) return null;
    affiliateId = aff.id;
  }

  if (!affiliateId) return null;

  const { data: affiliate } = await client
    .from("affiliates")
    .select("id, user_id, is_active")
    .eq("id", affiliateId)
    .maybeSingle();
  if (!affiliate?.is_active) return null;

  return {
    referralCode: raw,
    affiliateId: affiliate.id,
    affiliateUserId: affiliate.user_id,
    linkId,
    campaignId,
    commissionRate,
    attributionModel,
    attributionWindowDays,
    attributedAt: new Date().toISOString(),
    touch: "last_touch",
  };
}

export function isWithinAttributionWindow(
  attributedAtMs: number | null | undefined,
  windowDays: number
): boolean {
  if (attributedAtMs == null) return true; // allow when timestamp missing (legacy cookies)
  const ageMs = Date.now() - attributedAtMs;
  return ageMs >= 0 && ageMs <= windowDays * 24 * 60 * 60 * 1000;
}

/** Prefer first or last touch based on model; enforce window. */
export async function resolveActiveAttribution(
  model: AttributionModel = "last_touch"
): Promise<ResolvedReferral | null> {
  const { lastTouch, firstTouch, attributedAtMs } = await readReferralCookies();
  const code = model === "first_touch" ? firstTouch || lastTouch : lastTouch || firstTouch;
  const resolved = await resolveReferralCode(code);
  if (!resolved) return null;
  const windowDays = resolved.attributionWindowDays || DEFAULT_ATTRIBUTION_WINDOW_DAYS;
  if (!isWithinAttributionWindow(attributedAtMs, windowDays)) return null;
  return {
    ...resolved,
    touch: model,
    attributionModel: model,
    attributedAt:
      attributedAtMs != null ? new Date(attributedAtMs).toISOString() : resolved.attributedAt,
  };
}

export function isSelfReferral(buyerUserId: string, affiliateUserId: string): boolean {
  return Boolean(buyerUserId && affiliateUserId && buyerUserId === affiliateUserId);
}

export async function buildLineAttribution(input: {
  buyerUserId: string;
  productSource: string | null | undefined;
  affiliateEnabled: boolean;
  productCommissionRate?: number | null;
  /** Absolute per-unit commission in USD (e.g. CJ affiliate_price converted). */
  affiliateFixedAmountUsd?: number | null;
  lineTotal: number;
  quantity?: number;
  cartAffiliateLinkId?: string | null;
  preferredModel?: AttributionModel;
  platformDefaultRate?: number | null;
}): Promise<LineAttribution | null> {
  const source = normalizeProductSource(input.productSource) as ProductSource;
  if (!supportsAffiliateCommission(source, input.affiliateEnabled)) return null;

  let resolved: ResolvedReferral | null = null;

  if (input.cartAffiliateLinkId) {
    const client = db();
    const { data: link } = await client
      .from("affiliate_links")
      .select("id, affiliate_id, campaign_id, commission_rate, link_code, is_active")
      .eq("id", input.cartAffiliateLinkId)
      .maybeSingle();
    if (link?.is_active) {
      resolved = await resolveReferralCode(link.link_code);
    }
  }

  if (!resolved) {
    resolved = await resolveActiveAttribution(input.preferredModel ?? "last_touch");
  }
  if (!resolved) return null;
  if (isSelfReferral(input.buyerUserId, resolved.affiliateUserId)) return null;

  const usedRate = resolveCommissionRatePercent({
    linkRate: resolved.commissionRate,
    campaignRate: resolved.commissionRate,
    productRate: input.productCommissionRate,
    platformDefault:
      input.platformDefaultRate ??
      Number(
        process.env.DEFAULT_AFFILIATE_COMMISSION_PERCENT ??
          DEFAULT_AFFILIATE_COMMISSION_PERCENT,
      ),
  });

  const qty = Math.max(1, Number(input.quantity) || 1);
  let amount: number;
  if (
    input.affiliateFixedAmountUsd != null &&
    Number.isFinite(input.affiliateFixedAmountUsd) &&
    input.affiliateFixedAmountUsd > 0
  ) {
    amount = Math.round(input.affiliateFixedAmountUsd * qty * 100) / 100;
  } else {
    amount = estimateAffiliateCommissionUsd(input.lineTotal, usedRate).amount;
  }
  if (amount <= 0) return null;

  return {
    affiliate_id: resolved.affiliateId,
    affiliate_link_id: resolved.linkId,
    affiliate_commission_rate: usedRate,
    affiliate_commission_amount: amount,
    campaign_id: resolved.campaignId,
    attribution_model: resolved.attributionModel,
  };
}
