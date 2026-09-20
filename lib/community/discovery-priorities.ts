/**
 * Product-level discovery priorities for Community hub rails.
 *
 * Intentionally empty: production Popular Users / Trending must rank from
 * real activity only. Do not pin showcase accounts or invent engagement.
 */

/** Usernames that should appear in Popular Users when the profile is active. */
export const PRIORITY_POPULAR_USERNAMES: readonly string[] = [];

/** Community slugs that should appear in Trending when publicly discoverable. */
export const PRIORITY_TRENDING_COMMUNITY_SLUGS: readonly string[] = [];
