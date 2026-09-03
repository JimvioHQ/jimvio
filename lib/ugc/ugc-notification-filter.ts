const EXCLUDE =
  /\b(order received|new member|community activity|marketplace|shop order|cart|project created)\b/i;

const INCLUDE =
  /\b(campaign|ugc|clipping|submission|creator applied|creator joined|creator invited|application|funding|escrow|content deadline)\b/i;

export function isUgcCampaignNotification(input: {
  category?: string | null;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  actionUrl?: string | null;
}): boolean {
  const action = input.actionUrl ?? "";
  if (action.startsWith("/ugc") || action.includes("/ugc/")) return true;
  if (input.category === "campaign_update") return true;

  const hay = `${input.category ?? ""} ${input.type ?? ""} ${input.title ?? ""} ${input.message ?? ""} ${action}`.toLowerCase();
  if (EXCLUDE.test(hay)) return false;
  return INCLUDE.test(hay);
}
