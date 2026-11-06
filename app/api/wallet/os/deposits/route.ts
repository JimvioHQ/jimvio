import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { logWalletActivity } from "@/lib/wallet-os/activity";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { createNowPaymentsInvoice } from "@/lib/nowpayments";
import { createBinancePayOrder } from "@/lib/binance-pay";
import { getSiteUrl } from "@/lib/site-url";
import {
  isWalletDepositInitiable,
  normalizeWalletDepositMethod,
  walletDepositMethodLabel,
  walletDepositProviderId,
  WALLET_DEPOSIT_INITIABLE_METHODS,
  type WalletDepositDbMethod,
} from "@/lib/payments/wallet-deposit-method";
import { safeDepositInitiateError } from "@/lib/payments/safe-payment-error";

export const dynamic = "force-dynamic";

const BINANCE_SETTLE = "USDT";

function sanitizeMerchantTradeNo(seed: string): string {
  return seed.replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
}

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const db = createServiceRoleClient();
  const wallet = await ensureWallet(user.id, db);

  const { data, error: fetchError } = await db
    .from("wallet_deposits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (fetchError) {
    console.error("[wallet deposits] list failed", { code: fetchError.code });
    return NextResponse.json({ error: "Could not load deposits" }, { status: 500 });
  }

  const deposits = (data ?? []).map((row: {
    id: string;
    amount: number | string;
    currency: string | null;
    method: string;
    status: string;
    reference: string | null;
    invoice_url: string | null;
    receipt_url: string | null;
    created_at: string;
    completed_at: string | null;
  }) => ({
    id: row.id,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? PLATFORM_CURRENCY,
    method: row.method,
    methodLabel: walletDepositMethodLabel(row.method),
    status: row.status,
    reference: row.reference ?? null,
    invoiceUrl: row.invoice_url ?? null,
    receiptUrl: row.receipt_url ?? null,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
  }));

  return NextResponse.json({
    currency: PLATFORM_CURRENCY,
    availableBalance: Number(wallet.available_balance ?? 0),
    supportedMethods: [...WALLET_DEPOSIT_INITIABLE_METHODS],
    deposits,
  });
}

