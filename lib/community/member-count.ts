/**
 * Community member count — single source of truth for display.
 *
 * Prefer settings.display_member_count when set (presentation metric).
 * Fall back to curated showcase counts for known public communities.
 * Real roster size remains communities.member_count for joins/leaves —
 * never fabricate auth users to inflate counts.
 */

export type CommunityMemberCountSource = {
  slug?: string | null;
  member_count?: number | null;
  memberCount?: number | null;
  settings?: unknown;
};

/**
 * Presentation counts for showcase communities.
 * Single source — do not hardcode these numbers in UI components.
 */
export const SHOWCASE_COMMUNITY_MEMBER_COUNTS: Readonly<Record<string, number>> = {
  p7provider: 842,
  quantforg: 1643,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readDisplayMemberCount(settings: unknown): number | null {
  const root = asRecord(settings);
  if (!root) return null;
  const raw =
    root.display_member_count ??
    root.displayMemberCount ??
    asRecord(root.stats)?.display_member_count ??
    asRecord(root.stats)?.displayMemberCount;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return null;
}

export function resolveCommunityMemberCount(
  source: CommunityMemberCountSource | null | undefined
): number {
  if (!source) return 0;
  const display = readDisplayMemberCount(source.settings);
  if (display != null) return display;
  const slug = source.slug?.toLowerCase?.() ?? null;
  if (slug && SHOWCASE_COMMUNITY_MEMBER_COUNTS[slug] != null) {
    return SHOWCASE_COMMUNITY_MEMBER_COUNTS[slug];
  }
  const raw = source.member_count ?? source.memberCount ?? 0;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

export function formatCommunityMemberCount(count: number): string {
  return count.toLocaleString();
}
