import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { getWalletSecurityStatus } from "@/lib/wallet-os/security";
import { logWalletActivity } from "@/lib/wallet-os/activity";
import { listPayoutMethods, requestWithdrawal } from "@/services/creator-economy/payouts";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { syncAffiliatePaidOnWithdrawal } from "@/lib/affiliate/credit-wallet";
import {
  formatStoredPayoutAccount,
  normalizeWalletWithdrawalMethod,
  toCreatorPayoutDbMethod,
  validateWithdrawalDestination,
  validateWithdrawalDestinationDetails,
  walletWithdrawalMethodLabel,
  withdrawalProcessingEstimate,
  type WithdrawalDestinationDetails,
} from "@/lib/payments/wallet-payout-method";
import {
  calculateWithdrawalFee,
  WITHDRAWAL_FEE_RULES,
} from "@/lib/payments/withdrawal-fees";
import { safeWithdrawalError } from "@/lib/payments/safe-payment-error";

export const dynamic = "force-dynamic";

const MIN_WITHDRAWAL = 1;

function idempotencyKey(userId: string, amount: number, raw?: string | null) {
  if (raw && raw.trim()) return `WDR-${userId}-${raw.trim().slice(0, 64)}`;
  const bucket = Math.floor(Date.now() / 5000);
  return `WDR-${userId}-${amount}-${bucket}`;
}

/**
 * GET /api/wallet/os/withdrawals — list + balance + fee catalog.
 */
export async function GET(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const wallet = await ensureWallet(user.id, db);

  // Fee preview: ?preview=1&amount=&method=
  const preview = req.nextUrl.searchParams.get("preview") === "1";
  if (preview) {
    const amount = Number(req.nextUrl.searchParams.get("amount") ?? 0);
    const method = normalizeWalletWithdrawalMethod(
      req.nextUrl.searchParams.get("method")
    );
    if (!method || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid fee preview request" }, { status: 400 });
    }
    const quote = calculateWithdrawalFee(method, amount);
    return NextResponse.json({
      ...quote,
      processingEstimate: withdrawalProcessingEstimate(method),
      methodLabel: walletWithdrawalMethodLabel(method),
    });
  }

  const { data, error: fetchError } = await db
    .from("payouts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (fetchError) {
    console.error("[wallet withdrawals] list failed", { code: fetchError.code });
    return NextResponse.json({ error: "Could not load withdrawals" }, { status: 500 });
  }

  const withdrawals = (data ?? []).map((row: {
    id: string;
    amount: number | string;
    fee: number | string | null;
    net_amount: number | string | null;
    currency: string | null;
    status: string;
    payout_method: string | null;
    payout_account: string | null;
    provider_reference: string | null;
    notes: string | null;
    created_at: string;
    processed_at: string | null;
    release_date: string | null;
  }) => ({
    id: row.id,
    amount: Number(row.amount ?? 0),
    fee: Number(row.fee ?? 0),
    netAmount: Number(row.net_amount ?? row.amount ?? 0),
    currency: row.currency ?? PLATFORM_CURRENCY,
    status: row.status,
    method: row.payout_method ?? null,
    payoutMethod: row.payout_method ?? null,
    methodLabel: walletWithdrawalMethodLabel(row.payout_method),
    payoutAccount: row.payout_account ?? null,
    destinationDisplay: formatStoredPayoutAccount(
      row.payout_method,
      row.payout_account
    ),
    reference: row.provider_reference ?? null,
    providerReference: row.provider_reference ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? null,
    releaseDate: row.release_date ?? null,
  }));

  return NextResponse.json({
    currency: PLATFORM_CURRENCY,
    availableBalance: Number(wallet.available_balance ?? 0),
    feeRules: WITHDRAWAL_FEE_RULES,
    methods: ["bank", "mobile_money", "binance_id", "crypto"],
    withdrawals,
  });
}

/**
 * POST /api/wallet/os/withdrawals — creates a withdrawal request.
 * Manual admin-confirmed workflow. Session auth required; Wallet PIN not required.
 */
