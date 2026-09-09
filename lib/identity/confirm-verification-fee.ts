import type { SupabaseClient } from "@supabase/supabase-js";
import {
  amountsMatchFee,
  BUSINESS_VERIFICATION_FEE_CURRENCY,
  BUSINESS_VERIFICATION_FEE_PURPOSE,
  BUSINESS_VERIFICATION_FEE_USD,
} from "@/lib/identity/business-verification-fee";

export type FeePaymentRow = {
  id: string;
  user_id: string;
  vendor_id: string;
  amount_usd: number;
  currency: string;
  status: string;
  method: string;
  provider_ref: string | null;
  didit_session_id: string | null;
  paid_at: string | null;
};

/** Latest usable paid fee for a vendor (not yet consumed by a declined attempt cycle). */
export async function getOpenPaidVerificationFee(
  db: SupabaseClient,
  vendorId: string,
): Promise<FeePaymentRow | null> {
  const { data } = await db
    .from("business_verification_fee_payments")
    .select(
      "id, user_id, vendor_id, amount_usd, currency, status, method, provider_ref, didit_session_id, paid_at",
    )
    .eq("vendor_id", vendorId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as FeePaymentRow | null) ?? null;
}

export async function hasPaidVerificationFee(
  db: SupabaseClient,
  vendorId: string,
): Promise<boolean> {
  const row = await getOpenPaidVerificationFee(db, vendorId);
  return Boolean(row);
}

/** Confirm Flutterwave (or similar) payment for a pending fee row. Idempotent. */
export async function confirmBusinessVerificationFeeFromProvider(
  db: SupabaseClient,
  opts: {
    providerRef?: string | null;
    providerTransactionId?: string | null;
    amount?: number | null;
    currency?: string | null;
    provider?: string | null;
  },
): Promise<{ handled: false } | { handled: true; feeId: string; alreadyPaid: boolean }> {
  const keys = [opts.providerRef, opts.providerTransactionId]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());

  if (!keys.length) return { handled: false };

  let fee: FeePaymentRow | null = null;
  for (const key of keys) {
    const { data } = await db
      .from("business_verification_fee_payments")
      .select(
        "id, user_id, vendor_id, amount_usd, currency, status, method, provider_ref, didit_session_id, paid_at",
      )
      .eq("provider_ref", key)
      .maybeSingle();
    if (data) {
      fee = data as FeePaymentRow;
      break;
    }
  }

  if (!fee) {
    // Fallback: look up pending transaction metadata
    for (const key of keys) {
      const { data: tx } = await db
        .from("transactions")
        .select("id, reference, metadata, status")
        .eq("provider_transaction_id", key)
        .maybeSingle();
      const meta = (tx?.metadata ?? {}) as { purpose?: string; fee_payment_id?: string };
      if (meta.purpose !== BUSINESS_VERIFICATION_FEE_PURPOSE || !meta.fee_payment_id) continue;
      const { data } = await db
        .from("business_verification_fee_payments")
        .select(
          "id, user_id, vendor_id, amount_usd, currency, status, method, provider_ref, didit_session_id, paid_at",
        )
        .eq("id", meta.fee_payment_id)
        .maybeSingle();
      if (data) {
        fee = data as FeePaymentRow;
        break;
      }
    }
  }

  if (!fee) return { handled: false };

  if (fee.status === "paid" || fee.status === "consumed") {
    return { handled: true, feeId: fee.id, alreadyPaid: true };
  }

  if (fee.status !== "pending") {
    return { handled: true, feeId: fee.id, alreadyPaid: false };
  }

  if (!amountsMatchFee(opts.amount ?? fee.amount_usd, opts.currency ?? fee.currency)) {
    await db
      .from("business_verification_fee_payments")
      .update({
        status: "failed",
        metadata: {
          fail_reason: "amount_mismatch",
          received_amount: opts.amount,
          received_currency: opts.currency,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", fee.id)
      .eq("status", "pending");
    return { handled: true, feeId: fee.id, alreadyPaid: false };
  }

  const now = new Date().toISOString();
  const { data: updated } = await db
    .from("business_verification_fee_payments")
    .update({
      status: "paid",
      paid_at: now,
      updated_at: now,
      metadata: {
        confirmed_by: opts.provider || "flutterwave",
        provider_transaction_id: opts.providerTransactionId || null,
      },
    })
    .eq("id", fee.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updated) {
    await db
      .from("transactions")
      .update({ status: "completed", updated_at: now })
      .eq("type", "business_verification_fee")
      .eq("provider_transaction_id", fee.provider_ref || keys[0]);
  }

  return { handled: true, feeId: fee.id, alreadyPaid: !updated };
}

export async function markFeeConsumedByDiditSession(
  db: SupabaseClient,
  feeId: string,
  diditSessionId: string,
): Promise<void> {
  // Keep status=paid until verification completes (approved or declined).
  // Attach session id for audit trail; decline path will consume the fee.
  await db
    .from("business_verification_fee_payments")
    .update({
      didit_session_id: diditSessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feeId)
    .eq("status", "paid");
}

/** After a declined KYB, consume the paid fee so a new attempt requires a new $5.65. */
export async function consumeVerificationFeeForVendor(
  db: SupabaseClient,
  vendorId: string,
  diditSessionId?: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  let q = db
    .from("business_verification_fee_payments")
    .update({ status: "consumed", consumed_at: now, updated_at: now })
    .eq("vendor_id", vendorId)
    .eq("status", "paid");
  if (diditSessionId) {
    q = q.or(`didit_session_id.eq.${diditSessionId},didit_session_id.is.null`);
  }
  await q;
}

export { BUSINESS_VERIFICATION_FEE_USD, BUSINESS_VERIFICATION_FEE_CURRENCY };
