/**
 * Route access rules for the Creator Hub (/c/*).
 *
 * Public: feed landing, community browse, leaderboard, subscribe pricing.
 * Auth required: personal tools (messages, wallet, …) and member-only community areas.
 */

export const HUB_RESERVED_SEGMENTS = new Set([
  "messages",
  "bookmarks",
  "live",
  "spaces",
  "wallet",
  "analytics",
  "missions",
  "courses",
  "events",
  "my-communities",
  "community",
  "u",
  "settings",
  "profile",
]);

/** Hub-level paths that require a signed-in user. */
export const HUB_AUTH_REQUIRED_PREFIXES = [
  "/c/messages",
  "/c/bookmarks",
  "/c/wallet",
  "/c/analytics",
  "/c/settings",
  "/c/profile",
  "/c/live",
  "/c/spaces",
  "/c/missions",
  "/c/courses",
  "/c/events",
  "/c/community/creator",
] as const;

/** Community sub-routes under /c/[slug]/ that stay public. */
export const COMMUNITY_PUBLIC_SUBROUTES = new Set(["leaderboard", "subscribe"]);

/** Community sub-routes under /c/[slug]/ that require sign-in. */
export const COMMUNITY_AUTH_SUBROUTES = new Set([
  "chats",
  "room",
  "live",
  "courses",
  "members",
]);

export function getCommunitySlugFromPath(pathname: string): string | null {
  const legacyMatch = pathname.match(/^\/c\/community\/([^/]+)/);
  if (legacyMatch) return legacyMatch[1];

  const match = pathname.match(/^\/c\/([^/]+)/);
  if (!match) return null;

  const slug = match[1];
  if (HUB_RESERVED_SEGMENTS.has(slug)) return null;
  return slug;
}

export function isHubAuthRequired(pathname: string): boolean {
  const path = pathname.split("?")[0];

  for (const prefix of HUB_AUTH_REQUIRED_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }

  const slug = getCommunitySlugFromPath(path);
  if (!slug) return false;

  const subMatch = path.match(new RegExp(`^/c/${slug}/([^/]+)`));
  if (!subMatch) return false;

  const subroute = subMatch[1];
  if (COMMUNITY_PUBLIC_SUBROUTES.has(subroute)) return false;
  return COMMUNITY_AUTH_SUBROUTES.has(subroute);
}

export function buildHubLoginUrl(pathname: string): string {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

/** Nav item ids in the hub sidebar that require authentication. */
export const HUB_AUTH_NAV_IDS = new Set([
  "messages",
  "bookmarks",
  "wallet",
  "analytics",
  "profile",
  "live",
  "spaces",
  "missions",
  "courses",
  "events",
]);
