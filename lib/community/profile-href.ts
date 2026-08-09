/**
 * Canonical Community Hub profile URL for a username.
 * Matches Layout / hub-ui / hub-data (`/communities/profile/[username]`).
 */
export function communityProfileHref(
  username: string | null | undefined
): string | null {
  const handle = username?.trim().replace(/^@/, "");
  if (!handle) return null;
  return `/communities/profile/${encodeURIComponent(handle)}`;
}
