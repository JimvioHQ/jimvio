export type LiveRoom = {
  id: string;
  name: string;
  community_id?: string | null;
  community_name: string;
  community_slug?: string;
  message_count: number;
  href: string;
};

export type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
  reaction_count: number;
};

export type Speaker = {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
};

export type UpcomingSession = {
  id: string;
  title: string;
  host: string;
  start_date: string;
  href: string;
};

export type LiveDashboard = {
  stats: { membersOnline: number; liveSessions: number; voiceRooms: number };
  rooms: LiveRoom[];
  relatedRooms: LiveRoom[];
  chatMessages: ChatMessage[];
  speakers: Speaker[];
  upcomingSessions: UpcomingSession[];
  analytics: {
    viewers: number;
    liveViewers: number;
    likes: number;
    newJoins: number;
    messages: number;
    comments: number;
    shares: number;
    reactionsPct: number;
    peakViewers: number;
    watchTimeMinutes: number;
    revenue: number;
  };
  session: {
    title: string;
    host: string;
    href: string;
    tag: string;
    roomId: string | null;
    communityId?: string | null;
    communitySlug?: string | null;
    liveSessionId?: string | null;
    liveStatus?: "live" | "ended" | "scheduled" | "offline";
    endedSessionId?: string | null;
    discussionHref?: string | null;
  };
};
