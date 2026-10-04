import {
  feedScore,
  rankFeedItems,
  type RankableFeedItem,
  type RankContext,
} from "@/lib/growth/feed-ranking";

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function communityRotationOrder(communityIds: string[], bucket: number): string[] {
  return [...communityIds].sort((a, b) => {
    const ha = hash32(`${bucket}:${a}`);
    const hb = hash32(`${bucket}:${b}`);
    return ha - hb;
  });
}

/**
 * Quality-first ordering with deterministic community mix rotation.
 * Stable within a session seed (cursor bucket) for offset pagination.
 * Fresh feed loads mint a new seed so re-entry/refresh can surface a
 * different eligible mix without permanently pinning any post.
 */
export function rankGlobalFeedItems<T extends RankableFeedItem & { community_id?: string | null; id?: string }>(
  items: T[],
  ctx: RankContext & { bucket: number },
): T[] {
  const deduped = rankFeedItems(items, ctx);

  const scored = deduped.map((item, index) => ({
    item,
    index,
    quality: feedScore(item, ctx),
    communityId: item.community_id ?? "",
  }));

  scored.sort(
    (a, b) =>
      b.quality - a.quality ||
      a.index - b.index ||
      String(a.item.id ?? "").localeCompare(String(b.item.id ?? "")),
  );

  const highQualityCutoff = Math.max(3, Math.min(8, Math.ceil(scored.length * 0.04)));
  // Draw the head from a larger quality pool, then seed-select so fresh loads
  // are not locked to the exact same top 3–8 posts forever.
  const candidatePoolSize = Math.min(
    scored.length,
    Math.max(highQualityCutoff * 5, Math.min(40, scored.length)),
  );
  const candidates = scored.slice(0, candidatePoolSize);
  const headRows = [...candidates].sort((a, b) => {
    const ha = hash32(`${ctx.bucket}:head:${String(a.item.id ?? a.index)}`);
    const hb = hash32(`${ctx.bucket}:head:${String(b.item.id ?? b.index)}`);
    return ha - hb || b.quality - a.quality || a.index - b.index;
  }).slice(0, highQualityCutoff);

  const headIds = new Set(
    headRows.map((row) => String(row.item.id ?? `idx:${row.index}`)),
  );
  const head = headRows.map((s) => s.item);
  const tailScored = scored.filter(
    (row) => !headIds.has(String(row.item.id ?? `idx:${row.index}`)),
  );

  const byCommunity = new Map<string, typeof tailScored>();
  for (const row of tailScored) {
    const list = byCommunity.get(row.communityId) ?? [];
    list.push(row);
    byCommunity.set(row.communityId, list);
  }

  const communityIds = communityRotationOrder([...byCommunity.keys()], ctx.bucket);
  const tail: T[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const communityId of communityIds) {
      const queue = byCommunity.get(communityId);
      const next = queue?.shift();
      if (next) {
        tail.push(next.item);
        progressed = true;
      }
    }
  }

  return [...head, ...tail];
}
