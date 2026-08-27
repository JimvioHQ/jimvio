/**
 * Guest-readable public Community posts.
 * Matches community_posts_select_public after the community-audience SELECT expansion.
 * Does not grant write access. Followers/private audience stay hidden from guests.
 */
export function isGuestVisiblePublicPost(post: {
  audience?: string | null;
  is_exclusive?: boolean | null;
  communities?: { is_private?: boolean | null } | null;
}): boolean {
  if (post.is_exclusive === true) return false;
  if (post.communities?.is_private === true) return false;
  const audience = post.audience;
  if (audience === "followers" || audience === "private") return false;
  return !audience || audience === "public" || audience === "community";
}
