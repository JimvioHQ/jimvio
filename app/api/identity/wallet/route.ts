import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { getUserWalletData } from "@/lib/actions/wallet";

export const dynamic = "force-dynamic";

type WalletSurface = "marketplace" | "affiliate" | "community" | "ugc" | "other";

function surfaceForTransactionType(type: string): WalletSurface {
  if (type === "vendor_earning") return "marketplace";
  if (type === "affiliate_commission" || type === "affiliate_earning") return "affiliate";
  if (type === "community_earning") return "community";
  if (type === "ugc_earnings" || type === "ugc_earning") return "ugc";
  return "other";
}

/**
 * GET /api/identity/wallet
 * Wraps `getUserWalletData` for the authenticated user, ensuring a `wallets`
 * row exists first (inserted with zero balances if missing), then reshapes
 * the result into the flat, camelCase contract consumed by
 * `IdentityWalletClient`, using the canonical payouts ledger for UGC earnings.
 */
export async function GET() {
  const { user, db: rawDb, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const db = rawDb as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: existingWallet } = await db
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingWallet) {
    await db.from("wallets").upsert(
      {
        user_id: user.id,
        available_balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_paid: 0,
      },
      { onConflict: "user_id" }
    );
  }

  const result = await getUserWalletData();
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Failed to load wallet" }, { status: 400 });
  }

  const wallet = (result.wallet ?? {}) as {
    available_balance?: number;
    pending_balance?: number;
    total_earned?: number;
    currency?: string;
    locked_balance?: number;
    escrow_balance?: number;
    rewards_balance?: number;
  };
  const transactions = (result.transactions ?? []) as Array<{
    id: string;
    type: string;
    amount: number | string;
    currency: string | null;
    status: string;
    reference: string | null;
    created_at: string;
  }>;
  const baseAggregation = (result.aggregation ?? { vendor: 0, affiliate: 0, creator: 0, ugc: 0, other: 0 }) as {
    vendor: number;
    affiliate: number;
    creator: number;
    ugc: number;
    other: number;
  };

  return NextResponse.json({
    balance: Number(wallet.available_balance ?? 0),
    pending: Number(wallet.pending_balance ?? 0),
    totalEarned: Number(wallet.total_earned ?? 0),
    // Wallet OS additions (migration 124) — additive, does not replace the fields above.
    locked: Number(wallet.locked_balance ?? 0),
    escrow: Number(wallet.escrow_balance ?? 0),
    rewardsBalance: Number(wallet.rewards_balance ?? 0),
    currency: wallet.currency ?? "USD",
    aggregation: {
      marketplace: Number(baseAggregation.vendor ?? 0),
      affiliate: Number(baseAggregation.affiliate ?? 0),
      community: Number(baseAggregation.creator ?? 0),
      ugc: Number(baseAggregation.ugc ?? 0),
      other: Number(baseAggregation.other ?? 0),
    },
    transactions: transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      surface: surfaceForTransactionType(tx.type),
      amount: Number(tx.amount ?? 0),
      currency: tx.currency ?? wallet.currency ?? "USD",
      status: tx.status,
      reference: tx.reference,
      createdAt: tx.created_at,
    })),
    // Kept unchanged for `IdentityWalletClient` backward compat (existing "Withdraw funds" link).
    withdrawalUrl: "/wallet",
    // New Wallet OS surface — forward-looking consumers can link here instead.
    walletOsUrl: "/wallet",
  });
}
