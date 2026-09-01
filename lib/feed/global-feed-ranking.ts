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
 * Quality-first ordering with deterministic 3-hour community mix rotation.
 * Stable within a rotation bucket for offset pagination.
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

  scored.sort((a, b) => b.quality - a.quality || a.index - b.index);

  const highQualityCutoff = Math.max(3, Math.min(8, Math.ceil(scored.length * 0.04)));
  const head = scored.slice(0, highQualityCutoff).map((s) => s.item);
  const tailScored = scored.slice(highQualityCutoff);

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
