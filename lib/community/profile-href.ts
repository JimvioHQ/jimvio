/**
 * Canonical public profile URL for a Jimvio username.
 * All Community surfaces (Feed, Popular Users, chat, hub) use Identity `/u/[username]`.
 */
export function communityProfileHref(
  username: string | null | undefined
): string | null {
  const handle = username?.trim().replace(/^@/, "");
  if (!handle) return null;
  return `/u/${encodeURIComponent(handle)}`;
}

/** @deprecated Alias — prefer communityProfileHref / publicProfileHref */
export function publicProfileHref(
  username: string | null | undefined
): string | null {
  return communityProfileHref(username);
}
