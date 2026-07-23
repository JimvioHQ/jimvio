/**
 * Route access rules for the Creator Hub (/communities/*).
 *
 * Public: feed landing, community browse, leaderboard, subscribe pricing.
 * Auth required: personal tools (messages, wallet, …) and member-only community areas.
 */

export const HUB_RESERVED_SEGMENTS = new Set([
  "messages",
  "bookmarks",
  "live",
  "spaces",
  "channels",
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
  "explore",
  "create",
  "stories",
  "activity",
  "toolkit",
]);

/** Hub-level paths that require a signed-in user. */
export const HUB_AUTH_REQUIRED_PREFIXES = [
  "/communities/messages",
  "/communities/bookmarks",
  "/communities/wallet",
  "/communities/analytics",
  "/communities/settings",
  "/communities/profile",
  "/communities/live",
  "/communities/spaces",
  "/communities/channels",
  "/communities/missions",
  "/communities/courses",
  "/communities/events",
  "/communities/community/creator",
] as const;

/** Community sub-routes under /communities/[slug]/ that stay public. */
export const COMMUNITY_PUBLIC_SUBROUTES = new Set(["leaderboard", "subscribe"]);

/**
 * Community sub-routes under /communities/[slug]/ that require sign-in.
 * Keep in sync with pages that assume an authenticated member session.
 */
export const COMMUNITY_AUTH_SUBROUTES = new Set([
  "about",
  "chat",
  "chats",
  "room",
  "live",
  "courses",
  "members",
  "request",
  "settings",
  "toolkit",
  "missions",
  "events",
  "billing",
  "memberships",
]);

/**
 * Sub-routes that must render inside WorkspaceProvider (active membership).
 * Pages that call useWorkspace() without an optional fallback belong here.
 * Public browse routes (feed, leaderboard, subscribe) stay outside this set.
 */
export const COMMUNITY_WORKSPACE_SUBROUTES = new Set([
  "about",
  "chat",
  "chats",
  "room",
  "courses",
]);
export function getCommunitySubroute(pathname: string): string | null {
  const slug = getCommunitySlugFromPath(pathname);
  if (!slug) return null;
  const match = pathname.match(new RegExp(`^/communities/${slug}/([^/]+)`));
  return match?.[1] ?? null;
}

export function isCommunityWorkspaceSubroute(pathname: string): boolean {
  const sub = getCommunitySubroute(pathname);
  return Boolean(sub && COMMUNITY_WORKSPACE_SUBROUTES.has(sub));
}
export function getCommunitySlugFromPath(pathname: string): string | null {
  const legacyMatch = pathname.match(/^\/communities\/community\/([^/]+)/);
  if (legacyMatch) return legacyMatch[1];

  const match = pathname.match(/^\/communities\/([^/]+)/);
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

  const subMatch = path.match(new RegExp(`^/communities/${slug}/([^/]+)`));
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
  "groups",
  "channels",
  "live",
  "missions",
  "courses",
  "events",
  "bookmarks",
  "analytics",
  "wallet",
]);
