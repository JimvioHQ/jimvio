/**
 * Legitimate tab filters for the global community feed.
 * Applied BEFORE offset pagination so cursors stay consistent and
 * Hot/Trending/Rising pages are not sparse.
 *
 * Never invents engagement — only filters on real like/comment counts
 * and real created_at timestamps already on the post row.
 */

export type FeedTabFilterPost = {
  id?: string;
  created_at?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  view_count?: number | null;
  space_id?: string | null;
  post_type?: string | null;
  community_id?: string | null;
  author_id?: string | null;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function feedTabMaxAgeMs(filter: string): number | null {
  switch (filter) {
    case "hot":
      return 48 * HOUR;
    case "rising":
      return 7 * DAY;
    case "trending":
    case "ai-picks":
      return 14 * DAY;
    default:
      return null;
  }
}

export function matchesFeedTabFilter(
  post: FeedTabFilterPost,
  filter: string,
  now = Date.now(),
): boolean {
  const maxAge = feedTabMaxAgeMs(filter);
  if (maxAge != null) {
    const created = post.created_at ? new Date(post.created_at).getTime() : 0;
    if (!Number.isFinite(created) || created < now - maxAge) return false;
    if (filter === "rising") return true;
    // Hot / Trending: require at least one real engagement signal.
    return Number(post.like_count ?? 0) >= 1 || Number(post.comment_count ?? 0) >= 1;
  }

  if (filter === "spaces") {
    return Boolean(post.space_id && post.space_id !== "00000000-0000-0000-0000-000000000000");
  }

  if (filter === "missions") {
    return ["mission", "task", "challenge"].includes(String(post.post_type ?? ""));
  }

  return true;
}

/** Filter pool in place; preserves relative order from the caller. */
export function applyFeedTabFilter<T extends FeedTabFilterPost>(
  posts: T[],
  filter: string,
  now = Date.now(),
): T[] {
  if (
    filter === "for-you" ||
    filter === "recommended" ||
    filter === "newest" ||
    filter === "following" ||
    filter === "friends"
  ) {
    return posts;
  }
  return posts.filter((post) => matchesFeedTabFilter(post, filter, now));
}

/** Rising: sort by real engagement velocity (engagement / age hours). */
export function sortRisingByVelocity<T extends FeedTabFilterPost>(
  posts: T[],
  now = Date.now(),
): T[] {
  return [...posts].sort((a, b) => {
    const age = (post: FeedTabFilterPost) =>
      Math.max(1, (now - new Date(post.created_at ?? now).getTime()) / HOUR);
    const engagement = (post: FeedTabFilterPost) =>
      Number(post.like_count ?? 0) +
      Number(post.comment_count ?? 0) * 2 +
      Number(post.view_count ?? 0) * 0.1;
    return engagement(b) / age(b) - engagement(a) / age(a);
  });
}

/**
 * Soft author diversity: avoid consecutive posts from the same author
 * when alternate posts exist nearby. Does not drop posts permanently.
 */
export function diversifyAuthors<T extends FeedTabFilterPost & { author_id?: string | null }>(
  posts: T[],
  lookAhead = 6,
): T[] {
  if (posts.length < 3) return posts;
  const remaining = [...posts];
  const out: T[] = [];
  while (remaining.length) {
    const lastAuthor = out.length ? String(out[out.length - 1]?.author_id ?? "") : "";
    let pick = 0;
    if (lastAuthor) {
      const max = Math.min(lookAhead, remaining.length);
      for (let i = 0; i < max; i++) {
        if (String(remaining[i]?.author_id ?? "") !== lastAuthor) {
          pick = i;
          break;
        }
      }
    }
    const [next] = remaining.splice(pick, 1);
    if (next) out.push(next);
  }
  return out;
}
