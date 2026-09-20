/**
 * Community & Space member counts — single source of truth for display.
 *
 * Community display uses communities.member_count (authoritative roster cache).
 * Space display:
 *   Free/inherit/public Spaces share community membership (no separate roster).
 *   Paid/private Spaces use spaces.member_count only.
 *
 * Never fabricate members, showcase floors, or hardcoded UI counts.
 */

export type CommunityMemberCountSource = {
  slug?: string | null;
  member_count?: number | null;
  memberCount?: number | null;
  settings?: unknown;
};

export type SpaceMemberCountSource = {
  access_type?: string | null;
  accessType?: string | null;
  member_count?: number | null;
  memberCount?: number | null;
};

/** @deprecated Empty — showcase floors removed for honest production counts. */
export const SHOWCASE_COMMUNITY_MEMBER_COUNTS: Readonly<Record<string, number>> =
  Object.freeze({});

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function normalizeMemberCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return 0;
}

/** @deprecated Settings display floors are no longer applied to public counts. */
export function readDisplayMemberCount(settings: unknown): number | null {
  const root = asRecord(settings);
  if (!root) return null;
  const raw =
    root.display_member_count ??
    root.displayMemberCount ??
    asRecord(root.stats)?.display_member_count ??
    asRecord(root.stats)?.displayMemberCount;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return null;
}

export function resolveCommunityMemberCount(
  source: CommunityMemberCountSource | null | undefined
): number {
  if (!source) return 0;
  return normalizeMemberCount(source.member_count ?? source.memberCount);
}

/**
 * Free / inherit / public Spaces inherit the community roster.
 * Paid / private / premium Spaces keep an independent access count.
 */
export function spaceInheritsCommunityMembership(
  accessType: string | null | undefined
): boolean {
  const t = (accessType ?? "free").toLowerCase().trim();
  return (
    t === "" ||
    t === "free" ||
    t === "inherit" ||
    t === "public" ||
    t === "open"
  );
}

export function resolveSpaceMemberCount(
  space: SpaceMemberCountSource | null | undefined,
  communityMemberCount: number
): number {
  const spaceCount = normalizeMemberCount(
    space?.member_count ?? space?.memberCount
  );
  const access = space?.access_type ?? space?.accessType;
  if (spaceInheritsCommunityMembership(access)) {
    return communityMemberCount > 0 ? communityMemberCount : spaceCount;
  }
  return spaceCount;
}

export function formatCommunityMemberCount(count: number): string {
  return normalizeMemberCount(count).toLocaleString();
}

export function formatCompactMemberCount(count: number): string {
  const n = normalizeMemberCount(count);
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toLocaleString();
}

/** Grammar-correct member label: "1 member" / "842 members". */
export function formatMemberCountLabel(
  count: number,
  opts?: { compact?: boolean }
): string {
  const n = normalizeMemberCount(count);
  const formatted = opts?.compact
    ? formatCompactMemberCount(n)
    : n.toLocaleString();
  return n === 1 ? `${formatted} member` : `${formatted} members`;
}
