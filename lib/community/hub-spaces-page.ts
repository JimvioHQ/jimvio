import {
  pickPrimarySpaceCandidate,
  type PrimarySpaceCandidate,
} from "@/lib/community/workspace/primary-space";

/** Name and space-name matches loaded for one search. The reported total is this set. */
export const HUB_SPACES_SEARCH_MATCH_CAP = 500;

/**
 * Spaces read for a single community.
 * Featured rows are ordered first so this cap still includes the primary Space.
 */
export const HUB_SPACES_PER_COMMUNITY_LIMIT = 80;

export type NamedCommunity = {
  id: string;
  name: string;
};

export type CommunitySpaceCandidate = PrimarySpaceCandidate & {
  community_id: string;
};

export type SpaceCardIdentity = {
  id: string;
  community_id?: string | null;
  community_slug?: string | null;
};

export type SpacesPageGate = {
  aborted: boolean;
  requestQuery: string;
  currentQuery: string;
  requestGeneration: number;
  currentGeneration: number;
};

/** Union of community-name matches and space-name matches, ordered like the hub cards. */
export function mergeSearchCommunities<T extends NamedCommunity>(
  nameMatches: readonly T[],
  spaceMatches: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const community of nameMatches) {
    if (!community?.id || byId.has(community.id)) continue;
    byId.set(community.id, community);
  }
  for (const community of spaceMatches) {
    if (!community?.id || byId.has(community.id)) continue;
    byId.set(community.id, community);
  }
  return [...byId.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName !== 0 ? byName : a.id.localeCompare(b.id);
  });
}

/** Page a community list with a total and cursor that describe that same list. */
export function sliceCommunityPage<T>(
  communities: readonly T[],
  offset: number,
  limit: number,
): { page: T[]; total: number; nextOffset: number | null } {
  const start = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const size = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 1;
  const total = communities.length;
  const page = communities.slice(start, start + size);
  const nextOffset = start + size < total ? start + size : null;
  return { page, total, nextOffset };
}

function featuredRank(value: boolean | null | undefined): number {
  if (value === true) return 0;
  if (value === false) return 1;
  return 2;
}

function sortOrderRank(value: number | null | undefined): number {
  return value == null ? Number.POSITIVE_INFINITY : value;
}

/**
 * Order matches the per-community query: featured first (nulls last), then sort_order.
 * A later global sort_order cannot push another community's spaces out of this list.
 */
export function spacesWithinPerCommunityCap<T extends PrimarySpaceCandidate>(
  spaces: readonly T[],
  cap = HUB_SPACES_PER_COMMUNITY_LIMIT,
): T[] {
  const size = Number.isFinite(cap) ? Math.max(0, Math.floor(cap)) : 0;
  return [...spaces]
    .sort((a, b) => {
      const featured = featuredRank(a.is_featured) - featuredRank(b.is_featured);
      if (featured !== 0) return featured;
      const order = sortOrderRank(a.sort_order) - sortOrderRank(b.sort_order);
      if (order !== 0) return order;
      return a.id.localeCompare(b.id);
    })
    .slice(0, size);
}

/** One primary Space per community, using only that community's own rows. */
export function selectPrimarySpacesPerCommunity<T extends CommunitySpaceCandidate>(
  communityIds: readonly string[],
  spacesByCommunity: ReadonlyMap<string, readonly T[]>,
): T[] {
  const primary: T[] = [];
  for (const communityId of communityIds) {
    const list = spacesByCommunity.get(communityId);
    if (!list || list.length === 0) continue;
    const picked = pickPrimarySpaceCandidate(list);
    if (picked) primary.push(picked);
  }
  return primary;
}

export function dedupeSpaceCards<T extends SpaceCardIdentity>(spaces: readonly T[]): T[] {
  const seenIds = new Set<string>();
  const seenCommunities = new Set<string>();
  return spaces.filter((space) => {
    if (seenIds.has(space.id)) return false;
    const communityKey = space.community_id ?? space.community_slug ?? "";
    if (seenCommunities.has(communityKey)) return false;
    seenIds.add(space.id);
    seenCommunities.add(communityKey);
    return true;
  });
}

export function shouldApplySpacesPage(input: SpacesPageGate): boolean {
  if (input.aborted) return false;
  if (input.requestQuery !== input.currentQuery) return false;
  if (input.requestGeneration !== input.currentGeneration) return false;
  return true;
}

export type GuestSpaceVisibility = {
  access_type?: string | null;
  privacy?: string | null;
};

export type GuestSpaceCandidate = GuestSpaceVisibility & {
  id: string;
  community_id: string;
  sort_order?: number | null;
};

/** Guest catalog rule: public communities with a slug. Private communities stay hidden. */
export function isGuestVisibleCommunity(community: {
  is_private?: boolean | null;
  slug?: string | null;
}): boolean {
  if (community.is_private === true) return false;
  return Boolean(community.slug);
}

/**
 * Guest space rule. Paid, members-only, invite, and private spaces are not public cards.
 * Comparison is case-insensitive. Unknown access values stay visible.
 */
export function isGuestVisibleSpace(space: GuestSpaceVisibility): boolean {
  const access = String(space.access_type ?? "free").toLowerCase();
  const privacy = String(space.privacy ?? "public").toLowerCase();
  return !(
    privacy === "private" ||
    access === "private" ||
    access === "invite" ||
    access === "paid" ||
    access === "premium" ||
    access === "members"
  );
}

/**
 * Lowest sort_order guest-visible space for each community, from that community's own rows.
 * Null sort_order sorts last, matching Postgres ASC NULLS LAST.
 */
export function selectGuestRepresentativeSpaces<T extends GuestSpaceCandidate>(
  communityIds: readonly string[],
  spacesByCommunity: ReadonlyMap<string, readonly T[]>,
): T[] {
  const picked: T[] = [];
  for (const communityId of communityIds) {
    const list = spacesByCommunity.get(communityId);
    if (!list || list.length === 0) continue;
    const visible = list.filter((space) => isGuestVisibleSpace(space));
    if (visible.length === 0) continue;
    const best = [...visible].sort((a, b) => {
      const order = sortOrderRank(a.sort_order) - sortOrderRank(b.sort_order);
      if (order !== 0) return order;
      return a.id.localeCompare(b.id);
    })[0];
    if (best) picked.push(best);
  }
  return picked;
}

export function applySpacesPage<T extends SpaceCardIdentity>(
  input: SpacesPageGate & {
    append: boolean;
    previous: readonly T[];
    incoming: readonly T[];
    nextOffset: number | null;
    total: number;
  },
): { apply: false } | { apply: true; spaces: T[]; nextOffset: number | null; total: number } {
  if (!shouldApplySpacesPage(input)) return { apply: false };
  const spaces = dedupeSpaceCards(
    input.append ? [...input.previous, ...input.incoming] : [...input.incoming],
  );
  return {
    apply: true,
    spaces,
    nextOffset: input.nextOffset,
    total: input.total,
  };
}
