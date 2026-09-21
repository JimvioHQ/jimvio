import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { getSiteUrl } from "@/lib/site-url";
import {
  getMoMoMarketByCountry,
  isMoMoNetworkSupported,
} from "@/lib/payments/flutterwave-mobile-money-capabilities";
import { createMobileMoneyPayment } from "@/lib/payments/flutterwave-mobile-money";
import { FlutterwaveError } from "@/lib/flutterwave";
import { buildPaymentSnapshot } from "@/lib/payments/order-payment-utils";
import { resolveTrustedRequestOrigin } from "@/lib/payments/customer-return-origin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const RequestSchema = z.object({
  amount: z.number().finite().min(1).max(1_000_000),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
  network: z.string().trim().max(40).optional().nullable(),
  phone: z.string().trim().min(7).max(24),
  idempotencyKey: z.string().trim().max(128).optional(),
});

/**
 * POST /api/wallet/os/deposits/mobile-money/initiate
 * Dedicated Global Mobile Money deposit — never Flutterwave hosted card checkout.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: z.infer<typeof RequestSchema>;
  try {
    const raw = await req.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Mobile Money deposit request.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amountUsd = Math.round(body.amount * 100) / 100;
  const market = getMoMoMarketByCountry(body.country);
  if (!market) {
    return NextResponse.json(
      {
        error: "Mobile Money is not available in this country.",
        code: "UNSUPPORTED_COUNTRY",
      },
      { status: 400 },
    );
  }

  if (market.requiresNetwork) {
    if (!body.network || !isMoMoNetworkSupported(market, body.network)) {
      return NextResponse.json(
        {
          error: "This Mobile Money provider is currently unavailable.",
          code: "UNSUPPORTED_NETWORK",
        },
        { status: 400 },
      );
    }
  }

  const db = createServiceRoleClient();
  await ensureWallet(user.id, db);

  const { data: profile } = await db
    .from("profiles")
    .select("email, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const email = profile?.email || user.email;
  if (!email) {
    return NextResponse.json(
      { error: "Add an email to your account before depositing.", code: "BUYER_EMAIL_MISSING" },
      { status: 400 },
    );
  }

  const idemp = body.idempotencyKey?.slice(0, 128) || "";
  if (idemp) {
    const { data: existing } = await db
      .from("wallet_deposits")
      .select("id, amount, currency, method, status, reference, invoice_url, metadata")
      .eq("user_id", user.id)
      .eq("method", "mobile_money")
      .eq("status", "pending")
      .contains("metadata", { idempotency_key: idemp })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.invoice_url) {
      return NextResponse.json({
        depositId: existing.id,
        txRef: existing.reference,
        checkoutUrl: existing.invoice_url,
        redirectUrl: existing.invoice_url,
        status: "pending",
        duplicate: true,
      });
    }
  }

  const txRef = generateTxRef("WMM");
  const { data: deposit, error: insertError } = await db
    .from("wallet_deposits")
    .insert({
      user_id: user.id,
      amount: amountUsd,
      currency: PLATFORM_CURRENCY,
      method: "mobile_money",
      status: "pending",
      reference: txRef,
      metadata: {
        purpose: "wallet_deposit",
        provider: "flutterwave",
        method: "mobile_money",
        country: market.countryCode,
        ...(idemp ? { idempotency_key: idemp } : {}),
      },
    })
    .select("id")
    .single();

  if (insertError || !deposit) {
    console.error("[wallet-momo/initiate] deposit insert failed", {
      code: insertError?.code,
      userId: user.id,
    });
    return NextResponse.json(
      { error: "We couldn't start the Mobile Money payment.", code: "PAYMENT_INIT_FAILED" },
      { status: 500 },
    );
  }

  const origin = resolveTrustedRequestOrigin(req) || getSiteUrl().replace(/\/$/, "");
  const redirectUrl = `${origin}/api/payments/flutterwave/callback?deposit=${deposit.id}`;

  let charge;
  try {
    charge = await createMobileMoneyPayment({
      country: market.countryCode,
      network: body.network,
      phone: body.phone,
      amountUsd,
      orderId: deposit.id,
      txRef,
      email,
      fullName: profile?.full_name || "Jimvio User",
      redirectUrl,
    });
  } catch (err) {
    await db
      .from("wallet_deposits")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", deposit.id);
    const msg =
      err instanceof FlutterwaveError
        ? err.message
        : "We couldn't start the Mobile Money payment.";
    return NextResponse.json(
      { error: msg.slice(0, 200), code: "PAYMENT_INIT_FAILED" },
      {
        status:
          err instanceof FlutterwaveError && err.statusCode < 500
            ? err.statusCode
            : 502,
      },
    );
  }

  const paymentSnapshot = buildPaymentSnapshot({
    orderTotal: amountUsd,
    orderCurrency: PLATFORM_CURRENCY,
    paymentAmount: charge.amount,
    paymentCurrency: charge.currency,
    exchangeRate: charge.exchangeRate,
  });

  await db
    .from("wallet_deposits")
    .update({
      invoice_url: charge.redirectUrl,
      metadata: {
        purpose: "wallet_deposit",
        provider: "flutterwave",
        method: "mobile_money",
        country: charge.country,
        network: charge.network,
        charge_type: charge.chargeType,
        phone_masked: charge.phoneMasked,
        payment_snapshot: paymentSnapshot,
        ...(idemp ? { idempotency_key: idemp } : {}),
      },
    })
    .eq("id", deposit.id);

  await db.from("transactions").insert({
    user_id: user.id,
    type: "wallet_deposit",
    direction: "credit",
    amount: charge.amount,
    currency: charge.currency,
    amount_usd: amountUsd,
    exchange_rate: charge.exchangeRate,
    status: charge.status === "failed" ? "failed" : "pending",
    provider: "flutterwave",
    provider_transaction_id: txRef,
    reference: charge.flwRef,
    description: `Mobile Money wallet deposit`,
    metadata: {
      purpose: "wallet_deposit",
      deposit_id: deposit.id,
      method: "mobile_money",
      country: charge.country,
      network: charge.network,
      charge_type: charge.chargeType,
      phone_masked: charge.phoneMasked,
      flw_transaction_id: charge.flwTransactionId,
      flw_ref: charge.flwRef,
      payment_snapshot: paymentSnapshot,
      status_hint: charge.status === "pending" ? "awaiting_customer" : charge.status,
    },
  });

  console.info("[wallet-momo/initiate] created", {
    depositId: deposit.id,
    txRef,
    country: charge.country,
    currency: charge.currency,
    amount: charge.amount,
    amountUsd,
    hasRedirect: Boolean(charge.redirectUrl),
  });

  return NextResponse.json({
    depositId: deposit.id,
    txRef,
    status: charge.status,
    redirectUrl: charge.redirectUrl,
    checkoutUrl: charge.redirectUrl,
    amount: charge.amount,
    currency: charge.currency,
    amountUsd,
    country: charge.country,
    network: charge.network,
    phoneMasked: charge.phoneMasked,
    authorizationMode: charge.authorizationMode,
  });
}