export async function POST(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: {
    amount?: number;
    method?: string;
    methodId?: string;
    payoutMethod?: string;
    payoutAccount?: string;
    destination?: WithdrawalDestinationDetails;
    idempotencyKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
    return NextResponse.json(
      { error: `Enter a valid amount (minimum ${MIN_WITHDRAWAL})` },
      { status: 400 },
    );
  }

  const wallet = await ensureWallet(user.id, db);
  if (Number(wallet.available_balance) < amount) {
    return NextResponse.json({ error: "Insufficient available balance" }, { status: 400 });
  }

  // Soft security: honor existing temporary lock (from other PIN surfaces) without requiring PIN here.
  const security = await getWalletSecurityStatus(user.id, db);
  if (security.locked) {
    return NextResponse.json(
      {
        error: "Wallet is temporarily locked. Try again later or contact support.",
        lockedUntil: security.lockedUntil,
      },
      { status: 423 },
    );
  }

  const idemp = idempotencyKey(
    user.id,
    amount,
    body.idempotencyKey ?? req.headers.get("idempotency-key"),
  );
  const { data: existingByRef } = await db
    .from("transactions")
    .select("id, metadata")
    .eq("reference", idemp)
    .maybeSingle();
  if (existingByRef) {
    return NextResponse.json({
      payout: (existingByRef.metadata as { payout?: unknown } | null)?.payout ?? null,
      duplicate: true,
    });
  }

  try {
    let payout: { id: string } | unknown;
    const methods = await listPayoutMethods(user.id);
    const savedMethod = body.methodId
      ? methods.find((item: { id: string }) => item.id === body.methodId)
      : null;

    const rawMethod = body.payoutMethod ?? body.method ?? "";
    const canonicalMethod = normalizeWalletWithdrawalMethod(rawMethod);

    if (savedMethod && !canonicalMethod) {
      const savedCanonical = normalizeWalletWithdrawalMethod(
        String((savedMethod as { method?: string }).method ?? ""),
      );
      if (!savedCanonical) {
        return NextResponse.json(
          { error: "This payout method is no longer available for withdrawals" },
          { status: 400 },
        );
      }
      payout = await requestWithdrawal({
        userId: user.id,
        amount,
        methodId: savedMethod.id,
      });
    } else if (canonicalMethod) {
      let validatedAccount: string;
      let display = "";
      let feeQuote = calculateWithdrawalFee(canonicalMethod, amount);

      if (body.destination && typeof body.destination === "object") {
        const structured = validateWithdrawalDestinationDetails(
          canonicalMethod,
          { ...body.destination, method: canonicalMethod },
        );
        if (!structured.ok) {
          return NextResponse.json({ error: structured.error }, { status: 400 });
        }
        validatedAccount = structured.account;
        display = structured.display;
      } else {
        const accountRaw = String(body.payoutAccount ?? "").trim();
        const validated = validateWithdrawalDestination(canonicalMethod, accountRaw);
        if (!validated.ok) {
          return NextResponse.json({ error: validated.error }, { status: 400 });
        }
        validatedAccount = validated.account;
        display = formatStoredPayoutAccount(canonicalMethod, validatedAccount);
      }

      if (feeQuote.netAmount <= 0) {
        return NextResponse.json(
          { error: "Amount is too small after the Jimvio withdrawal fee" },
          { status: 400 },
        );
      }

      const dbMethod = toCreatorPayoutDbMethod(canonicalMethod);

      let reserved = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const fresh = await ensureWallet(user.id, db);
        const avail = Number(fresh.available_balance ?? 0);
        const pend = Number(fresh.pending_balance ?? 0);
        if (avail < amount) {
          return NextResponse.json({ error: "Insufficient available balance" }, { status: 400 });
        }
        const { data: updated } = await db
          .from("wallets")
          .update({
            available_balance: avail - amount,
            pending_balance: pend + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("available_balance", avail)
          .select("user_id")
          .maybeSingle();
        if (updated) {
          reserved = true;
          break;
        }
      }
      if (!reserved) {
        return NextResponse.json(
          { error: "Could not reserve funds. Please retry." },
          { status: 409 },
        );
      }

      // Recompute fee server-side immediately before insert (never trust client).
      feeQuote = calculateWithdrawalFee(canonicalMethod, amount);

      const { data: inserted, error: insertError } = await db
        .from("payouts")
        .insert({
          user_id: user.id,
          type: "wallet_withdrawal",
          amount,
          fee: feeQuote.fee,
          net_amount: feeQuote.netAmount,
          currency: PLATFORM_CURRENCY,
          status: "pending",
          payout_method: dbMethod,
          payout_account: validatedAccount,
          notes: `Wallet OS withdrawal · ${walletWithdrawalMethodLabel(canonicalMethod)} · ${display} · ${feeQuote.label} $${feeQuote.fee.toFixed(2)} · ${withdrawalProcessingEstimate(canonicalMethod)}`,
          provider_reference: idemp,
        })
        .select()
        .single();
      if (insertError) {
        const fresh = await ensureWallet(user.id, db);
        await db
          .from("wallets")
          .update({
            available_balance: Number(fresh.available_balance ?? 0) + amount,
            pending_balance: Math.max(0, Number(fresh.pending_balance ?? 0) - amount),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
        throw insertError;
      }

      payout = inserted;
    } else if (!body.methodId) {
      const defaultMethod = methods.find(
        (item: { is_default: boolean; method?: string }) =>
          item.is_default && normalizeWalletWithdrawalMethod(item.method),
      );
      if (defaultMethod) {
        payout = await requestWithdrawal({
          userId: user.id,
          amount,
          methodId: defaultMethod.id,
        });
      } else {
        return NextResponse.json(
          {
            error:
              "Choose a payout method and enter destination details",
          },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Choose a supported payout method" },
        { status: 400 },
      );
    }

    await db.from("transactions").insert({
      user_id: user.id,
      type: "wallet_withdrawal",
      amount: -amount,
      currency: PLATFORM_CURRENCY,
      status: "pending",
      reference: idemp,
      description: "Withdrawal requested",
      metadata: { payout },
    });

    await syncAffiliatePaidOnWithdrawal(db, { userId: user.id, amount });

    await logWalletActivity({
      userId: user.id,
      action: "withdrawal_requested",
      surface: "withdrawals",
      amount,
      currency: PLATFORM_CURRENCY,
      metadata: { payout },
      db,
    });

    return NextResponse.json({ payout, duplicate: false });
  } catch (err) {
    console.error("POST /api/wallet/os/withdrawals failed", {
      message: err instanceof Error ? err.message : String(err),
      userId: user.id,
    });
    return NextResponse.json({ error: safeWithdrawalError(err) }, { status: 400 });
  }
}
