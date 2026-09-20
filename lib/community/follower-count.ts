/**
 * Profile follower counts — display source of truth for Jimvio user→user follows.
 *
 * Real relationships live in `user_follows` (and `profiles.follower_count` cache).
 * Display must never invent floors, showcase inflation, or hardcoded social proof.
 *
 * NEVER confuse with community.member_count.
 */

export type ProfileFollowerCountSource = {
  username?: string | null;
  follower_count?: number | null;
  followerCount?: number | null;
  /** @deprecated Ignored — public display uses real follower_count only. */
  display_follower_count?: number | null;
  displayFollowerCount?: number | null;
  settings?: unknown;
};

/** @deprecated Empty — showcase floors removed for honest production social proof. */
export const SHOWCASE_PROFILE_FOLLOWER_COUNTS: Readonly<Record<string, number>> =
  Object.freeze({});

export function normalizeFollowerCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return 0;
}

/**
 * Customer-facing Jimvio follower count from the authoritative profile cache only.
 * Never invents user_follows rows or presentation floors.
 */
export function resolveProfileFollowerCount(
  source: ProfileFollowerCountSource | null | undefined
): number {
  if (!source) return 0;
  return normalizeFollowerCount(
    source.follower_count ?? source.followerCount
  );
}

export function formatFollowerCountLabel(
  count: number,
  opts?: { compact?: boolean }
): string {
  const n = normalizeFollowerCount(count);
  if (opts?.compact) {
    if (n >= 1_000_000) {
      const v = n / 1_000_000;
      return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (n >= 10_000) return `${Math.round(n / 1000)}K`;
    if (n >= 1000) {
      const v = n / 1000;
      return `${v.toFixed(1).replace(/\.0$/, "")}K`;
    }
  }
  const formatted = n.toLocaleString();
  return n === 1 ? `${formatted} follower` : `${formatted} followers`;
}
