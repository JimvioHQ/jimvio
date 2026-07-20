type RankableFeedItem = {
  created_at?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  view_count?: number | null;
  is_pinned?: boolean | null;
};

export function feedScore(item: RankableFeedItem, now = Date.now()): number {
  const createdAt = item.created_at ? new Date(item.created_at).getTime() : now;
  const ageHours = Math.max(0, (now - createdAt) / 3_600_000);
  const recency = Math.max(0, 72 - ageHours) / 72;
  const engagement =
    Math.log1p(Math.max(0, item.like_count ?? 0)) * 2 +
    Math.log1p(Math.max(0, item.comment_count ?? 0)) * 3 +
    Math.log1p(Math.max(0, item.view_count ?? 0)) * 0.25;
  return (item.is_pinned ? 10_000 : 0) + recency * 10 + engagement;
}

/** Stable, client-safe ranking for feed rows with optional engagement fields. */
export function rankFeedItems<T extends RankableFeedItem>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index, score: feedScore(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}
