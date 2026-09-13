export function splitHeadlineAccent(
  headline: string,
  accent?: string | null
): { lead: string; accent: string | null } {
  const full = (headline || "").trim();
  const highlight = (accent || "").trim();
  if (!full) return { lead: "", accent: null };
  if (!highlight) return { lead: full, accent: null };
  if (full.endsWith(highlight)) {
    const lead = full.slice(0, full.length - highlight.length).trim();
    return { lead: lead || full, accent: lead ? highlight : null };
  }
  if (full.includes(highlight)) {
    return { lead: full.replace(highlight, "").trim() || full, accent: highlight };
  }
  return { lead: full, accent: highlight };
}
