/**
 * Product-level discovery priorities for Community hub rails.
 * These are real Jimvio entities — never invent followers/members.
 * Inclusion only ensures featured/showcase entities appear when eligible.
 */

/** Usernames that should appear in Popular Users when the profile is active. */
export const PRIORITY_POPULAR_USERNAMES: readonly string[] = ["p7provider"];

/** Community slugs that should appear in Trending when publicly discoverable. */
export const PRIORITY_TRENDING_COMMUNITY_SLUGS: readonly string[] = ["p7provider"];
