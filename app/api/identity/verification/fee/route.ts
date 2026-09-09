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
  normalizeVerificationFeeMethod,
  type VerificationFeeMethod,
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
import { createNowPaymentsInvoice } from "@/lib/nowpayments";
import { createBinancePayOrder } from "@/lib/binance-pay";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { safeDepositInitiateError } from "@/lib/payments/safe-payment-error";
import { getSiteUrl } from "@/lib/site-url";
import { usdToRwfAmount } from "@/lib/money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

/** Exact USD fee — never accept client amount. */
function serverFeeUsd(): number {
  return Math.round(BUSINESS_VERIFICATION_FEE_USD * 100) / 100;
}

function configuredFeeMethods(): VerificationFeeMethod[] {
  const methods: VerificationFeeMethod[] = ["wallet"];
  if (process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY) {
    methods.push("flutterwave", "mobile_money");
  }
  if (process.env.NOWPAYMENTS_API_KEY) methods.push("nowpayments");
  if (process.env.BINANCE_PAY_API_KEY || process.env.BINANCEPAY_API_KEY) {
    methods.push("binancepay");
  }
  return methods;
}

async function tryConfirmFlutterwaveFee(
  db: ServiceClient,
  opts: { providerRef?: string | null; transactionId?: string | null; userId: string },
): Promise<boolean> {
  const ref = opts.providerRef?.trim() || null;
  const txId = opts.transactionId?.trim() || null;
  if (!ref && !txId) return false;

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

function sanitizeMerchantTradeNo(seed: string): string {
  return seed.replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
}

/** GET — fee status + optional Flutterwave return confirmation. */
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
  const wallet = await ensureWallet(user.id, admin);
  const availableBalance = Number(wallet.available_balance ?? 0);

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
    availableBalance,
    walletSufficient: availableBalance >= serverFeeUsd(),
    supportedMethods: configuredFeeMethods(),
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

/** POST — initiate exactly $5.65. Never trusts client amount. */
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

  let body: { method?: string; idempotencyKey?: string; phone?: string; amount?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Explicitly ignore any client-supplied amount (tamper resistance)
  void body.amount;

  const amount = serverFeeUsd();
  if (amount !== 5.65) {
    return NextResponse.json({ error: "Fee configuration error" }, { status: 500 });
  }

  const method = normalizeVerificationFeeMethod(body.method) || "flutterwave";
  const available = configuredFeeMethods();
  if (!available.includes(method)) {
    return NextResponse.json(
      { error: "That payment method is not available for business verification." },
      { status: 400 },
    );
  }

  const idempotencyKey =
    String(body.idempotencyKey || "").trim() ||
    req.headers.get("idempotency-key")?.trim() ||
    randomUUID();

  const { data: existingByKey } = await admin
    .from("business_verification_fee_payments")
    .select("id, status, provider_ref, method, amount_usd, metadata")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingByKey?.status === "paid") {
    return NextResponse.json({
      feePaid: true,
      feeUsd: amount,
      feePaymentId: existingByKey.id,
    });
  }

  if (existingByKey?.status === "pending") {
    const meta = (existingByKey.metadata ?? {}) as {
      checkout_url?: string;
      charged_amount?: number;
      charged_currency?: string;
    };
    const storedUsd = Number(existingByKey.amount_usd);
    const chargedOk =
      Math.abs(storedUsd - amount) < 0.011 &&
      (meta.charged_amount == null || Math.abs(Number(meta.charged_amount) - Number(meta.charged_currency === "RWF" ? usdToRwfAmount(amount) : amount)) < 1 || meta.charged_currency === "USD" || meta.charged_currency === "USDT");
    if (meta.checkout_url && chargedOk && Math.abs(storedUsd - amount) < 0.011) {
      return NextResponse.json({
        feePaid: false,
        feeUsd: amount,
        feePaymentId: existingByKey.id,
        checkoutUrl: meta.checkout_url,
        providerRef: existingByKey.provider_ref,
        method: existingByKey.method,
      });
    }
  }

  const appUrl = getSiteUrl().replace(/\/$/, "");
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

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
        metadata: { purpose: BUSINESS_VERIFICATION_FEE_PURPOSE, charged_amount: amount, charged_currency: "USD" },
      })
      .select("id")
      .single();

    if (feeErr || !feeRow) {
      await refundWallet(admin, user.id, amount, debit.availableAfter);
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

  const providerRef = generateTxRef("BVFEE");
  const redirectUrl = `${appUrl}/marketplace/new?business_verification_fee=1&ref=${encodeURIComponent(providerRef)}`;

  // Charge currency: USD for card/crypto/binance; RWF for Rwanda Mobile Money only
  const isMomo = method === "mobile_money";
  const chargeCurrency = isMomo ? "RWF" : method === "binancepay" ? "USDT" : "USD";
  const chargeAmount = isMomo ? usdToRwfAmount(amount) : amount;

  if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) {
    return NextResponse.json({ error: "Could not compute verification fee charge." }, { status: 500 });
  }
  // Guard: never send product-sized amounts for this fee
  if (!isMomo && Math.abs(chargeAmount - amount) > 0.001) {
    return NextResponse.json({ error: "Fee amount integrity check failed." }, { status: 500 });
  }
  if (isMomo && chargeAmount > 100_000) {
    return NextResponse.json({ error: "Mobile money fee conversion out of range." }, { status: 500 });
  }

  const { data: feeRow, error: feeErr } = await admin
    .from("business_verification_fee_payments")
    .insert({
      user_id: user.id,
      vendor_id: vendor.id,
      amount_usd: amount,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      status: "pending",
      method: method === "mobile_money" ? "mobile_money" : method === "nowpayments" ? "nowpayments" : method === "binancepay" ? "binancepay" : "flutterwave",
      provider_ref: providerRef,
      idempotency_key: idempotencyKey,
      metadata: {
        purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
        charged_amount: chargeAmount,
        charged_currency: chargeCurrency,
      },
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
    // Method check constraint may reject new methods until migration applies
    console.error("[verification-fee] insert failed", feeErr);
    return NextResponse.json({ error: "Could not start verification fee payment." }, { status: 500 });
  }

  try {
    let checkoutUrl: string | null = null;

    if (method === "flutterwave" || method === "mobile_money") {
      checkoutUrl = await createFlutterwavePaymentLink({
        txRef: providerRef,
        amount: chargeAmount,
        currency: chargeCurrency,
        redirectUrl,
        customerEmail: profile?.email || user.email || "payments@jimvio.com",
        customerName: profile?.full_name || "Jimvio Seller",
        customerPhone: body.phone || profile?.phone || "",
        orderDescription: "Jimvio Business Verification Fee",
        paymentOptions: isMomo
          ? "mobilemoneyrwanda"
          : "card,googlepay,applepay",
        country: isMomo ? "RW" : "US",
        meta: {
          purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
          fee_payment_id: feeRow.id,
          vendor_id: vendor.id,
          user_id: user.id,
          amount_usd: String(amount),
          charged_amount: String(chargeAmount),
          charged_currency: chargeCurrency,
        },
      });
    } else if (method === "nowpayments") {
      const invoice = await createNowPaymentsInvoice({
        jimvioOrderId: feeRow.id,
        amount,
        currency: "USD",
        description: "Jimvio Business Verification Fee",
        buyerEmail: profile?.email || user.email || "payments@jimvio.com",
        successUrl: redirectUrl,
        cancelUrl: `${appUrl}/marketplace/new?business_verification_fee=0&ref=${encodeURIComponent(providerRef)}`,
      });
      checkoutUrl = invoice.invoiceUrl ?? null;
      if (!checkoutUrl) throw new Error("NOWPayments invoice URL missing");
    } else if (method === "binancepay") {
      const merchantTradeNo = sanitizeMerchantTradeNo(
        `BVFEE${feeRow.id.replace(/-/g, "").slice(0, 18)}${Date.now().toString(36)}`,
      );
      const binanceOrder = await createBinancePayOrder({
        merchantOrderId: merchantTradeNo,
        orderAmount: amount,
        currency: "USDT",
        description: "Jimvio Business Verification Fee",
        returnUrl: redirectUrl,
        cancelUrl: `${appUrl}/marketplace/new?business_verification_fee=0&ref=${encodeURIComponent(providerRef)}`,
      });
      checkoutUrl =
        binanceOrder.checkoutUrl ||
        binanceOrder.universalUrl ||
        binanceOrder.qrcodeLink ||
        null;
      if (!checkoutUrl) throw new Error("Binance Pay checkout URL missing");
      await admin
        .from("business_verification_fee_payments")
        .update({
          provider_ref: merchantTradeNo,
          metadata: {
            purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
            charged_amount: amount,
            charged_currency: "USDT",
            checkout_url: checkoutUrl,
            binance_merchant_trade_no: merchantTradeNo,
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
        provider: "binancepay",
        provider_transaction_id: merchantTradeNo,
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
        providerRef: merchantTradeNo,
        method: "binancepay",
        chargedAmount: amount,
        chargedCurrency: "USDT",
      });
    }

    if (!checkoutUrl) throw new Error("Checkout URL missing");

    await admin
      .from("business_verification_fee_payments")
      .update({
        metadata: {
          purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
          charged_amount: chargeAmount,
          charged_currency: chargeCurrency,
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
      provider: method === "nowpayments" ? "nowpayments" : "flutterwave",
      provider_transaction_id: providerRef,
      reference: feeRow.id,
      description: "Jimvio Business Verification Fee",
      metadata: {
        purpose: BUSINESS_VERIFICATION_FEE_PURPOSE,
        fee_payment_id: feeRow.id,
        vendor_id: vendor.id,
        charged_amount: chargeAmount,
        charged_currency: chargeCurrency,
      },
    });

    return NextResponse.json({
      feePaid: false,
      feeUsd: amount,
      currency: BUSINESS_VERIFICATION_FEE_CURRENCY,
      feePaymentId: feeRow.id,
      checkoutUrl,
      providerRef,
      method,
      chargedAmount: chargeAmount,
      chargedCurrency: chargeCurrency,
    });
  } catch (err) {
    await admin
      .from("business_verification_fee_payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", feeRow.id)
      .eq("status", "pending");
    return NextResponse.json(
      { error: safeDepositInitiateError(method === "nowpayments" ? "nowpayments" : method === "binancepay" ? "binancepay" : "flutterwave", err) },
      { status: 502 },
    );
  }
}
