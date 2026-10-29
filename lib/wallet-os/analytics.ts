import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { surfaceForTransactionType, WALLET_SURFACES } from "@/lib/wallet-os/surfaces";
import type { WalletAnalytics, WalletSurface } from "@/lib/wallet-os/types";
import { WITHDRAWALS_ONLY_FILTER } from "@/lib/wallet-os/payout-kinds";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS_IN_SERIES = 12;

function startOfWeekUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

async function sumUgcPayoutsAllTime(db: ServiceClient, userId: string, sinceIso: string): Promise<number> {
  try {
    const { data: influencer } = await db.from("influencers").select("id").eq("user_id", userId).maybeSingle();
    if (!influencer?.id) return 0;
    const { data } = await db
      .from("ugc_payouts")
      .select("amount, created_at")
      .eq("influencer_id", influencer.id)
      .eq("status", "paid")
      .gte("created_at", sinceIso);
    return (data ?? []).reduce((sum: number, row: { amount: number | string }) => sum + Number(row.amount ?? 0), 0);
  } catch {
    return 0;
  }
}

async function sumRewardsAllTime(db: ServiceClient, userId: string, sinceIso: string): Promise<number> {
  try {
    const { data } = await db
      .from("wallet_rewards")
      .select("amount, created_at")
      .eq("user_id", userId)
      .eq("status", "credited")
      .gte("created_at", sinceIso);
    return (data ?? []).reduce((sum: number, row: { amount: number | string }) => sum + Number(row.amount ?? 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Revenue-by-module, income/expense series, and withdrawal totals — derived
 * entirely from reads (`transactions`, `payouts`, `ugc_payouts`,
 * `wallet_rewards`). No writes.
 */
export async function getWalletOsAnalytics(userId: string): Promise<WalletAnalytics> {
  const db = createServiceRoleClient();
  const { data: walletRow } = await db.from("wallets").select("currency").eq("user_id", userId).maybeSingle();
  const currency = walletRow?.currency ?? "USD";

  const sinceIso = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const seriesStartIso = startOfWeekUtc(new Date(Date.now() - (WEEKS_IN_SERIES - 1) * WEEK_MS)).toISOString();

  const [{ data: txRows }, ugcPaidTotal, rewardsTotal, { data: payoutRows }] = await Promise.all([
    db
      .from("transactions")
      .select("type, amount, created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .limit(3000),
    sumUgcPayoutsAllTime(db, userId, sinceIso),
    sumRewardsAllTime(db, userId, sinceIso),
    db
      .from("payouts")
      .select("amount, net_amount, status, created_at")
      .eq("user_id", userId)
      .or(WITHDRAWALS_ONLY_FILTER)
      .gte("created_at", sinceIso)
      .limit(2000),
  ]);

  const transactions = txRows ?? [];
  const payouts = payoutRows ?? [];

  const revenueMap = new Map<WalletSurface, number>();
  const addRevenue = (surface: WalletSurface, amount: number) => {
    if (amount <= 0) return;
    revenueMap.set(surface, (revenueMap.get(surface) ?? 0) + amount);
  };

  for (const row of transactions) {
    const amount = Number(row.amount ?? 0);
    if (amount > 0) addRevenue(surfaceForTransactionType(row.type), amount);
  }
  addRevenue("ugc", ugcPaidTotal);
  addRevenue("rewards", rewardsTotal);

  const totalRevenue = [...revenueMap.values()].reduce((sum, value) => sum + value, 0) || 1;
  const revenueByModule = WALLET_SURFACES.map((surface) => {
    const total = Math.round((revenueMap.get(surface) ?? 0) * 100) / 100;
    return { surface, total, share: Math.round((total / totalRevenue) * 1000) / 10 };
  })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  const topModules = revenueByModule.slice(0, 5);

  const weeks: Array<{ weekStart: string; income: number; expense: number }> = [];
  for (let i = WEEKS_IN_SERIES - 1; i >= 0; i--) {
    weeks.push({ weekStart: startOfWeekUtc(new Date(Date.now() - i * WEEK_MS)).toISOString(), income: 0, expense: 0 });
  }
  const weekIndexByStart = new Map(weeks.map((week, idx) => [week.weekStart, idx]));
  const bucketWeek = (dateIso: string) => startOfWeekUtc(new Date(dateIso)).toISOString();

  for (const row of transactions) {
    const created = row.created_at ? String(row.created_at) : null;
    if (!created || created < seriesStartIso) continue;
    const idx = weekIndexByStart.get(bucketWeek(created));
    if (idx === undefined) continue;
    const amount = Number(row.amount ?? 0);
    if (amount >= 0) weeks[idx].income += amount;
    else weeks[idx].expense += Math.abs(amount);
  }
  for (const row of payouts) {
    const created = row.created_at ? String(row.created_at) : null;
    if (!created || created < seriesStartIso) continue;
    const idx = weekIndexByStart.get(bucketWeek(created));
    if (idx === undefined) continue;
    weeks[idx].expense += Number(row.net_amount ?? row.amount ?? 0);
  }

  const series = weeks.map((week) => ({
    weekStart: week.weekStart,
    income: Math.round(week.income * 100) / 100,
    expense: Math.round(week.expense * 100) / 100,
    net: Math.round((week.income - week.expense) * 100) / 100,
  }));

  const totalRequested = payouts.reduce((sum: number, row: { amount: number | string }) => sum + Number(row.amount ?? 0), 0);
  const totalPaid = payouts
    .filter((row: { status: string | null }) => row.status === "paid")
    .reduce((sum: number, row: { amount: number | string; net_amount: number | string | null }) => sum + Number(row.net_amount ?? row.amount ?? 0), 0);
  const totalPending = payouts
    .filter((row: { status: string | null }) => row.status === "pending" || row.status === "processing")
    .reduce((sum: number, row: { amount: number | string }) => sum + Number(row.amount ?? 0), 0);

  return {
    currency,
    revenueByModule,
    topModules,
    series,
    withdrawals: {
      totalRequested: Math.round(totalRequested * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      count: payouts.length,
    },
  };
}
