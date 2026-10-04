/**
 * Product-level discovery priorities for Community hub rails.
 *
 * These are real existing Jimvio profiles / communities — not invented
 * engagement. Ranking still uses authoritative DB counts for display.
 */

/** Usernames that should appear in Popular Users when the profile is active. */
export const PRIORITY_POPULAR_USERNAMES: readonly string[] = [
  "barick",
  "p7provider",
];

/** Community slugs that should appear in Trending when publicly discoverable. */
export const PRIORITY_TRENDING_COMMUNITY_SLUGS: readonly string[] = [
  "p7provider",
];
