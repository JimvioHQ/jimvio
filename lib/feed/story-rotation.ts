/** Stable 6-hour bucket so the story strip changes without flickering on every render. */
export function storyRotationBucket(now = Date.now()): number {
  return Math.floor(now / (6 * 60 * 60 * 1000));
}

/**
 * Keep the viewer's own story first. Rotate the other authors so the same
 * small prefix is not pinned when more than one eligible author exists.
 */
export function rotateStoryAuthors<T extends { author_id: string }>(
  groups: T[],
  bucket: number,
  selfId?: string | null,
): T[] {
  const own = selfId ? groups.filter((group) => group.author_id === selfId) : [];
  const rest = groups.filter((group) => group.author_id !== selfId);
  if (rest.length < 2) return [...own, ...rest];
  const offset = Math.abs(bucket) % rest.length;
  return [...own, ...rest.slice(offset), ...rest.slice(0, offset)];
}

export function storyCommunityWindow<T>(communities: T[], bucket: number, size: number): T[] {
  if (communities.length <= size) return communities;
  const start = (Math.abs(bucket) * size) % communities.length;
  return [...communities.slice(start), ...communities.slice(0, start)].slice(0, size);
}
