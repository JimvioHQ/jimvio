import {
  feedScore,
  type RankableFeedItem,
  type RankContext,
} from "@/lib/growth/feed-ranking";

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Final avalanche so neighbouring seeds produce unrelated orderings.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic uniform (0, 1) for a seed + key. */
function seededUnit(seed: number, key: string): number {
  return (hash32(`${seed}:${key}`) + 0.5) / 4294967296;
}

/** Softmax temperature: lower = more quality-dominated, higher = more rotation. */
const QUALITY_TEMPERATURE = 4;
/** Every eligible post keeps a real chance to surface (never fully buried). */
const MIN_WEIGHT = 0.03;
/** Recently shown heads are strongly demoted for the next session. */
const AVOID_WEIGHT_FACTOR = 0.08;
/** Leading slots that must not repeat the previous session's head. */
export const FRESH_HEAD_SLOTS = 3;
/** Community-diversity look-ahead (author diversity searches the whole list). */
const COMMUNITY_LOOKAHEAD = 8;

type GlobalRankable = RankableFeedItem & {
  community_id?: string | null;
  id?: string;
};

export type GlobalRankContext = RankContext & {
  /** Feed session seed (stable for a session, new per fresh load). */
  bucket: number;
  /** Post ids the viewer just saw at the top of their previous feed session. */
  avoidIds?: ReadonlySet<string>;
};

function nearDuplicateKey(item: RankableFeedItem): string | null {
  if (!item.body) return null;
  return `${item.author_id ?? ""}:${item.body.trim().slice(0, 80).toLowerCase()}`;
}

/**
 * Seeded, quality-weighted ordering (Efraimidis–Spirakis weighted sampling).
 *
 * - Higher real quality (freshness, genuine engagement, follow relationship)
 *   means a higher probability of an early slot — never a fixed slot.
 * - The same seed always yields the same order, so pagination inside one feed
 *   session is stable and duplicate-free; a new session seed yields a new order.
 * - Nothing is dropped and no engagement is invented.
 */
export function seededWeightedOrder<T extends GlobalRankable>(
  items: T[],
  ctx: GlobalRankContext,
): T[] {
  if (items.length < 2) return [...items];
  const seenDupes = new Set<string>();
  const scored = items.map((item, index) => {
    const dupeKey = nearDuplicateKey(item);
    const isDupe = dupeKey != null && seenDupes.has(dupeKey);
    if (dupeKey) seenDupes.add(dupeKey);
    return {
      item,
      index,
      quality: feedScore(item, ctx) - (isDupe ? 8 : 0),
      id: String(item.id ?? `idx:${index}`),
    };
  });
  const maxQuality = Math.max(...scored.map((s) => s.quality));
  const keyed = scored.map((s) => {
    let weight = Math.max(
      MIN_WEIGHT,
      Math.exp((s.quality - maxQuality) / QUALITY_TEMPERATURE),
    );
    if (ctx.avoidIds?.has(s.id)) weight *= AVOID_WEIGHT_FACTOR;
    const u = seededUnit(ctx.bucket, s.id);
    // key = u^(1/w); compare in log space for numeric stability.
    return { ...s, key: Math.log(u) / weight };
  });
  keyed.sort((a, b) => b.key - a.key || b.quality - a.quality || a.id.localeCompare(b.id));
  return keyed.map((k) => k.item);
}

/** Keep the previous session's head out of the first slots when alternatives exist. */
export function freshenHead<T extends { id?: string }>(
  items: T[],
  avoidIds: ReadonlySet<string> | undefined,
  slots = FRESH_HEAD_SLOTS,
): T[] {
  if (!avoidIds?.size || items.length <= 1) return items;
  const head: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (head.length < slots && !avoidIds.has(String(item.id ?? ""))) head.push(item);
    else rest.push(item);
  }
  return [...head, ...rest];
}

/**
 * Strict creator diversity: never place two posts by the same author next to
 * each other while any other author's post remains; also prefers a different
 * community than the previous post within a short look-ahead. Order is
 * otherwise preserved, nothing is dropped.
 */
export function diversifyFeed<
  T extends { author_id?: string | null; community_id?: string | null },
>(posts: T[]): T[] {
  if (posts.length < 3) return posts;
  const remaining = [...posts];
  const out: T[] = [];
  const authorOf = (p: T) => String(p.author_id ?? "");
  const counts = new Map<string, number>();
  for (const p of remaining) counts.set(authorOf(p), (counts.get(authorOf(p)) ?? 0) + 1);
  const take = (index: number) => {
    const [item] = remaining.splice(index, 1);
    counts.set(authorOf(item!), (counts.get(authorOf(item!)) ?? 1) - 1);
    out.push(item!);
  };
  while (remaining.length) {
    const last = out[out.length - 1];
    const lastAuthor = last ? authorOf(last) : "";
    // Feasibility: if one author holds more than half of what is left, they
    // must take every slot they are allowed — otherwise their posts pile up
    // back-to-back at the end of the feed.
    let dominant = "";
    let dominantCount = 0;
    for (const [author, n] of counts) {
      if (author && n > dominantCount) {
        dominant = author;
        dominantCount = n;
      }
    }
    if (dominant && dominant !== lastAuthor && dominantCount > remaining.length - dominantCount) {
      take(remaining.findIndex((r) => authorOf(r) === dominant));
      continue;
    }
    if (!last) {
      take(0);
      continue;
    }
    const lastCommunity = String(last.community_id ?? "");
    let pick = -1;
    // 1) Different author AND different community, close to current position.
    const max = Math.min(COMMUNITY_LOOKAHEAD, remaining.length);
    for (let i = 0; i < max; i++) {
      const r = remaining[i]!;
      const authorOk = !lastAuthor || String(r.author_id ?? "") !== lastAuthor;
      const communityOk = !lastCommunity || String(r.community_id ?? "") !== lastCommunity;
      if (authorOk && communityOk) {
        pick = i;
        break;
      }
    }
    // 2) Different author anywhere in the remaining list.
    if (pick < 0 && lastAuthor) {
      pick = remaining.findIndex((r) => String(r.author_id ?? "") !== lastAuthor);
    }
    if (pick < 0) pick = 0;
    take(pick);
  }
  return out;
}

/**
 * Global feed ordering: seeded quality-weighted rotation, fresh head versus the
 * viewer's previous session, then strict creator / community diversity.
 * Deterministic for (items, bucket, avoidIds) so offset pagination is stable.
 */
export function rankGlobalFeedItems<T extends GlobalRankable>(
  items: T[],
  ctx: GlobalRankContext,
): T[] {
  const ordered = seededWeightedOrder(items, ctx);
  return diversifyFeed(freshenHead(ordered, ctx.avoidIds));
}
