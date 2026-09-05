import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { getWalletSecurityStatus, verifyWalletPin } from "@/lib/wallet-os/security";
import { logWalletActivity } from "@/lib/wallet-os/activity";
import { listPayoutMethods, requestWithdrawal } from "@/services/creator-economy/payouts";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { syncAffiliatePaidOnWithdrawal } from "@/lib/affiliate/credit-wallet";
import {
  normalizeWalletWithdrawalMethod,
  toCreatorPayoutDbMethod,
  validateWithdrawalDestination,
  walletWithdrawalMethodLabel,
} from "@/lib/payments/wallet-payout-method";
import { safeWithdrawalError } from "@/lib/payments/safe-payment-error";

export const dynamic = "force-dynamic";

const MIN_WITHDRAWAL = 1;

function idempotencyKey(userId: string, amount: number, raw?: string | null) {
  if (raw && raw.trim()) return `WDR-${userId}-${raw.trim().slice(0, 64)}`;
  const bucket = Math.floor(Date.now() / 5000);
  return `WDR-${userId}-${amount}-${bucket}`;
}

/**
 * GET /api/wallet/os/withdrawals — thin read wrapper around the `payouts`
 * table (same source of truth as `/api/creator/payouts`).
 */
export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const wallet = await ensureWallet(user.id, db);

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
    withdrawals,
  });
}

/**
 * POST /api/wallet/os/withdrawals — creates a withdrawal request.
 *
 * Manual payout-request workflow: reserves balance (available → pending),
 * creates a pending payout for admin/processor confirmation.
 * Never marks paid until real confirmation.
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
    pin?: string;
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

  const security = await getWalletSecurityStatus(user.id, db);
  if (security.locked) {
    return NextResponse.json(
      {
        error: "Wallet is temporarily locked after too many failed PIN attempts",
        lockedUntil: security.lockedUntil,
      },
      { status: 423 },
    );
  }

  let requireTwoFa = false;
  if (security.pinSet) {
    if (!body.pin) {
      return NextResponse.json(
        { error: "PIN is required for withdrawals", requirePin: true },
        { status: 400 },
      );
    }
    const verification = await verifyWalletPin(user.id, String(body.pin));
    if (!verification.valid) {
      return NextResponse.json(
        {
          error: "Incorrect PIN",
          attemptsRemaining: verification.attemptsRemaining,
          locked: verification.locked,
        },
        { status: 401 },
      );
    }
  } else if (security.requireTwoFactorWithdraw) {
    requireTwoFa = true;
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
      requireTwoFa,
      duplicate: true,
    });
  }

  try {
    let payout: { id: string } | unknown;
    const methods = await listPayoutMethods(user.id);
    const savedMethod = body.methodId
      ? methods.find((item: { id: string }) => item.id === body.methodId)
      : null;

    // Prefer explicit method from the request form over a silent default.
    const rawMethod = body.payoutMethod ?? body.method ?? "";
    const canonicalMethod = normalizeWalletWithdrawalMethod(rawMethod);

    if (savedMethod && !canonicalMethod) {
      // Saved method path (creator payout center) — still reject PayPal
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
      const accountRaw = String(body.payoutAccount ?? "").trim();
      const validated = validateWithdrawalDestination(canonicalMethod, accountRaw);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
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

      const { data: inserted, error: insertError } = await db
        .from("payouts")
        .insert({
          user_id: user.id,
          type: "wallet_withdrawal",
          amount,
          fee: 0,
          net_amount: amount,
          currency: PLATFORM_CURRENCY,
          status: "pending",
          payout_method: dbMethod,
          payout_account: validated.account,
          notes: `Wallet OS withdrawal · ${walletWithdrawalMethodLabel(canonicalMethod)}`,
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
      // Fall back to default saved method (non-PayPal)
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
              "Choose a payout method and enter destination details (PayPal is not available for withdrawals)",
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

    return NextResponse.json({ payout, requireTwoFa });
  } catch (err) {
    console.error("POST /api/wallet/os/withdrawals failed", {
      message: err instanceof Error ? err.message : String(err),
      userId: user.id,
    });
    return NextResponse.json({ error: safeWithdrawalError(err) }, { status: 400 });
  }
}
