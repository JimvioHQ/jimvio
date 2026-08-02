import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import type { EscrowSnapshot, WalletOsOverview } from "@/lib/wallet-os/types";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Live UGC brand escrow projection. Reads `ugc_campaigns` + `ugc_campaign_escrow`
 * (both untouched) and combines them with `wallets.escrow_balance` for display
 * only — never writes back to UGC tables.
 */
export async function getWalletOsEscrowSnapshot(userId: string, db?: ServiceClient): Promise<EscrowSnapshot> {
  const client = db ?? createServiceRoleClient();
  const wallet = await ensureWallet(userId, client);
  const walletEscrowBalance = Number(wallet.escrow_balance ?? 0);

  let ugcEscrowHeld = 0;
  const campaigns: EscrowSnapshot["campaigns"] = [];

  try {
    const { data: vendor } = await client
      .from("vendors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (vendor?.id) {
      const { data: campaignRows } = await client
        .from("ugc_campaigns")
        .select("id, title")
        .eq("brand_id", vendor.id);

      const campaignIds = (campaignRows ?? []).map((row: { id: string }) => row.id);
      const titleById = new Map<string, string>(
        (campaignRows ?? []).map((row: { id: string; title: string }) => [String(row.id), row.title]),
      );

      if (campaignIds.length) {
        const { data: escrowRows } = await client
          .from("ugc_campaign_escrow")
          .select("id, campaign_id, amount, currency, status, deposited_at")
          .in("campaign_id", campaignIds)
          .eq("status", "held");

        for (const row of escrowRows ?? []) {
          const amount = Number(row.amount ?? 0);
          ugcEscrowHeld += amount;
          campaigns.push({
            campaignId: String(row.campaign_id),
            title: titleById.get(String(row.campaign_id)) ?? "UGC campaign",
            amount,
            currency: row.currency ?? wallet.currency ?? "RWF",
            status: String(row.status ?? "held"),
            depositedAt: row.deposited_at ? String(row.deposited_at) : null,
          });
        }
      }
    }
  } catch (err) {
    console.error("getWalletOsEscrowSnapshot: ugc escrow lookup failed", err);
  }

  campaigns.sort((a, b) => (b.depositedAt ?? "").localeCompare(a.depositedAt ?? ""));

  return {
    walletEscrowBalance,
    ugcEscrowHeld: Math.round(ugcEscrowHeld * 100) / 100,
    totalEscrow: Math.round((walletEscrowBalance + ugcEscrowHeld) * 100) / 100,
    currency: wallet.currency ?? "RWF",
    campaigns,
  };
}

async function sumTransactions(client: ServiceClient, userId: string, sinceIso: string): Promise<number> {
  const { data } = await client
    .from("transactions")
    .select("amount, created_at")
    .eq("user_id", userId)
    .gte("created_at", sinceIso);

  return (data ?? []).reduce((sum: number, row: { amount: number | string }) => {
    const amount = Number(row.amount ?? 0);
    return amount > 0 ? sum + amount : sum;
  }, 0);
}

async function sumPaidUgcPayouts(client: ServiceClient, userId: string, sinceIso: string): Promise<number> {
  try {
    const { data: influencer } = await client
      .from("influencers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!influencer?.id) return 0;

    const { data } = await client
      .from("ugc_payouts")
      .select("amount, paid_at")
      .eq("influencer_id", influencer.id)
      .eq("status", "paid")
      .gte("paid_at", sinceIso);

    return (data ?? []).reduce((sum: number, row: { amount: number | string }) => sum + Number(row.amount ?? 0), 0);
  } catch (err) {
    console.error("sumPaidUgcPayouts failed", err);
    return 0;
  }
}

/**
 * Unified Wallet OS overview. Reads exclusively from `wallets` for balances
 * (source of truth, unchanged) plus `transactions` / `ugc_payouts` /
 * `ugc_campaign_escrow` for derived, display-only projections.
 */
export async function getWalletOsOverview(userId: string): Promise<WalletOsOverview> {
  const db = createServiceRoleClient();
  const wallet = await ensureWallet(userId, db);
  const escrow = await getWalletOsEscrowSnapshot(userId, db);

  const dayStart = startOfTodayIso();
  const weekStart = daysAgoIso(7);
  const monthStart = daysAgoIso(30);

  const [dailyTx, weeklyTx, monthlyTx, dailyUgc, weeklyUgc, monthlyUgc] = await Promise.all([
    sumTransactions(db, userId, dayStart),
    sumTransactions(db, userId, weekStart),
    sumTransactions(db, userId, monthStart),
    sumPaidUgcPayouts(db, userId, dayStart),
    sumPaidUgcPayouts(db, userId, weekStart),
    sumPaidUgcPayouts(db, userId, monthStart),
  ]);

  const available = Number(wallet.available_balance ?? 0);
  const pending = Number(wallet.pending_balance ?? 0);
  const locked = Number(wallet.locked_balance ?? 0);
  const rewards = Number(wallet.rewards_balance ?? 0);
  const totalEarned = Number(wallet.total_earned ?? 0);
  const totalPaid = Number(wallet.total_paid ?? 0);

  return {
    userId,
    currency: wallet.currency ?? "RWF",
    available,
    pending,
    locked,
    escrow: escrow.totalEscrow,
    escrowFromUgc: escrow.ugcEscrowHeld,
    rewards,
    totalEarned,
    totalPaid,
    netWorth: Math.round((available + pending + locked + rewards) * 100) / 100,
    period: {
      daily: Math.round((dailyTx + dailyUgc) * 100) / 100,
      weekly: Math.round((weeklyTx + weeklyUgc) * 100) / 100,
      monthly: Math.round((monthlyTx + monthlyUgc) * 100) / 100,
    },
    updatedAt: wallet.updated_at ? String(wallet.updated_at) : null,
  };
}
