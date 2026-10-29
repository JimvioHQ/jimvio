import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";

/**
 * Adds the public funding summary and platform-verified view totals to board
 * rows. Raw escrow rows (payment refs, depositors) never leave the server.
 */
export async function attachPublicFunding<T extends Record<string, unknown>>(
  db: SupabaseClient,
  rows: T[],
): Promise<T[]> {
  const ids = rows.map((r) => String(r.id ?? "")).filter(Boolean);
  if (ids.length === 0) return rows;
  const [escrowRes, viewsRes] = await Promise.all([
    db
      .from("ugc_campaign_escrow")
      .select("campaign_id, status, amount, currency, refunded_amount")
      .in("campaign_id", ids),
    db
      .from("ugc_submissions")
      .select("campaign_id, verified_views")
      .in("campaign_id", ids)
      .eq("verification_status", "verified")
      .neq("status", "rejected"),
  ]);
  const escrowBy = new Map<string, EscrowRow[]>();
  for (const row of (escrowRes.data ?? []) as (EscrowRow & { campaign_id: string })[]) {
    const list = escrowBy.get(row.campaign_id) ?? [];
    list.push(row);
    escrowBy.set(row.campaign_id, list);
  }
  const viewsBy = new Map<string, number>();
  for (const row of (viewsRes.data ?? []) as { campaign_id: string; verified_views: number | null }[]) {
    viewsBy.set(row.campaign_id, (viewsBy.get(row.campaign_id) ?? 0) + Number(row.verified_views ?? 0));
  }
  return rows.map((row) => {
    const id = String(row.id ?? "");
    const f = campaignFunding({
      escrow: escrowBy.get(id) ?? [],
      totalBudget: row.total_budget as number | null,
      spentBudget: row.spent_budget as number | null,
    });
    return {
      ...row,
      funding: { state: f.state, coveragePct: f.coveragePct, remainingUsd: f.remainingUsd },
      verified_views_total: viewsBy.get(id) ?? 0,
    };
  });
}
