/**
 * lib/payments/community-payment-finalizer.ts
 *
 * Idempotent community subscription finalizer.
 * Safe to call from any webhook handler — guards against double-crediting
 * via unique constraint on `community_payments.payment_reference`.
 *
 * Assumes existing `community_payments` table has:
 *   unique (payment_reference)
 * If not yet added, add via Supabase SQL:
 *   alter table community_payments
 *     add constraint community_payments_payment_reference_key unique (payment_reference);
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CommunityPaymentContext {
  communityId: string;
  userId: string;
  planType: "monthly" | "yearly" | "lifetime";
  amount: number;
  currency: string;
  paymentProvider: string;
  /** Must be globally unique, e.g. provider tx ID */
  paymentReference: string;
}

export interface CommunityPaymentResult {
  skipped: boolean;
  creatorEarnings: number;
  platformEarnings: number;
}

/**
 * Finalize a community subscription payment:
 *  1. Upserts membership to active
 *  2. Inserts community_payment record (idempotent via unique reference)
 *  3. Credits community owner wallet
 *  4. Credits platform wallet (if JIMVIO_PLATFORM_WALLET_USER_ID set)
 *  5. Inserts transaction records for both
 */
export async function finalizeCommunityPayment(
  db: SupabaseClient,
  ctx: CommunityPaymentContext
): Promise<CommunityPaymentResult> {
  // --- Idempotency guard ---
  const { data: existingPayment } = await db
    .from("community_payments")
    .select("id")
    .eq("payment_reference", ctx.paymentReference)
    .maybeSingle();

  if (existingPayment) {
    return { skipped: true, creatorEarnings: 0, platformEarnings: 0 };
  }

  // --- Load community ---
  const { data: community } = await db
    .from("communities")
    .select("owner_id, platform_commission_rate, member_count, is_active")
    .eq("id", ctx.communityId)
    .single();

  if (!community) throw new Error(`Community not found: ${ctx.communityId}`);

  // --- Calculate split ---
  const commissionRate = Number(community.platform_commission_rate ?? 15);
  const platformEarnings = ctx.amount * (commissionRate / 100);
  const creatorEarnings = ctx.amount - platformEarnings;

  // --- Compute membership expiry ---
  let expiresAt: string | null = null;
  if (ctx.planType === "monthly") {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    expiresAt = d.toISOString();
  } else if (ctx.planType === "yearly") {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    expiresAt = d.toISOString();
  }

  // --- Upsert membership ---
  const { data: existingMembership } = await db
    .from("community_memberships")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("community_id", ctx.communityId)
    .maybeSingle();

  let membershipId: string;

  if (existingMembership) {
    membershipId = existingMembership.id;
    await db
      .from("community_memberships")
      .update({
        plan_type: ctx.planType,
        status: "active",
        subscribed_at: new Date().toISOString(),
        expires_at: expiresAt,
        payment_reference: ctx.paymentReference,
        payment_provider: ctx.paymentProvider,
        amount_paid: ctx.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMembership.id);
  } else {
    const { data: inserted, error: insertErr } = await db
      .from("community_memberships")
      .insert({
        community_id: ctx.communityId,
        user_id: ctx.userId,
        role: "member",
        plan_type: ctx.planType,
        status: "active",
        subscribed_at: new Date().toISOString(),
        expires_at: expiresAt,
        payment_reference: ctx.paymentReference,
        payment_provider: ctx.paymentProvider,
        amount_paid: ctx.amount,
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;
    membershipId = inserted!.id;

    // Increment member count
    await db
      .from("communities")
      .update({ member_count: (community.member_count ?? 0) + 1 })
      .eq("id", ctx.communityId);
  }

  // --- Insert community_payment record ---
  await db.from("community_payments").insert({
    community_id: ctx.communityId,
    membership_id: membershipId,
    user_id: ctx.userId,
    amount: ctx.amount,
    currency: ctx.currency.toUpperCase(),
    plan_type: ctx.planType,
    payment_provider: ctx.paymentProvider,
    payment_reference: ctx.paymentReference,
    platform_commission: platformEarnings,
    creator_earnings: creatorEarnings,
    status: "completed",
  });

  const now = new Date().toISOString();

  // --- Credit creator wallet ---
  const { data: creatorWallet } = await db
    .from("wallets")
    .select("available_balance, total_earned")
    .eq("user_id", community.owner_id)
    .maybeSingle();

  if (creatorWallet) {
    await db
      .from("wallets")
      .update({
        available_balance: Number(creatorWallet.available_balance) + creatorEarnings,
        total_earned: Number(creatorWallet.total_earned) + creatorEarnings,
        updated_at: now,
      })
      .eq("user_id", community.owner_id);
  } else {
    await db.from("wallets").insert({
      user_id: community.owner_id,
      available_balance: creatorEarnings,
      total_earned: creatorEarnings,
      pending_balance: 0,
      total_paid: 0,
      currency: ctx.currency.toUpperCase(),
    });
  }

  // --- Creator earnings transaction record ---
  await db.from("transactions").insert({
    user_id: community.owner_id,
    reference: `COMM-EARN-${ctx.communityId.slice(0, 8)}-${ctx.paymentReference}`.slice(0, 100),
    type: "community_earning",
    amount: creatorEarnings,
    currency: ctx.currency.toUpperCase(),
    status: "completed",
    provider: ctx.paymentProvider,
    description: `Community subscription (${ctx.planType}) — creator earnings`,
    metadata: {
      community_id: ctx.communityId,
      membership_id: membershipId,
      plan_type: ctx.planType,
      commission_rate: commissionRate,
      platform_commission: platformEarnings,
      payment_reference: ctx.paymentReference,
    },
  });

  // --- Credit platform wallet (optional) ---
  const platformUserId = process.env.JIMVIO_PLATFORM_WALLET_USER_ID;
  if (platformUserId && platformEarnings > 0) {
    const { data: platformWallet } = await db
      .from("wallets")
      .select("available_balance, total_earned")
      .eq("user_id", platformUserId)
      .maybeSingle();

    if (platformWallet) {
      await db
        .from("wallets")
        .update({
          available_balance: Number(platformWallet.available_balance) + platformEarnings,
          total_earned: Number(platformWallet.total_earned) + platformEarnings,
          updated_at: now,
        })
        .eq("user_id", platformUserId);
    }

    await db.from("transactions").insert({
      user_id: platformUserId,
      reference: `COMM-COMM-${ctx.communityId.slice(0, 8)}-${ctx.paymentReference}`.slice(0, 100),
      type: "community_commission",
      amount: platformEarnings,
      currency: ctx.currency.toUpperCase(),
      status: "completed",
      provider: ctx.paymentProvider,
      description: `Community subscription commission (${commissionRate}% of ${ctx.amount} ${ctx.currency})`,
      metadata: {
        community_id: ctx.communityId,
        plan_type: ctx.planType,
        payment_reference: ctx.paymentReference,
      },
    });
  }

  return { skipped: false, creatorEarnings, platformEarnings };
}
