/**
 * Merge server comment pages with local/optimistic state.
 * Never replace a non-empty local list with a stale empty server payload.
 */

export type MergeableComment = {
  id: string;
  created_at?: string;
  [key: string]: unknown;
};

export function mergeCommentLists<T extends MergeableComment>(
  prev: T[],
  server: T[]
): T[] {
  const byId = new Map<string, T>();

  for (const row of server) {
    if (row?.id) byId.set(String(row.id), row);
  }

  for (const row of prev) {
    if (!row?.id) continue;
    const id = String(row.id);
    if (byId.has(id)) continue;
    // Keep optimistic rows and any local canonical rows missing from this
    // response (covers POST→stale GET race that returns []).
    byId.set(id, row);
  }

  return Array.from(byId.values());
}

export function isCommentLoadAuthoritativeEmpty(
  prev: MergeableComment[],
  server: MergeableComment[]
): boolean {
  return server.length === 0 && prev.length === 0;
}
