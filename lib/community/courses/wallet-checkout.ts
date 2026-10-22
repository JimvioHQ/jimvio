import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { getActiveEnrollment } from "@/lib/community/courses/access";
import { confirmCoursePurchase } from "@/lib/community/courses/confirm-purchase";
import { walletCourseIdempotencyKey } from "@/lib/community/courses/purchase-policy";
import { serverPriceCents } from "@/lib/community/courses/rules";

type CourseRow = {
  id: string;
  title: string;
  price_cents: number | null;
  currency: string | null;
};

export type WalletCoursePurchaseResult =
  | { ok: true; enrollment: Record<string, unknown> | null; alreadyEnrolled: boolean; replayed: boolean }
  | { ok: false; error: string; status: number };

async function loadEnrollment(admin: SupabaseClient, courseId: string, userId: string) {
  const { data } = await admin
    .from("course_enrollments")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

async function creditAvailable(admin: SupabaseClient, walletId: string, amount: number) {
  const { error } = await admin.rpc("credit_wallet_available", {
    p_wallet_id: walletId,
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
}

/**
 * Debit the student wallet and grant the course exactly once per user+course.
 * Concurrent retries share the same idempotency key and cannot double-debit.
 */
export async function purchaseCourseWithWallet(
  admin: SupabaseClient,
  input: { userId: string; course: CourseRow }
): Promise<WalletCoursePurchaseResult> {
  const priceCents = serverPriceCents(input.course.price_cents);
  if (!priceCents) return { ok: false, error: "This course is free", status: 400 };
  const amount = priceCents / 100;
  const currency = String(input.course.currency || "USD").toUpperCase();
  if (currency !== "USD") {
    return { ok: false, error: "Paid courses currently settle in USD", status: 400 };
  }

  const existing = await getActiveEnrollment(input.course.id, input.userId);
  if (existing) {
    return { ok: true, enrollment: existing as unknown as Record<string, unknown>, alreadyEnrolled: true, replayed: true };
  }

  const wallet = await ensureWallet(input.userId, admin);
  const idempotencyKey = walletCourseIdempotencyKey(input.userId, input.course.id);
  const now = new Date().toISOString();

  const { data: attempt, error: attemptError } = await admin
    .from("course_purchase_attempts")
    .upsert(
      {
        user_id: input.userId,
        course_id: input.course.id,
        provider: "wallet",
        idempotency_key: idempotencyKey,
        status: "pending",
        amount,
        currency,
        updated_at: now,
      },
      { onConflict: "idempotency_key" }
    )
    .select("id, status, wallet_debited, transaction_id")
    .single();

  if (attemptError || !attempt) {
    return { ok: false, error: attemptError?.message ?? "Could not start wallet purchase", status: 400 };
  }

  if (attempt.status === "completed") {
    const enrollment = await loadEnrollment(admin, input.course.id, input.userId);
    return { ok: true, enrollment, alreadyEnrolled: true, replayed: true };
  }

  if (attempt.status === "refunded" || attempt.status === "failed") {
    await admin
      .from("course_purchase_attempts")
      .update({
        status: "pending",
        wallet_debited: false,
        transaction_id: null,
        updated_at: now,
      })
      .eq("id", attempt.id);
    attempt.status = "pending";
    attempt.wallet_debited = false;
    attempt.transaction_id = null;
  }

  if (!attempt.wallet_debited) {
    const { error: debitError } = await admin.rpc("debit_wallet_if_sufficient", {
      p_wallet_id: wallet.id,
      p_amount: amount,
    });
    if (debitError) {
      const message = debitError.message || "Insufficient wallet balance";
      const insufficient = /insufficient/i.test(message);
      await admin
        .from("course_purchase_attempts")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", attempt.id)
        .eq("status", "pending")
        .eq("wallet_debited", false);
      return {
        ok: false,
        error: insufficient ? "Insufficient wallet balance" : message,
        status: 400,
      };
    }
    await admin
      .from("course_purchase_attempts")
      .update({ wallet_debited: true, updated_at: new Date().toISOString() })
      .eq("id", attempt.id);
  }

  const { data: existingTx } = await admin
    .from("transactions")
    .select("id, status")
    .eq("provider_transaction_id", idempotencyKey)
    .maybeSingle();

  let txId = existingTx?.id as string | undefined;
  if (!txId) {
    const { data: insertedTx, error: txError } = await admin
      .from("transactions")
      .insert({
        user_id: input.userId,
        type: "course_purchase",
        amount,
        currency,
        status: "pending",
        direction: "debit",
        provider: "wallet",
        provider_transaction_id: idempotencyKey,
        reference: idempotencyKey,
        description: `Course ${input.course.title}`,
        metadata: {
          purpose: "course_purchase",
          course_id: input.course.id,
          amount_cents: priceCents,
          idempotency_key: idempotencyKey,
        },
      })
      .select("id")
      .single();
    if (txError && !/duplicate|unique/i.test(txError.message)) {
      await creditAvailable(admin, wallet.id, amount);
      await admin
        .from("course_purchase_attempts")
        .update({ wallet_debited: false, status: "failed", updated_at: new Date().toISOString() })
        .eq("id", attempt.id);
      return { ok: false, error: txError.message, status: 400 };
    }
    if (insertedTx?.id) txId = insertedTx.id as string;
  }

  if (txId) {
    await admin
      .from("course_purchase_attempts")
      .update({ transaction_id: txId, updated_at: new Date().toISOString() })
      .eq("id", attempt.id);
  }

  const confirmed = await confirmCoursePurchase(admin, {
    paymentRef: idempotencyKey,
    amount,
    currency,
    provider: "wallet",
  });

  if (!confirmed.handled || !confirmed.granted) {
    const { data: latest } = await admin
      .from("course_purchase_attempts")
      .select("wallet_debited, status")
      .eq("id", attempt.id)
      .maybeSingle();
    if (latest?.wallet_debited && latest.status !== "completed") {
      await creditAvailable(admin, wallet.id, amount);
      await admin
        .from("course_purchase_attempts")
        .update({
          wallet_debited: false,
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", attempt.id)
        .neq("status", "completed");
    }
    return { ok: false, error: "Could not confirm wallet payment", status: 400 };
  }

  await admin
    .from("course_purchase_attempts")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", attempt.id);

  const enrollment = await loadEnrollment(admin, input.course.id, input.userId);
  return {
    ok: true,
    enrollment,
    alreadyEnrolled: Boolean(confirmed.alreadyEnrolled),
    replayed: Boolean(confirmed.alreadyEnrolled),
  };
}
