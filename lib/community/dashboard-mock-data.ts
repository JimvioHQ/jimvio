export const MOCK_COMMUNITY = {
  slug: "ugc-army",
  name: "UGC Army",
  tagline: "Create. Grow. Earn.",
  visibility: "Private Community" as const,
  membersOnline: 2145,
  verified: true,
  createdBy: "Maya Editz",
  joinedDate: "Jan 12, 2025",
  level: 8,
  xp: 4120,
  xpGoal: 6000,
  bannerUrl: "https://picsum.photos/seed/ugc-banner/1200/320",
};

export const COMMUNITY_STATS = {
  messages: { value: "12.4K", delta: "+21%" },
  engagement: { value: "8.6%", delta: "+12%" },
  newMembers: { value: "342", delta: "+18%" },
  activeMembers: { value: "1.8K", delta: "+9%" },
};

export const OVERVIEW_STATS = [
  { label: "Members Online", value: "2,145", delta: "+142 today" },
  { label: "Live Now", value: "24", delta: "+6 today" },
  { label: "Voice Rooms", value: "7", delta: "+2 today" },
  { label: "Courses", value: "18", delta: "+1 new" },
  { label: "Total Earned", value: "$12,480", delta: "+$840" },
];

export const AI_COMMUNITY_INSIGHTS = [
  {
    icon: "trending",
    headline: "Engagement up 21% this week",
    subtext: "General Chat and Live Trading drive most activity.",
  },
  {
    icon: "clock",
    headline: "Best time to post: 9–11 AM EST",
    subtext: "Members are most active before market open.",
  },
  {
    icon: "users",
    headline: "12 members likely to upgrade",
    subtext: "High activity + course completion signals.",
  },
];

export const ACTIVE_NOW = [
  { id: "1", name: "Maya Editz", status: "Live now", variant: "live" as const },
  { id: "2", name: "Brick Fx", status: "In Voice Room", variant: "voice" as const },
  { id: "3", name: "Sarah Chen", status: "Watching Live", variant: "watching" as const },
  { id: "4", name: "Alex Rivera", status: "Online", variant: "online" as const },
];

export const UPCOMING_EVENTS = [
  { id: "1", month: "MAY", day: 24, title: "Live Trading Masterclass", host: "Maya Editz", time: "10:00 AM" },
  { id: "2", month: "MAY", day: 25, title: "UGC Clip Review", host: "Brick Fx", time: "2:00 PM" },
  { id: "3", month: "MAY", day: 27, title: "Community Q&A", host: "Sarah Chen", time: "6:00 PM" },
];

export const TOP_CONTRIBUTORS = [
  { rank: 1, name: "Maya Editz", live: true },
  { rank: 2, name: "Brick Fx", live: false },
  { rank: 3, name: "Sarah Chen", live: true },
  { rank: 4, name: "Alex Rivera", live: false },
];

export const COMMUNITY_RULES = [
  "Be respectful to everyone in the community",
  "No spam or unsolicited promotions",
  "Share value — help others learn and grow",
  "Keep live sessions on topic",
  "Follow platform guidelines for UGC content",
];

export const COMMUNITY_FEATURES = [
  "Weekly live trading sessions",
  "UGC missions with cash rewards",
  "Private signals space",
  "Creator toolkit & templates",
];

export const COURSES = [
  { id: "1", title: "UGC Mastery 101", difficulty: "Beginner", lessons: 12, progress: 75, thumbnail: "https://picsum.photos/seed/course1/400/240" },
  { id: "2", title: "Content Creation", difficulty: "Intermediate", lessons: 18, progress: 40, thumbnail: "https://picsum.photos/seed/course2/400/240" },
  { id: "3", title: "Live Streaming", difficulty: "Advanced", lessons: 8, progress: 0, thumbnail: "https://picsum.photos/seed/course3/400/240" },
  { id: "4", title: "Affiliate Basics", difficulty: "Beginner", lessons: 6, progress: 100, thumbnail: "https://picsum.photos/seed/course4/400/240" },
];

export const RECENT_ACTIVITY = [
  { id: "1", user: "Maya", action: "posted in General Chat", time: "2m ago" },
  { id: "2", user: "Brick", action: "started a live session", time: "15m ago" },
  { id: "3", user: "Sarah", action: "completed UGC Mastery 101", time: "1h ago" },
];

export const POPULAR_WEEK = [
  { id: "1", title: "Live Trading Room", count: "842 joined" },
  { id: "2", title: "Signals Space", count: "612 enrolled" },
  { id: "3", title: "Clip Challenges", count: "489 active" },
];

export const CHAT_MESSAGES = [
  {
    id: "1",
    author: "Maya Editz",
    role: "Admin" as const,
    time: "10:24 AM",
    body: "Welcome everyone! Today's live session starts in 30 minutes. Drop your questions below.",
    reactions: [{ emoji: "🔥", count: 12 }, { emoji: "👍", count: 8 }],
    others: 3,
  },
  {
    id: "2",
    author: "Brick Fx",
    role: "Owner" as const,
    time: "10:26 AM",
    body: "Just uploaded the UGC Pricing Guide — check Resources if you missed it.",
    file: { name: "UGC Pricing Guide 2024.pdf", size: "2.4 MB" },
    reactions: [{ emoji: "❤️", count: 5 }],
  },
  {
    id: "3",
    author: "Sarah Chen",
    role: null,
    time: "10:28 AM",
    body: "Can't wait for the session! Already got my clips ready 🎬",
    reactions: [],
  },
  {
    id: "4",
    author: "You",
    role: null,
    time: "10:30 AM",
    body: "See you all there — I'll be sharing my screen for the walkthrough.",
    own: true,
    read: true,
  },
];

export const PINNED_MESSAGE = {
  author: "Maya Editz",
  text: "Live Trading Masterclass starts today at 10 AM EST — join via the Live Trading space!",
};
