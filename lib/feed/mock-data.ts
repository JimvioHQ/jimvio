/**
 * Feed tab labels only. Fake STORIES / FEED_POSTS / engagement mocks were removed —
 * production Feed, Stories, and rails load exclusively from the database.
 */
export const FEED_TABS = [
  "For You",
  "Following",
  "Trending",
  "Hot",
  "Rising",
  "Newest",
  "Recommended",
] as const;

export type FeedTab = (typeof FEED_TABS)[number];
