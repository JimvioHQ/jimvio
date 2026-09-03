import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { logWalletActivity } from "@/lib/wallet-os/activity";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { createNowPaymentsInvoice } from "@/lib/nowpayments";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const PROVIDER_METHODS = new Set([
  "flutterwave",
  "paypal",
  "nowpayments",
  "binancepay",
  "pesapal",
  "pawapay",
  "mobile_money",
]);

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
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

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

  let body: { amount?: number; method?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Enter a valid deposit amount (minimum $1.00)" }, { status: 400 });
  }

  const method = String(body.method ?? "").trim().toLowerCase();
  if (!PROVIDER_METHODS.has(method)) {
    return NextResponse.json(
      { error: "Choose an available payment method" },
      { status: 400 },
    );
  }

  const db = createServiceRoleClient();
  await ensureWallet(user.id, db);

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
      metadata: { purpose: "wallet_deposit" },
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await db.from("transactions").insert({
    user_id: user.id,
    type: "wallet_deposit",
    amount,
    currency: PLATFORM_CURRENCY,
    status: "pending",
    reference: `WDEP-PEND-${inserted.id}`,
    provider: method,
    provider_transaction_id: txRef,
    description: "Wallet deposit pending",
    metadata: { purpose: "wallet_deposit", deposit_id: inserted.id },
  });

  const appUrl = getSiteUrl().replace(/\/$/, "");
  let checkoutUrl: string | null = null;

  try {
    if (method === "flutterwave" || method === "mobile_money") {
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
        successUrl: `${appUrl}/wallet/deposits?deposit=${inserted.id}&status=success`,
        cancelUrl: `${appUrl}/wallet/deposits?deposit=${inserted.id}&status=cancelled`,
      });
      checkoutUrl = (invoice as { invoice_url?: string }).invoice_url ?? null;
      if (checkoutUrl) {
        await db
          .from("wallet_deposits")
          .update({ invoice_url: checkoutUrl })
          .eq("id", inserted.id);
      }
    } else if (method === "paypal") {
      checkoutUrl = `${appUrl}/wallet/deposits?deposit=${inserted.id}&method=paypal&amount=${amount}`;
    } else {
      // Provider selected but dedicated initiate not wired — keep pending request
      checkoutUrl = null;
    }
  } catch (err) {
    console.error("[wallet deposits] payment initiate failed", err);
    await db
      .from("wallet_deposits")
      .update({ status: "failed" })
      .eq("id", inserted.id);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not start payment. Please try another method.",
      },
      { status: 502 },
    );
  }

  await logWalletActivity({
    userId: user.id,
    action: "deposit_requested",
    surface: "deposits",
    amount,
    currency: PLATFORM_CURRENCY,
    metadata: { depositId: inserted.id, method, checkoutUrl },
    db,
  });

  return NextResponse.json({
    deposit: {
      id: inserted.id,
      amount,
      currency: PLATFORM_CURRENCY,
      method,
      status: "pending",
      reference: txRef,
    },
    checkoutUrl,
  });
}
