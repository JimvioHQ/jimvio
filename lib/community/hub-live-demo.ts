import type { LiveDashboard } from "@/lib/community/hub-live-types";

export function getEmptyHubLiveDashboard(): LiveDashboard {
  return {
    stats: { membersOnline: 0, liveSessions: 0, voiceRooms: 0 },
    rooms: [],
    relatedRooms: [],
    chatMessages: [],
    speakers: [],
    upcomingSessions: [],
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
      href: "/communities/live",
      tag: "Live Room",
      roomId: null,
      communityId: null,
      liveSessionId: null,
    },
  };
}

/** Pass through API payload; use empty dashboard when missing or unauthorized. */
export function normalizeHubLiveDashboard(api: LiveDashboard | null | undefined): LiveDashboard {
  if (!api) return getEmptyHubLiveDashboard();
  return api;
}
