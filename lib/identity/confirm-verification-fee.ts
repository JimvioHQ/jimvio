import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUSINESS_VERIFICATION_FEE_CURRENCY,
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
  metadata?: Record<string, unknown> | null;
};

/** Latest usable paid fee for a vendor (not yet consumed by a declined attempt cycle). */
export async function getOpenPaidVerificationFee(
  db: SupabaseClient,
  vendorId: string,
): Promise<FeePaymentRow | null> {
  const { data } = await db
    .from("business_verification_fee_payments")
    .select(
      "id, user_id, vendor_id, amount_usd, currency, status, method, provider_ref, didit_session_id, paid_at, metadata",
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

/**
 * Business verification is support-reviewed. Provider callbacks must not
 * mark a fee paid, debit a wallet, or unlock physical selling.
 */
export async function confirmBusinessVerificationFeeFromProvider(
  db: SupabaseClient,
  opts: {
    providerRef?: string | null;
    providerTransactionId?: string | null;
    feePaymentId?: string | null;
    amount?: number | null;
    currency?: string | null;
    provider?: string | null;
  },
): Promise<{ handled: false } | { handled: true; feeId: string; alreadyPaid: boolean }> {
  void db;
  void opts;
  return { handled: false };
}

export async function markFeeConsumedByDiditSession(
  db: SupabaseClient,
  feeId: string,
  diditSessionId: string,
): Promise<void> {
  await db
    .from("business_verification_fee_payments")
    .update({
      didit_session_id: diditSessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feeId)
    .eq("status", "paid");
}

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
