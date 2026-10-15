import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { paymentAmountsMatch } from "@/lib/payments/order-payment-utils";
import { enrollInCourse } from "@/lib/community/courses/access";
import { serverPriceCents } from "@/lib/community/courses/rules";

type ConfirmInput = {
  paymentRef?: string | null;
  providerTransactionId?: string | null;
  amount?: number | null;
  currency?: string | null;
  provider?: string | null;
};

export type CoursePurchaseConfirmResult =
  | { handled: false }
  | { handled: true; granted: boolean; courseId: string; userId: string; alreadyEnrolled: boolean };

function dbClient(db?: SupabaseClient) {
  return db ?? createServiceRoleClient();
}

/**
 * Grants course access only after a provider-confirmed payment whose amount
 * matches the server-stored transaction. Replays are ignored via the receipt.
 */
export async function confirmCoursePurchase(
  db: SupabaseClient | undefined,
  input: ConfirmInput
): Promise<CoursePurchaseConfirmResult> {
  const client = dbClient(db);
  const keys = [input.paymentRef, input.providerTransactionId].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (!keys.length) return { handled: false };

type CoursePurchaseTx = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  metadata: Record<string, unknown> | null;
  provider: string | null;
};

  let tx: CoursePurchaseTx | null = null;

  for (const key of keys) {
    const { data } = await client
      .from("transactions")
      .select("id, user_id, amount, currency, status, reference, metadata, provider, type")
      .eq("type", "course_purchase")
      .eq("provider_transaction_id", key)
      .maybeSingle();
    if (data) {
      tx = data as unknown as CoursePurchaseTx;
      break;
    }
  }
  if (!tx) return { handled: false };

  const meta = (tx.metadata ?? {}) as { course_id?: string; amount_cents?: number };
  const courseId = String(meta.course_id || tx.reference || "");
  if (!courseId) return { handled: false };

  const { data: existingReceipt } = await client
    .from("course_purchase_receipts")
    .select("id")
    .eq("payment_reference", keys[0])
    .maybeSingle();
  if (existingReceipt) {
    return { handled: true, granted: true, courseId, userId: tx.user_id, alreadyEnrolled: true };
  }

  const expectedAmount = Number(tx.amount);
  const expectedCurrency = String(tx.currency || "USD");
  if (input.amount == null || !input.currency) return { handled: false };
  if (!paymentAmountsMatch(Number(input.amount), input.currency, expectedAmount, expectedCurrency)) {
    await client
      .from("transactions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", tx.id)
      .eq("status", "pending");
    return { handled: true, granted: false, courseId, userId: tx.user_id, alreadyEnrolled: false };
  }

  const { data: course } = await client
    .from("community_courses")
    .select("id, price_cents, currency, creator_id, community_id, title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return { handled: false };

  const priceCents = serverPriceCents(meta.amount_cents ?? course.price_cents);
  const chargedCents = Math.round(expectedAmount * 100);
  if (!priceCents || Math.abs(chargedCents - priceCents) > 1) {
    await client
      .from("transactions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", tx.id)
      .eq("status", "pending");
    return { handled: true, granted: false, courseId, userId: tx.user_id, alreadyEnrolled: false };
  }

  await enrollInCourse({
    courseId,
    userId: tx.user_id,
    source: "purchase",
    amountCents: priceCents,
    currency: course.currency ?? expectedCurrency,
  });

  const { error: receiptError } = await client.from("course_purchase_receipts").insert({
    course_id: courseId,
    user_id: tx.user_id,
    payment_reference: keys[0],
    amount_cents: priceCents,
    currency: expectedCurrency,
    provider: input.provider ?? tx.provider ?? "unknown",
  });
  if (receiptError && !/duplicate|unique/i.test(receiptError.message)) {
    throw new Error(receiptError.message);
  }

  await client
    .from("transactions")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", tx.id);

  if (!receiptError) {
    await creditCourseSale(client, {
      ownerId: course.creator_id as string,
      communityId: course.community_id as string,
      amount: expectedAmount,
      currency: expectedCurrency,
      courseId,
      paymentReference: keys[0],
    });
  }

  return { handled: true, granted: true, courseId, userId: tx.user_id, alreadyEnrolled: false };
}

async function creditCourseSale(
  client: SupabaseClient,
  input: {
    ownerId: string;
    communityId: string;
    amount: number;
    currency: string;
    courseId: string;
    paymentReference: string;
  }
) {
  const { data: community } = await client
    .from("communities")
    .select("owner_id, platform_commission_rate")
    .eq("id", input.communityId)
    .maybeSingle();
  const ownerId = (community?.owner_id as string | undefined) ?? input.ownerId;
  const rate = Number(community?.platform_commission_rate ?? 15);
  const platform = input.amount * (rate / 100);
  const creator = input.amount - platform;
  const now = new Date().toISOString();
  const { data: wallet } = await client
    .from("wallets")
    .select("pending_balance, total_earned")
    .eq("user_id", ownerId)
    .maybeSingle();
  if (wallet) {
    await client
      .from("wallets")
      .update({
        pending_balance: Number(wallet.pending_balance || 0) + creator,
        total_earned: Number(wallet.total_earned || 0) + creator,
        updated_at: now,
      })
      .eq("user_id", ownerId);
  }
  await client.from("transactions").insert({
    user_id: ownerId,
    reference: `COURSE-EARN-${input.paymentReference}`.slice(0, 100),
    type: "course_earning",
    amount: creator,
    currency: input.currency.toUpperCase(),
    status: "pending",
    provider: "course",
    description: "Course sale pending escrow",
    metadata: {
      course_id: input.courseId,
      payment_reference: input.paymentReference,
      platform_commission: platform,
    },
  });
}
