export type FeedUser = {
  id: string;
  displayName: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type FeedAuthInitial = {
  isAuthenticated: boolean;
  user: FeedUser | null;
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
