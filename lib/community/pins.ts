/** User community pin limits and helpers. */

export const MAX_COMMUNITY_PINS = 20;

export type UserCommunityPin = {
  user_id: string;
  community_id: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type PinnedCommunity = UserCommunityPin & {
  community: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    avatar_url: string | null;
    member_count: number | null;
    category: string | null;
  } | null;
};
