/**
 * Community join visibility — single source of truth for public / private / invite-only.
 * Never trust a client-supplied visibility or owner_id.
 */

export type CommunityJoinVisibility =
  | "public"
  | "private"
  | "invite_only"
  | "hidden";

export type CommunityJoinPolicyInput = {
  is_active?: boolean | null;
  is_free?: boolean | null;
  is_private?: boolean | null;
  visibility?: string | null;
  visibility_mode?: string | null;
  archived_at?: string | null;
};

const VISIBILITY_VALUES = new Set<CommunityJoinVisibility>([
  "public",
  "private",
  "invite_only",
  "hidden",
]);

export function resolveCommunityJoinVisibility(
  community: CommunityJoinPolicyInput
): CommunityJoinVisibility {
  const mode = String(
    community.visibility_mode || community.visibility || ""
  )
    .toLowerCase()
    .trim();
  if (VISIBILITY_VALUES.has(mode as CommunityJoinVisibility)) {
    if (mode === "public" && community.is_private === true) return "private";
    return mode as CommunityJoinVisibility;
  }
  return community.is_private === true ? "private" : "public";
}

export function communityAcceptsInstantJoin(
  community: CommunityJoinPolicyInput
): boolean {
  if (community.is_active === false) return false;
  if (community.archived_at) return false;
  return resolveCommunityJoinVisibility(community) === "public";
}

export function communityRequiresInvite(
  community: CommunityJoinPolicyInput
): boolean {
  const visibility = resolveCommunityJoinVisibility(community);
  return visibility === "invite_only" || visibility === "hidden";
}

export function communityRequiresApproval(
  community: CommunityJoinPolicyInput
): boolean {
  return resolveCommunityJoinVisibility(community) === "private";
}

/** Public catalog/feed: active, not archived, visibility public. Never invite-only/hidden/private. */
export function communityIsPubliclyDiscoverable(
  community: CommunityJoinPolicyInput
): boolean {
  if (community.is_active === false) return false;
  if (community.archived_at) return false;
  return resolveCommunityJoinVisibility(community) === "public";
}

export function sanitizeInviteCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, 64);
}
