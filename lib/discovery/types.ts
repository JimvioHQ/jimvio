/** Shared discovery / search entity types. */

export const DISCOVERY_ENTITY_TYPES = [
  "community",
  "space",
  "post",
  "message",
  "course",
  "lesson",
  "product",
  "creator",
  "live",
  "campaign",
  "digital",
  "organization",
] as const;

export type DiscoveryEntityType = (typeof DISCOVERY_ENTITY_TYPES)[number];

export type DiscoveryHit = {
  id: string;
  entityType: DiscoveryEntityType;
  title: string;
  subtitle?: string | null;
  href: string;
  imageUrl?: string | null;
  score: number;
  meta?: Record<string, unknown>;
};

export type DiscoverySearchInput = {
  q: string;
  types?: DiscoveryEntityType[];
  limit?: number;
  cursor?: string | null;
  sort?: "relevance" | "newest" | "popular";
  userId?: string | null;
  /** Membership-scoped community filter for private content. */
  communityId?: string | null;
};

export type DiscoverySearchResult = {
  items: DiscoveryHit[];
  nextCursor: string | null;
  hasMore: boolean;
  query: string;
  tookMs: number;
};

export type RecommendationShelf = {
  id: string;
  label: string;
  entityType: DiscoveryEntityType | "mixed";
  items: DiscoveryHit[];
};

export function isDiscoveryEntityType(value: string): value is DiscoveryEntityType {
  return (DISCOVERY_ENTITY_TYPES as readonly string[]).includes(value);
}
