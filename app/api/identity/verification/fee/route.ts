import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureSellerVendor } from "@/lib/actions/seller-products";
import { isBusinessVerified } from "@/lib/products/authorization";
import {
  BUSINESS_VERIFICATION_FEE_CURRENCY,
  BUSINESS_VERIFICATION_FEE_PURPOSE,
  BUSINESS_VERIFICATION_FEE_USD,
  formatBusinessVerificationFee,
} from "@/lib/identity/business-verification-fee";
import {
  confirmBusinessVerificationFeeFromProvider,
  getOpenPaidVerificationFee,
  hasPaidVerificationFee,
} from "@/lib/identity/confirm-verification-fee";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import {
  createFlutterwavePaymentLink,
  isFlutterwaveSuccessfulStatus,
  verifyFlutterwaveTransaction,
} from "@/lib/flutterwave";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { safeDepositInitiateError } from "@/lib/payments/safe-payment-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

async function tryConfirmFlutterwaveFee(
  db: ServiceClient,
  opts: { providerRef?: string | null; transactionId?: string | null; userId: string },
): Promise<boolean> {
  const ref = opts.providerRef?.trim() || null;
  const txId = opts.transactionId?.trim() || null;
  if (!ref && !txId) return false;

  // Ownership check: fee row must belong to this user
  if (ref) {
    const { data: fee } = await db
      .from("business_verification_fee_payments")
      .select("id, user_id, status")
      .eq("provider_ref", ref)
      .maybeSingle();
    if (!fee || fee.user_id !== opts.userId) return false;
    if (fee.status === "paid" || fee.status === "consumed") return true;
  }

  try {
    const verified = await verifyFlutterwaveTransaction(txId || (ref as string), {
      retryOnNotFound: false,
      maxRetries: 1,
      useTxRef: !txId,
    });
    if (!isFlutterwaveSuccessfulStatus(verified.status)) return false;
    const result = await confirmBusinessVerificationFeeFromProvider(db, {
      provider: "flutterwave",
      providerRef: verified.tx_ref || ref,
      providerTransactionId: String(verified.id || txId || ""),
      amount: verified.amount != null ? Number(verified.amount) : null,
      currency: verified.currency || "USD",
    });
    return result.handled && (result.alreadyPaid || Boolean(result.feeId));
  } catch (err) {
    console.warn("[verification-fee] flutterwave confirm failed", err);
    return false;
  }
}

async function debitWallet(
  db: ServiceClient,
  userId: string,
  amount: number,
): Promise<{ ok: true; availableAfter: number } | { ok: false; error: string; status: number }> {
  const wallet = await ensureWallet(userId, db);
  const available = Number(wallet.available_balance ?? 0);
  if (available < amount) {
    return {
      ok: false,
      error: `Insufficient wallet balance. Need ${formatBusinessVerificationFee()}, have $${available.toFixed(2)}.`,
      status: 400,
    };
  }
  const { data: rows, error } = await db
    .from("wallets")
    .update({ available_balance: available - amount })
    .eq("user_id", userId)
    .eq("available_balance", available)
    .select("id, available_balance");
  if (error || !rows?.length) {
    return { ok: false, error: "Insufficient wallet balance.", status: 400 };
  }
  return { ok: true, availableAfter: Number(rows[0].available_balance ?? available - amount) };
}

async function refundWallet(
  db: ServiceClient,
  userId: string,
  amount: number,
  availableAfterDebit: number,
): Promise<void> {
  await db
    .from("wallets")
    .update({ available_balance: availableAfterDebit + amount })
    .eq("user_id", userId)
    .eq("available_balance", availableAfterDebit);
}

