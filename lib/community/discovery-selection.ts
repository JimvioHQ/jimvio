import { readCommunityEditorialOrigin } from "@/lib/community/editorial-origin";
import { PRIORITY_TRENDING_COMMUNITY_SLUGS } from "@/lib/community/discovery-priorities";
import { resolveCommunityMemberCount } from "@/lib/community/member-count";

/**
 * Shared ranking for Featured / Trending discovery surfaces.
 * Uses real member_count + media completeness. Never invents stats.
 */

export type DiscoverableCommunity = {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  category?: string | null;
  member_count?: number | null;
  post_count?: number | null;
  is_featured?: boolean | null;
  is_free?: boolean | null;
  monthly_price?: number | string | null;
  currency?: string | null;
  avatar_url?: string | null;
  cover_image?: string | null;
  settings?: unknown;
};

function hasMedia(row: DiscoverableCommunity): boolean {
  return Boolean(row.avatar_url?.trim() || row.cover_image?.trim());
}

function isPaid(row: DiscoverableCommunity): boolean {
  if (row.is_free === false) return true;
  const price = Number(row.monthly_price);
  return Number.isFinite(price) && price > 0;
}

export function discoveryRankScore(row: DiscoverableCommunity): number {
  const members = resolveCommunityMemberCount(row);
  const posts = Math.max(0, Number(row.post_count ?? 0) || 0);
  const featured = row.is_featured ? 12 : 0;
  const media = hasMedia(row) ? 6 : 0;
  const paid = isPaid(row) ? 2 : 0;
  const priority = PRIORITY_TRENDING_COMMUNITY_SLUGS.includes(row.slug) ? 40 : 0;
  return (
    priority +
    featured +
    media +
    paid +
    Math.log1p(members) * 4 +
    Math.log1p(posts) * 2
  );
}

/**
 * Select a polished discovery set:
 * - Always pin priority slugs first when present
 * - Prefer media-complete communities
 * - Ensure at least one genuine paid community when available
 * - Deduplicate by id/slug
 */
export function selectDiscoveryCommunities<T extends DiscoverableCommunity>(
  rows: T[],
  limit = 8
): T[] {
  if (!rows.length || limit <= 0) return [];

  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const selected: T[] = [];
  const seen = new Set<string>();

  const push = (row: T | undefined) => {
    if (!row || seen.has(row.id) || selected.length >= limit) return;
    seen.add(row.id);
    selected.push(row);
  };

  for (const slug of PRIORITY_TRENDING_COMMUNITY_SLUGS) {
    push(bySlug.get(slug));
  }

  const ranked = [...rows].sort((a, b) => {
    const score = discoveryRankScore(b) - discoveryRankScore(a);
    if (score !== 0) return score;
    return resolveCommunityMemberCount(b) - resolveCommunityMemberCount(a);
  });

  for (const row of ranked) push(row);

  // Guarantee a paid community is visible when one exists in the candidate pool.
  const hasPaid = selected.some(isPaid);
  if (!hasPaid) {
    const paid = ranked.find((row) => isPaid(row) && !seen.has(row.id));
    if (paid) {
      if (selected.length >= limit) selected.pop();
      selected.push(paid);
    }
  }

  return selected.slice(0, limit);
}

/** Whether a community is Jimvio editorial programming (still real DB rows). */
export function isEditorialCommunity(row: { settings?: unknown }): boolean {
  return readCommunityEditorialOrigin(row.settings) === "editorial";
}
