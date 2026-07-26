/**
 * Cross-surface attribution hooks for courses, live, communities, subscriptions.
 * Marketplace cart/buy-now is handled in checkout + finalize.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  buildLineAttribution,
  resolveActiveAttribution,
  isSelfReferral,
} from "@/lib/affiliate/attribution";
import { createPendingCommission } from "@/lib/affiliate/commissions";

function db() {
  return createServiceRoleClient() as any;
}

/** Persist referral on a generic conversion event (courses / live / subscriptions). */
export async function attributeNonOrderConversion(input: {
  buyerUserId: string;
  surface: "course" | "live" | "subscription" | "digital" | "community";
  amount: number;
  currency?: string;
  referenceId: string;
  productId?: string | null;
  vendorId?: string | null;
  affiliateEnabled?: boolean;
  commissionRate?: number | null;
}): Promise<{ attributed: boolean; affiliateId?: string }> {
  if (input.amount <= 0) return { attributed: false };

  const resolved = await resolveActiveAttribution("last_touch");
  if (!resolved) return { attributed: false };
  if (isSelfReferral(input.buyerUserId, resolved.affiliateUserId)) {
    return { attributed: false };
  }

  const rate = resolved.commissionRate ?? input.commissionRate ?? 10;
  const commissionAmount = Math.round(((input.amount * rate) / 100) * 100) / 100;
  if (commissionAmount <= 0) return { attributed: false };

  // Store attribution event for future subscription engine / analytics
  await db().from("affiliate_ledger").insert({
    affiliate_id: resolved.affiliateId,
    entry_type: "adjustment",
    amount: 0,
    note: `attribution_hook:${input.surface}`,
    metadata: {
      surface: input.surface,
      reference_id: input.referenceId,
      amount: input.amount,
      currency: input.currency ?? "USD",
      product_id: input.productId ?? null,
      commission_rate: rate,
      commission_amount: commissionAmount,
      referral_code: resolved.referralCode,
      campaign_id: resolved.campaignId,
    },
  });

  return { attributed: true, affiliateId: resolved.affiliateId };
}

/** Attribute a paid course enrollment that is not tied to marketplace order_items. */
export async function attributeCourseEnrollment(input: {
  buyerUserId: string;
  courseId: string;
  enrollmentId: string;
  amount: number;
  currency?: string;
  creatorUserId?: string | null;
}) {
  return attributeNonOrderConversion({
    buyerUserId: input.buyerUserId,
    surface: "course",
    amount: input.amount,
    currency: input.currency,
    referenceId: input.enrollmentId,
    productId: input.courseId,
    affiliateEnabled: true,
  });
}

/** Attribute a live purchase / ticket (hook for future live commerce). */
export async function attributeLivePurchase(input: {
  buyerUserId: string;
  liveSessionId: string;
  amount: number;
  currency?: string;
}) {
  return attributeNonOrderConversion({
    buyerUserId: input.buyerUserId,
    surface: "live",
    amount: input.amount,
    currency: input.currency,
    referenceId: input.liveSessionId,
    affiliateEnabled: true,
  });
}

/** Future subscriptions — records attribution metadata only until billing engine lands. */
export async function attributeSubscriptionSignup(input: {
  buyerUserId: string;
  subscriptionId: string;
  amount: number;
  currency?: string;
}) {
  return attributeNonOrderConversion({
    buyerUserId: input.buyerUserId,
    surface: "subscription",
    amount: input.amount,
    currency: input.currency,
    referenceId: input.subscriptionId,
    affiliateEnabled: true,
  });
}

export { buildLineAttribution, createPendingCommission };
