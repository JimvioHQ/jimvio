export type HubHomeCommunity = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  member_count: number;
  role: string | null;
  is_private: boolean;
  last_visited_at: string | null;
  last_path: string | null;
  is_live: boolean;
  unread_hint: number;
};

export type HubHomeActivity = {
  id: string;
  kind: "post" | "live" | "mission";
  title: string;
  community_name: string;
  community_slug: string;
  href: string;
  at: string;
  meta?: string | null;
};

export type HubHomePayload = {
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  communities: HubHomeCommunity[];
  activity: HubHomeActivity[];
  liveCount: number;
  missionCount: number;
};

function greetingName(fullName: string | null, username: string | null) {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  if (username?.trim()) return username.trim();
  return "there";
}

export function hubGreeting(fullName: string | null, username: string | null) {
  const h = new Date().getHours();
  const when =
    h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${when}, ${greetingName(fullName, username)}`;
}
