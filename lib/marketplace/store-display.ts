/** Customer-facing store follower count: social-proof baseline, never below real follows. */
export function storefrontFollowerCount(vendor: {
  follower_count?: number | null;
  display_follower_count?: number | null;
} | null | undefined): number {
  const real = Math.max(0, Number(vendor?.follower_count ?? 0) || 0);
  const display = Math.max(0, Number(vendor?.display_follower_count ?? 0) || 0);
  return Math.max(real, display);
}

export function formatFollowerCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count >= 1000) {
    const compact = count / 1000;
    const text = compact >= 10 ? compact.toFixed(0) : compact.toFixed(1);
    return `${text.replace(/\.0$/, "")}K`;
  }
  return count.toLocaleString();
}

export function formatFollowersLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "No followers yet";
  return `${formatFollowerCount(count)} Followers`;
}