/**
 * Creates a pending USD deposit and, when a configured provider is selected,
 * returns a checkout URL. Wallet is credited only after verified payment.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: { amount?: number; method?: string; phone?: string; idempotencyKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json(
      { error: "Enter a valid deposit amount (minimum $1.00)" },
      { status: 400 },
    );
  }

  const method = normalizeWalletDepositMethod(body.method);
  if (!method || !isWalletDepositInitiable(method)) {
    return NextResponse.json(
      { error: "Choose an available payment method" },
      { status: 400 },
    );
  }

  const db = createServiceRoleClient();
  await ensureWallet(user.id, db);

  // Idempotency: reuse a recent pending deposit for the same user/method/amount
  const idempHeader =
    body.idempotencyKey?.trim() ||
    req.headers.get("idempotency-key")?.trim() ||
    "";
  if (idempHeader) {
    const { data: existingByMeta } = await db
      .from("wallet_deposits")
      .select("id, amount, currency, method, status, reference, invoice_url, created_at")
      .eq("user_id", user.id)
      .eq("method", method)
      .eq("status", "pending")
      .contains("metadata", { idempotency_key: idempHeader.slice(0, 128) })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingByMeta?.invoice_url) {
      return NextResponse.json({
        deposit: {
          id: existingByMeta.id,
          amount: Number(existingByMeta.amount),
          currency: existingByMeta.currency ?? PLATFORM_CURRENCY,
          method: existingByMeta.method,
          status: "pending",
          reference: existingByMeta.reference,
        },
        checkoutUrl: existingByMeta.invoice_url,
        duplicate: true,
      });
    }
  }

  const txRef = generateTxRef("WDEP");
  const { data: inserted, error: insertError } = await db
    .from("wallet_deposits")
    .insert({
      user_id: user.id,
      amount,
      currency: PLATFORM_CURRENCY,
      method,
      status: "pending",
      reference: txRef,
      metadata: {
        purpose: "wallet_deposit",
        provider: walletDepositProviderId(method),
        ...(idempHeader ? { idempotency_key: idempHeader.slice(0, 128) } : {}),
      },
    })
    .select()
    .single();

  if (insertError) {
    console.error("[wallet deposits] insert failed", {
      code: insertError.code,
      method,
      userId: user.id,
    });
    return NextResponse.json(
      {
        error: safeDepositInitiateError(method, insertError),
      },
      { status: 500 },
    );
  }

  await db.from("transactions").insert({
    user_id: user.id,
    type: "wallet_deposit",
    amount,
    currency: PLATFORM_CURRENCY,
    status: "pending",
    reference: `WDEP-PEND-${inserted.id}`,
    provider: walletDepositProviderId(method),
    provider_transaction_id: txRef,
    description: "Wallet deposit pending",
    metadata: { purpose: "wallet_deposit", deposit_id: inserted.id, method },
  });

  const appUrl = getSiteUrl().replace(/\/$/, "");
  let checkoutUrl: string | null = null;

  try {
    // Mobile Money must use the dedicated Global MoMo direct-charge flow —
    // never Flutterwave hosted card checkout (/v3/payments → hosted/pay).
    if (method === "mobile_money") {
      await db
        .from("wallet_deposits")
        .update({ status: "cancelled" })
        .eq("id", inserted.id)
        .eq("status", "pending");
      return NextResponse.json(
        {
          error:
            "Select Mobile Money again to open the dedicated Mobile Money deposit step.",
          code: "USE_MOBILE_MONEY_FLOW",
          redirectHint: "/wallet/deposits?payment=mobile_money",
        },
        { status: 400 },
      );
    }

    if (method === "flutterwave") {
      const { data: profile } = await db
        .from("profiles")
        .select("email, full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      checkoutUrl = await createFlutterwavePaymentLink({
        txRef,
        amount,
        currency: PLATFORM_CURRENCY,
        redirectUrl: `${appUrl}/api/payments/flutterwave/callback?deposit=${inserted.id}`,
        customerEmail: profile?.email || user.email || "wallet@jimvio.com",
        customerName: profile?.full_name || "Jimvio User",
        customerPhone: body.phone || profile?.phone || "",
        orderDescription: `Jimvio wallet deposit ${inserted.id.slice(0, 8)}`,
        meta: { purpose: "wallet_deposit", deposit_id: inserted.id },
        paymentOptions: "card",
      });
    } else if (method === "nowpayments") {
      const { data: profile } = await db
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .maybeSingle();
      const invoice = await createNowPaymentsInvoice({
        jimvioOrderId: inserted.id,
        amount,
        currency: PLATFORM_CURRENCY,
        description: `Wallet deposit ${inserted.id.slice(0, 8)}`,
        buyerEmail: profile?.email || user.email || "wallet@jimvio.com",
        successUrl: `${appUrl}/wallet/deposits?deposit=${inserted.id}&status=pending`,
        cancelUrl: `${appUrl}/wallet/deposits?deposit=${inserted.id}&status=cancelled`,
      });
      checkoutUrl = invoice.invoiceUrl ?? null;
      if (checkoutUrl || invoice.invoiceId) {
        await db
          .from("wallet_deposits")
          .update({
            invoice_url: checkoutUrl,
            metadata: {
              purpose: "wallet_deposit",
              provider: "nowpayments",
              nowpayments_invoice_id: invoice.invoiceId || null,
              ...(idempHeader ? { idempotency_key: idempHeader.slice(0, 128) } : {}),
            },
          })
          .eq("id", inserted.id);
      }
    } else if (method === "binancepay") {
      // USD wallet amounts settle as USDT (1:1 peg) — same settlement currency as marketplace.
      const payAmount = Number(amount.toFixed(2));
      const merchantTradeNo = sanitizeMerchantTradeNo(
        `WDEP${inserted.id.replace(/-/g, "").slice(0, 20)}${Date.now().toString(36)}`,
      );
      if (!merchantTradeNo) {
        throw new Error("Could not create Binance Pay reference");
      }

      const binanceOrder = await createBinancePayOrder({
        merchantOrderId: merchantTradeNo,
        orderAmount: payAmount,
        currency: BINANCE_SETTLE,
        description: `Jimvio wallet deposit ${inserted.id.slice(0, 8)}`,
        returnUrl: `${appUrl}/wallet/deposits?deposit=${inserted.id}&status=pending`,
        cancelUrl: `${appUrl}/wallet/deposits?deposit=${inserted.id}&status=cancelled`,
      });

      checkoutUrl =
        binanceOrder.checkoutUrl ||
        binanceOrder.universalUrl ||
        binanceOrder.qrcodeLink ||
        null;

      await db
        .from("wallet_deposits")
        .update({
          reference: merchantTradeNo,
          invoice_url: checkoutUrl,
          metadata: {
            purpose: "wallet_deposit",
            provider: "binancepay",
            binance_merchant_trade_no: merchantTradeNo,
            binance_prepay_id: binanceOrder.prepayId,
            binance_pay_amount: payAmount,
            binance_pay_currency: BINANCE_SETTLE,
            wallet_credit_usd: amount,
            ...(idempHeader ? { idempotency_key: idempHeader.slice(0, 128) } : {}),
          },
        })
        .eq("id", inserted.id);

      await db
        .from("transactions")
        .update({
          provider_transaction_id: merchantTradeNo,
          provider: "binancepay",
        })
        .eq("reference", `WDEP-PEND-${inserted.id}`);
    }
  } catch (err) {
    console.error("[wallet deposits] payment initiate failed", {
      method,
      depositId: inserted.id,
      message: err instanceof Error ? err.message : String(err),
    });
    await db
      .from("wallet_deposits")
      .update({ status: "failed" })
      .eq("id", inserted.id);
    return NextResponse.json(
      { error: safeDepositInitiateError(method, err) },
      { status: 502 },
    );
  }

  if (!checkoutUrl) {
    await db
      .from("wallet_deposits")
      .update({ status: "failed" })
      .eq("id", inserted.id);
    return NextResponse.json(
      { error: safeDepositInitiateError(method, new Error("No checkout URL")) },
      { status: 502 },
    );
  }

  // Persist invoice URL for Flutterwave card checkout (MoMo uses dedicated initiate).
  if (method === "flutterwave") {
    await db
      .from("wallet_deposits")
      .update({ invoice_url: checkoutUrl })
      .eq("id", inserted.id);
  }

  await logWalletActivity({
    userId: user.id,
    action: "deposit_requested",
    surface: "deposits",
    amount,
    currency: PLATFORM_CURRENCY,
    metadata: { depositId: inserted.id, method },
    db,
  });

  return NextResponse.json({
    deposit: {
      id: inserted.id,
      amount,
      currency: PLATFORM_CURRENCY,
      method: method as WalletDepositDbMethod,
      status: "pending",
      reference: txRef,
    },
    checkoutUrl,
  });
}
