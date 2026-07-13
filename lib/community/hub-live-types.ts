export type LiveRoom = {
  id: string;
  name: string;
  community_name: string;
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

export type LiveSessionItem = {
  id: string;
  title: string;
  host: string;
  host_avatar: string | null;
  space_id: string;
  space_name: string;
  space_access_type: string;
  community_slug: string;
  viewer_count: number;
  status: "live" | "upcoming" | "ended";
  privacy: "public" | "private";
  started_at: string;
};

export type LiveDashboard = {
  stats: { membersOnline: number; liveSessions: number; voiceRooms: number };
  rooms: LiveRoom[];
  relatedRooms: LiveRoom[];
  chatMessages: ChatMessage[];
  speakers: Speaker[];
  upcomingSessions: UpcomingSession[];
  sessions: LiveSessionItem[];
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
  session: { title: string; host: string; href: string; tag: string; roomId: string | null };
};