/** GET — fee status for the signed-in seller. Optional ?ref=&transaction_id= confirms Flutterwave return. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await ensureSellerVendor(user.id);
  if (!vendor) {
    return NextResponse.json({ error: "Could not prepare seller account" }, { status: 500 });
  }

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const ref = req.nextUrl.searchParams.get("ref");
  const transactionId =
    req.nextUrl.searchParams.get("transaction_id") ||
    req.nextUrl.searchParams.get("transactionId");
  if (ref || transactionId) {
    await tryConfirmFlutterwaveFee(admin, {
      providerRef: ref,
      transactionId,
      userId: user.id,
    });
  }

  const paid = await hasPaidVerificationFee(admin, vendor.id);
  const open = paid ? await getOpenPaidVerificationFee(admin, vendor.id) : null;

  const { data: latest } = await admin
    .from("business_verification_fee_payments")
    .select("id, status, method, amount_usd, paid_at, created_at, provider_ref")
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    feeUsd: BUSINESS_VERIFICATION_FEE_USD,
    currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
    feeLabel: formatBusinessVerificationFee(),
    feePaid: paid,
    verified: isBusinessVerified(vendor),
    latest: latest
      ? {
          id: latest.id,
          status: latest.status,
          method: latest.method,
          paidAt: latest.paid_at,
          createdAt: latest.created_at,
        }
      : null,
    openFeeId: open?.id ?? null,
  });
}

/** POST — initiate $5.65 payment (wallet or Flutterwave). Never trusts client amount. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await ensureSellerVendor(user.id);
  if (!vendor) {
    return NextResponse.json({ error: "Could not prepare seller account" }, { status: 500 });
  }

  if (isBusinessVerified(vendor)) {
    return NextResponse.json({
      verified: true,
      feePaid: true,
      feeUsd: BUSINESS_VERIFICATION_FEE_USD,
    });
  }

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (await hasPaidVerificationFee(admin, vendor.id)) {
    return NextResponse.json({
      feePaid: true,
      feeUsd: BUSINESS_VERIFICATION_FEE_USD,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      message: "Verification fee already paid. You can start business verification.",
    });
  }

  let body: { method?: string; idempotencyKey?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const methodRaw = String(body.method || "flutterwave").toLowerCase();
  const method = methodRaw === "wallet" ? "wallet" : "flutterwave";
  const idempotencyKey =
    String(body.idempotencyKey || "").trim() ||
    req.headers.get("idempotency-key")?.trim() ||
    randomUUID();

  // Idempotent replay
  const { data: existingByKey } = await admin
    .from("business_verification_fee_payments")
    .select("id, status, provider_ref, method, metadata")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingByKey?.status === "paid") {
    return NextResponse.json({
      feePaid: true,
      feeUsd: BUSINESS_VERIFICATION_FEE_USD,
      feePaymentId: existingByKey.id,
    });
  }
  if (existingByKey?.status === "pending" && existingByKey.method === "flutterwave") {
    const meta = (existingByKey.metadata ?? {}) as { checkout_url?: string };
    if (meta.checkout_url) {
      return NextResponse.json({
        feePaid: false,
        feeUsd: BUSINESS_VERIFICATION_FEE_USD,
        feePaymentId: existingByKey.id,
        checkoutUrl: meta.checkout_url,
        providerRef: existingByKey.provider_ref,
      });
    }
  }

  const amount = BUSINESS_VERIFICATION_FEE_USD;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.jimvio.com").replace(/\/$/, "");

  if (method === "wallet") {
    const debit = await debitWallet(admin, user.id, amount);
    if (!debit.ok) {
      return NextResponse.json({ error: debit.error }, { status: debit.status });
    }

    const providerRef = generateTxRef("BVFEE");
    const now = new Date().toISOString();
    const { data: feeRow, error: feeErr } = await admin
      .from("business_verification_fee_payments")
      .insert({
        user_id: user.id,
        vendor_id: vendor.id,
        amount_usd: amount,
        currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
        status: "paid",
        method: "wallet",
        provider_ref: providerRef,
        idempotency_key: idempotencyKey,
        paid_at: now,
        metadata: { purpose: BUSINESS_VERIFICATION_FEE_PURPOSE },
      })
      .select("id")
      .single();

    if (feeErr || !feeRow) {
      await refundWallet(admin, user.id, amount, debit.availableAfter);
      // Unique paid-open index clash = already paid
      if (String(feeErr?.code) === "23505") {
        return NextResponse.json({
          feePaid: true,
          feeUsd: amount,
          message: "Verification fee already paid.",
        });
      }
      return NextResponse.json({ error: "Could not record verification fee payment." }, { status: 500 });
    }

    await admin.from("transactions").insert({
      user_id: user.id,
      type: "business_verification_fee",
      amount,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      status: "completed",
      direction: "debit",
      provider: "wallet",
      provider_transaction_id: providerRef,
      reference: feeRow.id,
      description: "Jimvio Business Verification Fee",
      metadata: {
        purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
        fee_payment_id: feeRow.id,
        vendor_id: vendor.id,
      },
    });

    return NextResponse.json({
      feePaid: true,
      feeUsd: amount,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      feePaymentId: feeRow.id,
      method: "wallet",
    });
  }

  // Flutterwave card / mobile money
  const providerRef = generateTxRef("BVFEE");
  const redirectUrl = `${appUrl}/marketplace/new?business_verification_fee=1&ref=${encodeURIComponent(providerRef)}`;

  const { data: feeRow, error: feeErr } = await admin
    .from("business_verification_fee_payments")
    .insert({
      user_id: user.id,
      vendor_id: vendor.id,
      amount_usd: amount,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      status: "pending",
      method: "flutterwave",
      provider_ref: providerRef,
      idempotency_key: idempotencyKey,
      metadata: { purpose: BUSINESS_VERIFICATION_FEE_PURPOSE },
    })
    .select("id")
    .single();

  if (feeErr || !feeRow) {
    if (String(feeErr?.code) === "23505") {
      return NextResponse.json({
        feePaid: true,
        feeUsd: amount,
        message: "Verification fee already paid.",
      });
    }
    return NextResponse.json({ error: "Could not start verification fee payment." }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  try {
    const checkoutUrl = await createFlutterwavePaymentLink({
      txRef: providerRef,
      amount,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      redirectUrl,
      customerEmail: profile?.email || user.email || "payments@jimvio.com",
      customerName: profile?.full_name || "Jimvio Seller",
      orderDescription: "Jimvio Business Verification Fee",
      meta: {
        purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
        fee_payment_id: feeRow.id,
        vendor_id: vendor.id,
        user_id: user.id,
        amount_usd: String(amount),
      },
    });

    await admin
      .from("business_verification_fee_payments")
      .update({
        metadata: {
          purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
          checkout_url: checkoutUrl,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", feeRow.id);

    await admin.from("transactions").insert({
      user_id: user.id,
      type: "business_verification_fee",
      amount,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      status: "pending",
      direction: "debit",
      provider: "flutterwave",
      provider_transaction_id: providerRef,
      reference: feeRow.id,
      description: "Jimvio Business Verification Fee",
      metadata: {
        purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
        fee_payment_id: feeRow.id,
        vendor_id: vendor.id,
      },
    });

    return NextResponse.json({
      feePaid: false,
      feeUsd: amount,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      feePaymentId: feeRow.id,
      checkoutUrl,
      providerRef,
      method: "flutterwave",
    });
  } catch (err) {
    await admin
      .from("business_verification_fee_payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", feeRow.id)
      .eq("status", "pending");
    return NextResponse.json(
      { error: safeDepositInitiateError("flutterwave", err) },
      { status: 502 },
    );
  }
}
