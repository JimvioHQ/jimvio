export type FeedUser = {
  id: string;
  displayName: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type FeedHubCommunity = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
};

/**
 * Server snapshot for the Communities sidebar so "My communities" and the
 * Create / Manage Community action render in the first paint. Manage access
 * is decided server-side (owner, or staff role that can enter the console).
 */
export type FeedHubSnapshot = {
  joined: FeedHubCommunity[];
  /** First community the viewer can manage, or null → show Create Community. */
  manage: { slug: string; name: string } | null;
  level: number;
  xp: number;
};

export type FeedAuthInitial = {
  isAuthenticated: boolean;
  user: FeedUser | null;
  hub?: FeedHubSnapshot | null;
};

export function toDisplayName(fullName: string | null, username: string | null): string {
  const first = fullName?.trim().split(/\s+/)[0];
  if (first) return first;
  if (username) return username.replace(/_/g, " ");
  return "there";
}

export const FEED_AUTH_GUEST: FeedAuthInitial = {
  isAuthenticated: false,
  user: null,
};
