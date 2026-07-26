/**
 * Affiliate integration hooks used by checkout and cart flows.
 * Full engine lives in lib/affiliate/* — these stay as stable import paths.
 */

import { cookies } from "next/headers";

export const AFFILIATE_REF_COOKIE = "jimvio_ref";
/** Legacy cookie from /api/affiliates/track — still read for compatibility. */
export const AFFILIATE_REF_COOKIE_LEGACY = "_aff_ref";
const AFFILIATE_REF_FIRST_COOKIE = "jimvio_ref_ft";

export type AffiliateAttribution = {
  referralCode: string | null;
  campaignId: string | null;
  source: "cookie" | "query" | "none";
};

/** Resolve referral code from request cookies (last-touch, then first-touch, then legacy). */
export async function resolveAffiliateReferralFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return (
    jar.get(AFFILIATE_REF_COOKIE)?.value?.trim() ||
    jar.get(AFFILIATE_REF_COOKIE_LEGACY)?.value?.trim() ||
    jar.get(AFFILIATE_REF_FIRST_COOKIE)?.value?.trim() ||
    null
  );
}

export function buildAffiliateAttribution(input: {
  referralCode?: string | null;
  campaignId?: string | null;
  source?: AffiliateAttribution["source"];
}): AffiliateAttribution {
  const referralCode = input.referralCode?.trim() || null;
  return {
    referralCode,
    campaignId: input.campaignId?.trim() || null,
    source: referralCode ? input.source ?? "cookie" : "none",
  };
}

export function estimateAffiliateCommission(input: {
  lineTotal: number;
  commissionRatePercent: number | null | undefined;
}): { amount: number; rate: number } {
  const rate = Math.max(0, Number(input.commissionRatePercent ?? 0));
  const amount =
    Math.round((((Number(input.lineTotal) || 0) * rate) / 100) * 100) / 100;
  return { amount, rate };
}

export function mergeAffiliateMetadata(
  existing: Record<string, unknown> | null | undefined,
  attribution: AffiliateAttribution
): Record<string, unknown> {
  const base = existing && typeof existing === "object" ? { ...existing } : {};
  if (!attribution.referralCode && !attribution.campaignId) return base;
  return {
    ...base,
    affiliate_attribution: {
      referral_code: attribution.referralCode,
      campaign_id: attribution.campaignId,
      source: attribution.source,
      attributed_at: new Date().toISOString(),
    },
  };
}
