/** Fields that must not change once a campaign is funded and live. */
export const LOCKED_MONEY_FIELDS = [
  "total_budget",
  "payment_model",
  "rate_per_1k_views",
  "fixed_rate",
  "max_payout_per_sub",
] as const;

const LIVE_STATUSES = new Set(["active", "paused", "completed"]);

/** Drop a client attempt to demote a non-draft campaign back to draft. */
export function stripDraftDemotion(
  currentStatus: string,
  updates: Record<string, unknown>,
): Record<string, unknown> {
  if (updates.status === "draft" && currentStatus !== "draft") {
    const next = { ...updates };
    delete next.status;
    return next;
  }
  return updates;
}

/** Escrow confirmation may activate only campaigns that are still waiting or paused. */
export function escrowMayActivateCampaign(status: string | null | undefined): boolean {
  return status === "draft" || status === "paused";
}

/** Admin-activated campaigns have no escrow row. Resume must still be allowed. */
export function mayResumeWithoutEscrow(
  currentStatus: string,
  activatedByAdmin: boolean,
): boolean {
  return currentStatus === "paused" && activatedByAdmin;
}

/** Returns the first locked money field whose value would change, or null. */
export function lockedMoneyFieldChange(
  currentStatus: string,
  campaign: Record<string, unknown>,
  updates: Record<string, unknown>,
): (typeof LOCKED_MONEY_FIELDS)[number] | null {
  if (!LIVE_STATUSES.has(currentStatus)) return null;
  for (const key of LOCKED_MONEY_FIELDS) {
    if (!(key in updates)) continue;
    const prev = campaign[key];
    const next = updates[key];
    if (key === "payment_model") {
      if (String(prev ?? "") !== String(next ?? "")) return key;
    } else if (Number(prev ?? 0) !== Number(next ?? 0)) {
      return key;
    }
  }
  return null;
}
