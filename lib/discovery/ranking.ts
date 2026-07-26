/** Shared relevance ranking for discovery hits. */

export function textRelevanceScore(
  query: string,
  title: string,
  subtitle?: string | null,
  tags?: string[] | null
): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const t = (title ?? "").toLowerCase();
  const s = (subtitle ?? "").toLowerCase();
  let score = 0;
  if (t === q) score += 100;
  else if (t.startsWith(q)) score += 85;
  else if (t.includes(q)) score += 70;
  else {
    const words = q.split(/\s+/).filter(Boolean);
    const hit = words.filter((w) => t.includes(w)).length;
    score += hit * 18;
  }
  if (s.includes(q)) score += 20;
  if (tags?.some((tag) => tag.toLowerCase().includes(q))) score += 15;
  return score;
}

export function engagementBoost(opts: {
  views?: number | null;
  sales?: number | null;
  members?: number | null;
  followers?: number | null;
  featured?: boolean | null;
}): number {
  let boost = 0;
  if (opts.featured) boost += 25;
  boost += Math.min(20, Math.log10(Math.max(1, Number(opts.views ?? 0) + 1)) * 8);
  boost += Math.min(20, Math.log10(Math.max(1, Number(opts.sales ?? 0) + 1)) * 10);
  boost += Math.min(15, Math.log10(Math.max(1, Number(opts.members ?? 0) + 1)) * 6);
  boost += Math.min(15, Math.log10(Math.max(1, Number(opts.followers ?? 0) + 1)) * 6);
  return boost;
}

export function freshnessBoost(iso?: string | null): number {
  if (!iso) return 0;
  const ageMs = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0;
  const days = ageMs / 86_400_000;
  if (days < 1) return 18;
  if (days < 7) return 12;
  if (days < 30) return 6;
  return 0;
}

export function combineScore(parts: {
  relevance: number;
  engagement?: number;
  freshness?: number;
}): number {
  return Number(
    (
      parts.relevance +
      (parts.engagement ?? 0) +
      (parts.freshness ?? 0)
    ).toFixed(2)
  );
}
