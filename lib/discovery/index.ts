export * from "@/lib/discovery/types";
export { globalSearch } from "@/lib/discovery/search";
export {
  getRecommendations,
  getRecentlyViewed,
  recordDiscoveryView,
  recordSearchHistory,
  getFollowingRecommendations,
} from "@/lib/discovery/recommendations";
export { getUnifiedDiscoveryShelves } from "@/lib/discovery/shelves";
export { sanitizeSearchTerm, typoTolerantTerms } from "@/lib/discovery/sanitize";
