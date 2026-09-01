/**
 * Enhanced feed ranking — freshness, engagement, relationship, spam dampening.
 */

export type RankableFeedItem = {
  id?: string;
  created_at?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  share_count?: number | null;
  view_count?: number | null;
  unique_view_count?: number | null;
  is_pinned?: boolean | null;
  author_id?: string | null;
  body?: string | null;
  reaction_counts?: Record<string, number> | null;
};

export type RankContext = {
  viewerId?: string | null;
  followedAuthorIds?: Set<string>;
  communityBoostAuthorIds?: Set<string>;
  now?: number;
};

function reactionTotal(counts?: Record<string, number> | null): number {
  if (!counts) return 0;
  return Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);
}

function looksLikeSpam(body?: string | null): boolean {
  if (!body) return false;
  const text = body.trim();
  if (text.length < 8) return false;
  const urls = (text.match(/https?:\/\//gi) ?? []).length;
  const sameChar = /(.)\1{8,}/.test(text);
  const shout = text === text.toUpperCase() && /[A-Z]{12,}/.test(text);
  return urls >= 4 || sameChar || shout;
}

export function feedScore(item: RankableFeedItem, ctx: RankContext = {}): number {
  const now = ctx.now ?? Date.now();
  const createdAt = item.created_at ? new Date(item.created_at).getTime() : now;
  const ageHours = Math.max(0, (now - createdAt) / 3_600_000);
  const freshness = Math.max(0, 72 - ageHours) / 72;

  const likes = Math.max(0, item.like_count ?? 0) + reactionTotal(item.reaction_counts);
  const comments = Math.max(0, item.comment_count ?? 0);
  const shares = Math.max(0, item.share_count ?? 0);
  const views = Math.max(0, item.unique_view_count ?? item.view_count ?? 0);

  const engagement =
    Math.log1p(likes) * 2.2 +
    Math.log1p(comments) * 3.2 +
    Math.log1p(shares) * 2.8 +
    Math.log1p(views) * 0.35;

  let relationship = 0;
  if (item.author_id && ctx.followedAuthorIds?.has(item.author_id)) relationship += 4;
  if (item.author_id && ctx.communityBoostAuthorIds?.has(item.author_id)) relationship += 2;
  if (item.author_id && ctx.viewerId && item.author_id === ctx.viewerId) relationship += 1;

  const spamPenalty = looksLikeSpam(item.body) ? 12 : 0;
  // Soft within-page nudge only — never let pins dominate a global page.
  const pin = item.is_pinned ? 0.35 : 0;

  return pin + freshness * 12 + engagement + relationship - spamPenalty;
}

export function rankFeedItems<T extends RankableFeedItem>(
  items: T[],
  ctx: RankContext = {}
): T[] {
  // Dedupe near-identical bodies from same author within window
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const item of items) {
    const key = `${item.author_id ?? ""}:${(item.body ?? "").trim().slice(0, 80).toLowerCase()}`;
    if (item.body && seen.has(key)) continue;
    if (item.body) seen.add(key);
    deduped.push(item);
  }

  return deduped
    .map((item, index) => ({ item, index, score: feedScore(item, ctx) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}
