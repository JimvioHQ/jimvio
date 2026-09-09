/**
 * Profile follower counts — display source of truth for Jimvio user→user follows.
 *
 * Real relationships live in `user_follows` (and `profiles.follower_count` cache).
 * Showcase usernames may raise the *displayed* floor without fabricating follow rows —
 * same pattern as community `SHOWCASE_COMMUNITY_MEMBER_COUNTS`.
 *
 * NEVER confuse with community.member_count.
 */

export type ProfileFollowerCountSource = {
  username?: string | null;
  follower_count?: number | null;
  followerCount?: number | null;
  /** Optional persisted social-proof floor (profiles.settings or future column). */
  display_follower_count?: number | null;
  displayFollowerCount?: number | null;
  settings?: unknown;
};

/**
 * Presentation floors for showcase creator profiles.
 * Do not copy these numbers into UI components — resolve through this helper.
 */
export const SHOWCASE_PROFILE_FOLLOWER_COUNTS: Readonly<Record<string, number>> = {
  p7provider: 1233,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

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

export function readDisplayFollowerCount(settings: unknown): number | null {
  const root = asRecord(settings);
  if (!root) return null;
  const raw =
    root.display_follower_count ??
    root.displayFollowerCount ??
    asRecord(root.stats)?.display_follower_count ??
    asRecord(root.stats)?.displayFollowerCount;
  if (raw == null || raw === "") return null;
  return normalizeFollowerCount(raw) || null;
}

/**
 * Customer-facing Jimvio follower count:
 * max(real follows, settings floor, showcase floor).
 * Never invents user_follows rows.
 */
export function resolveProfileFollowerCount(
  source: ProfileFollowerCountSource | null | undefined
): number {
  if (!source) return 0;
  const real = normalizeFollowerCount(
    source.follower_count ?? source.followerCount
  );
  const fromSettings =
    source.display_follower_count != null || source.displayFollowerCount != null
      ? normalizeFollowerCount(
          source.display_follower_count ?? source.displayFollowerCount
        )
      : readDisplayFollowerCount(source.settings) ?? 0;
  const slug = source.username?.toLowerCase?.()?.replace(/^@/, "") ?? null;
  const showcase =
    slug && SHOWCASE_PROFILE_FOLLOWER_COUNTS[slug] != null
      ? SHOWCASE_PROFILE_FOLLOWER_COUNTS[slug]
      : 0;
  return Math.max(real, fromSettings, showcase);
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
