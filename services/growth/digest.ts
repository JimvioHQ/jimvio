export function digestWeekKey(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function digestEventKey(now: Date): string {
  return `growth-digest:${digestWeekKey(now)}`;
}

export function weeklyDigestAllowed(stored: { email_weekly_digest?: boolean | null } | null | undefined): boolean {
  return stored?.email_weekly_digest === true;
}

export function digestCopy(summary: { communitiesOwned: number; productsListed: number; productsSold: number }): string {
  return `${summary.communitiesOwned} communities owned, ${summary.productsListed} products listed, and ${summary.productsSold} paid sales.`;
}

export function classifyDigestResult(result: { ok: boolean; skipped?: boolean; reason?: string } | null | undefined): "sent" | "duplicate" | "failed" {
  if (!result?.ok) return "failed";
  if (result.skipped || result.reason === "duplicate_event_key") return "duplicate";
  return "sent";
}
