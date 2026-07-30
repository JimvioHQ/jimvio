/**
 * Canonical public community categories used by settings and discovery.
 * "Tech" remains available as a legacy alias for existing communities.
 */
export const COMMUNITY_CATEGORIES = [
  "Technology",
  "AI",
  "Programming",
  "Business",
  "Finance",
  "Trading",
  "Crypto",
  "Marketing",
  "Design",
  "Photography",
  "Gaming",
  "Education",
  "Entertainment",
  "Health",
  "Fitness",
  "Sports",
  "Music",
  "Travel",
  "Startups",
  "Fashion",
  "Ecommerce",
  "Creator",
  "Tech",
  "Other",
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];
