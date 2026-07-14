import type { LiveDashboard, LiveSessionItem } from "@/lib/community/hub-live-types";

export function getEmptyHubLiveDashboard(): LiveDashboard {
  return {
    stats: { membersOnline: 0, liveSessions: 0, voiceRooms: 0 },
    rooms: [],
    relatedRooms: [],
    chatMessages: [],
    speakers: [],
    upcomingSessions: [],
    sessions: [],
    analytics: {
      viewers: 0,
      liveViewers: 0,
      likes: 0,
      newJoins: 0,
      messages: 0,
      comments: 0,
      shares: 0,
      reactionsPct: 0,
      peakViewers: 0,
      watchTimeMinutes: 0,
      revenue: 0,
    },
    session: {
      title: "Community Live Room",
      host: "Jimvio",
      href: "/c/live",
      tag: "Live Room",
      roomId: null,
      description: null,
      host_bio: null,
      host_follower_count: 0,
      host_avatar: null,
    },
  };
}

/** Pass through API payload; use empty dashboard when missing or unauthorized. */
export function normalizeHubLiveDashboard(api: LiveDashboard | null | undefined): LiveDashboard {
  if (!api) return getEmptyHubLiveDashboard();
  return api;
}

/** Mock: return all live sessions across spaces for a community slug. */
export function getMockSessions(communitySlug?: string): LiveSessionItem[] {
  const all: LiveSessionItem[] = [
    {
      id: "sess-1",
      title: "React Hooks Deep Dive",
      host: "Sarah Chen",
      host_avatar: null,
      space_id: "space-coding",
      space_name: "Learning Coding",
      community_slug: communitySlug ?? "jimvio",
      viewer_count: 342,
      status: "live",
      privacy: "public",
      started_at: new Date(Date.now() - 1800000).toISOString(),
      category: "Tutorial",
      host_follower_count: 2840,
      host_bio: "Senior React engineer & educator. Building UI systems for 8+ years.",
    },
    {
      id: "sess-2",
      title: "Forex Trading for Beginners",
      host: "Mike Okonkwo",
      host_avatar: null,
      space_id: "space-trading",
      space_name: "Forex Trading",
      community_slug: communitySlug ?? "jimvio",
      viewer_count: 187,
      status: "live",
      privacy: "public",
      started_at: new Date(Date.now() - 3600000).toISOString(),
      category: "Workshop",
      host_follower_count: 12100,
      host_bio: "Professional forex trader with 12 years of market experience.",
    },
    {
      id: "sess-3",
      title: "UI/UX Portfolio Review",
      host: "Aisha Diallo",
      host_avatar: null,
      space_id: "space-design",
      space_name: "Design Studio",
      community_slug: communitySlug ?? "jimvio",
      viewer_count: 56,
      status: "live",
      privacy: "public",
      started_at: new Date(Date.now() - 900000).toISOString(),
      category: "Review",
      host_follower_count: 3720,
      host_bio: "Product designer at Figma. Love helping juniors level up.",
    },
    {
      id: "sess-4",
      title: "Advanced TypeScript Patterns",
      host: "James Wilson",
      host_avatar: null,
      space_id: "space-coding",
      space_name: "Learning Coding",
      community_slug: communitySlug ?? "jimvio",
      viewer_count: 0,
      status: "upcoming",
      privacy: "public",
      started_at: new Date(Date.now() + 7200000).toISOString(),
      category: "Talk",
      host_follower_count: 1890,
    },
    {
      id: "sess-5",
      title: "Members-only Q&A: Market Analysis",
      host: "Mike Okonkwo",
      host_avatar: null,
      space_id: "space-trading",
      space_name: "Forex Trading",
      community_slug: communitySlug ?? "jimvio",
      viewer_count: 0,
      status: "upcoming",
      privacy: "private",
      started_at: new Date(Date.now() + 14400000).toISOString(),
      category: "Q&A",
      host_follower_count: 12100,
    },
  ];
  return all;
}

/** Get a single mock session by ID. */
export function getMockSessionById(sessionId: string, communitySlug?: string): LiveSessionItem | undefined {
  return getMockSessions(communitySlug).find((s) => s.id === sessionId);
}
