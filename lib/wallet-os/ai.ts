import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getWalletOsOverview } from "@/lib/wallet-os/overview";
import { getWalletOsAnalytics } from "@/lib/wallet-os/analytics";
import { surfaceLabel } from "@/lib/wallet-os/surfaces";
import type { WalletAiInsights, WalletSurface } from "@/lib/wallet-os/types";

const CORE_SURFACES: WalletSurface[] = ["marketplace", "affiliate", "ugc", "community"];

/**
 * Deterministic (non-LLM) heuristics over the overview + analytics snapshot.
 * Computes and persists to `wallet_ai_insights` so reads are cheap.
 */
export async function computeWalletAiInsights(userId: string): Promise<WalletAiInsights> {
  const db = createServiceRoleClient();
  const [overview, analytics] = await Promise.all([
    getWalletOsOverview(userId),
    getWalletOsAnalytics(userId),
  ]);

  const { data: pendingPayouts } = await db
    .from("payouts")
    .select("amount, currency, status, created_at, release_date")
    .eq("user_id", userId)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false })
    .limit(5);

  const revenueInsights: string[] = [];
  const savingsRecommendations: string[] = [];
  const earningOpportunities: string[] = [];
  const upcomingPayouts: string[] = [];
  const fundingReminders: string[] = [];

  const top = analytics.topModules[0];
  if (top) {
    revenueInsights.push(
      `${surfaceLabel(top.surface)} is your top earner, contributing ${top.share}% of tracked revenue (${top.total.toFixed(2)} ${analytics.currency}).`,
    );
  } else {
    revenueInsights.push("No revenue recorded yet — earnings will appear here once transactions start flowing in.");
  }

  if (overview.period.weekly > 0 && overview.period.monthly > 0) {
    const weeklyPace = overview.period.weekly * 4.3;
    const trend = weeklyPace > overview.period.monthly ? "accelerating" : "steady";
    revenueInsights.push(
      `The last 7 days brought in ${overview.period.weekly.toFixed(2)} ${overview.currency}, a ${trend} pace versus the past 30 days (${overview.period.monthly.toFixed(2)} ${overview.currency}).`,
    );
  }

  if (overview.locked > 0) {
    savingsRecommendations.push(
      `${overview.locked.toFixed(2)} ${overview.currency} is currently locked — check pending disputes or holds that may release these funds soon.`,
    );
  }
  if (analytics.withdrawals.count > 3) {
    savingsRecommendations.push("You're withdrawing frequently — consolidating withdrawals can reduce processing fees over time.");
  }
  if (overview.totalEarned > 0 && overview.available > overview.totalEarned * 0.5) {
    savingsRecommendations.push(
      "A large share of your earnings is sitting idle in available balance — consider reinvesting in ads or campaigns to grow faster.",
    );
  }
  if (!savingsRecommendations.length) {
    savingsRecommendations.push("Your balances look well managed — no immediate savings actions needed.");
  }

  const activeSurfaces = new Set(analytics.revenueByModule.map((row) => row.surface));
  const zeroModules = CORE_SURFACES.filter((surface) => !activeSurfaces.has(surface));
  for (const surface of zeroModules.slice(0, 2)) {
    earningOpportunities.push(`You have no earnings yet from ${surfaceLabel(surface)} — explore this surface to diversify income.`);
  }
  if (overview.escrowFromUgc > 0) {
    earningOpportunities.push(
      `You have ${overview.escrowFromUgc.toFixed(2)} ${overview.currency} in UGC escrow — funds will release as campaigns complete.`,
    );
  }
  if (!earningOpportunities.length) {
    earningOpportunities.push("You're earning across most surfaces — keep up the momentum.");
  }

  for (const payout of pendingPayouts ?? []) {
    const amount = Number(payout.amount ?? 0);
    const when = payout.release_date ? new Date(payout.release_date).toLocaleDateString() : "soon";
    upcomingPayouts.push(`${amount.toFixed(2)} ${payout.currency ?? overview.currency} scheduled to release ${when}.`);
  }
  if (!upcomingPayouts.length) {
    upcomingPayouts.push("No payouts currently in progress.");
  }

  if (overview.available < 10 && overview.pending === 0) {
    fundingReminders.push("Your available balance is low — top up your wallet or wait for pending earnings to clear.");
  }
  if (overview.pending > 0) {
    fundingReminders.push(
      `${overview.pending.toFixed(2)} ${overview.currency} is pending — it will move to available balance once processing completes.`,
    );
  }
  if (!fundingReminders.length) {
    fundingReminders.push("No funding action needed right now.");
  }

  const financialSummary = `You hold ${overview.available.toFixed(2)} ${overview.currency} available, ${overview.pending.toFixed(2)} pending, and ${overview.escrow.toFixed(2)} in escrow, with ${overview.totalEarned.toFixed(2)} earned lifetime.`;

  const insights: WalletAiInsights = {
    revenueInsights,
    savingsRecommendations,
    earningOpportunities,
    upcomingPayouts,
    fundingReminders,
    financialSummary,
    computedAt: new Date().toISOString(),
  };

  await db.from("wallet_ai_insights").upsert(
    {
      user_id: userId,
      revenue_insights: insights.revenueInsights,
      savings_recommendations: insights.savingsRecommendations,
      earning_opportunities: insights.earningOpportunities,
      upcoming_payouts: insights.upcomingPayouts,
      funding_reminders: insights.fundingReminders,
      financial_summary: insights.financialSummary,
      raw: { overview, analytics },
      computed_at: insights.computedAt,
    },
    { onConflict: "user_id" },
  );

  return insights;
}

/** Reads the last cached insight snapshot without recomputing. Returns null if never computed. */
export async function getCachedWalletAiInsights(userId: string): Promise<WalletAiInsights | null> {
  const db = createServiceRoleClient();
  const { data } = await db.from("wallet_ai_insights").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;

  return {
    revenueInsights: data.revenue_insights ?? [],
    savingsRecommendations: data.savings_recommendations ?? [],
    earningOpportunities: data.earning_opportunities ?? [],
    upcomingPayouts: data.upcoming_payouts ?? [],
    fundingReminders: data.funding_reminders ?? [],
    financialSummary: data.financial_summary ?? "",
    computedAt: data.computed_at ? String(data.computed_at) : new Date().toISOString(),
  };
}
