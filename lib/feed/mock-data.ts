export const CREATOR_CHALLENGE = {
  progress: "2/3",
  title: "Finish 3 live sessions",
  subtitle: "Earn 500 bonus XP + badge",
  completed: 2,
  target: 3,
};

export const STORIES = [
  { id: "1", name: "Barick te", live: true, verified: false, online: false, avatar: null },
  { id: "2", name: "Bella Oh.", live: false, verified: false, online: true, avatar: null },
  { id: "3", name: "K. Sensei", live: false, verified: true, online: false, avatar: null },
  { id: "4", name: "Maya Edits", live: true, verified: false, online: false, avatar: null },
  { id: "5", name: "Chris Clips", live: false, verified: false, online: true, avatar: null },
  { id: "6", name: "Sarah Chen", live: false, verified: true, online: false, avatar: null },
  { id: "7", name: "Leo Craft", live: false, verified: false, online: true, avatar: null },
  { id: "8", name: "Nina Labs", live: false, verified: true, online: false, avatar: null },
  { id: "9", name: "Omar Live", live: true, verified: false, online: false, avatar: null },
  { id: "10", name: "Priya Co", live: false, verified: false, online: true, avatar: null },
  { id: "11", name: "Quinn Ads", live: false, verified: true, online: false, avatar: null },
  { id: "12", name: "Rae Studio", live: false, verified: false, online: false, avatar: null },
];

export const FEED_TABS = [
  "For You",
  "Following",
  "Trending",
  "Spaces",
  "Missions",
  "AI Picks",
] as const;

export type FeedTab = (typeof FEED_TABS)[number];

export const FEED_POSTS = [
  {
    id: "1",
    author: {
      name: "Maya",
      handle: "@mayoCreates",
      level: 15,
      verified: true,
      avatar: "https://picsum.photos/seed/maya-creator/80/80",
    },
    timestamp: "3h ago",
    pinned: true,
    body: "Just dropped a new editing tutorial for cinematic reels 🎬 Hope this helps someone level up! 🔥",
    media: {
      type: "video" as const,
      duration: "06:45",
      thumbnail: "https://picsum.photos/seed/cinematic-transitions/800/450",
      overlay: {
        title: "5 Cinematic Transitions",
        subtitle: "in 2 minutes",
      },
    },
    engagement: {
      likes: "1.2K",
      comments: 230,
      shares: 120,
      socialProof: {
        names: ["David", "Eric"],
        avatars: ["David", "Eric", "Kim"],
        others: 98,
      },
    },
  },
  {
    id: "2",
    author: {
      name: "Chris",
      handle: "@chrisclips",
      level: 12,
      verified: false,
      avatar: null,
    },
    timestamp: "4h ago",
    pinned: false,
    body: "Behind the scenes from today's shoot. Film production tips for creators getting started.",
    media: { type: "image" as const, thumbnail: "https://picsum.photos/seed/chris-feed/800/450" },
    engagement: { likes: 456, comments: 89, shares: 34 },
  },
  {
    id: "3",
    author: {
      name: "Sarah Chen",
      handle: "@sarahchen",
      level: 8,
      verified: false,
      avatar: null,
    },
    timestamp: "6h ago",
    pinned: false,
    body: "Community milestone unlocked! We just hit 10,000 members. Special giveaway coming this weekend!",
    media: null,
    engagement: { likes: 567, comments: 89, shares: 34 },
  },
];

export const ACTIVITY_FEED = [
  {
    id: "1",
    kind: "user" as const,
    title: "Maya started a live session",
    subtitle: "Editing Masterclass",
    subtitleDot: true,
    avatarSeed: "maya-activity",
    time: "now",
    live: true,
  },
  {
    id: "2",
    kind: "user" as const,
    title: "Barick te uploaded a new clip",
    subtitle: "Cinematic transitions breakdown",
    avatarSeed: "barick-activity",
    time: "5m ago",
  },
  {
    id: "3",
    kind: "system" as const,
    title: "UGC Army mission completed",
    subtitle: "+200 XP earned",
    systemIcon: "community" as const,
    systemColor: "green",
    time: "10m ago",
  },
  {
    id: "4",
    kind: "system" as const,
    title: "Creator School posted a new lesson",
    subtitle: "Welcome new members 👋",
    systemIcon: "course" as const,
    systemColor: "blue",
    time: "15m ago",
  },
  {
    id: "5",
    kind: "user" as const,
    title: "Editing Help Room is active",
    subtitle: "12 creators chatting now",
    avatarSeed: "editing-help",
    time: "22m ago",
  },
];

export const CREATE_QUICK_LAUNCH = [
  { icon: "radio", label: "Go Live", subtitle: "Start a livestream" },
  { icon: "mic", label: "Start Voice Room", subtitle: "Audio conversation" },
  { icon: "scissors", label: "Upload Clip", subtitle: "Share short video" },
  { icon: "graduation", label: "Create Course", subtitle: "Build a new course" },
  { icon: "target", label: "Create Mission", subtitle: "Engage your community" },
  { icon: "layers", label: "Create Space", subtitle: "Build your community" },
  { icon: "monitor", label: "Share Screen", subtitle: "Present with others" },
];

export const FEATURED_LIVE = {
  title: "Editing Live: Advanced Color Grading + Q&A",
  streamer: "Bruce Melody",
  verified: true,
  viewers: "1.3K",
  category: "Education",
  tags: ["Color Grading"],
  thumbnail: "https://picsum.photos/seed/bruce-color/640/480",
  viewerAvatars: ["A", "S", "J", "M"],
};

export const CREATOR_INSIGHTS = [
  { label: "Profile Views", value: "12.4K", delta: "+18%" },
  { label: "Engagement", value: "8.7K", delta: "+12%" },
  { label: "New Followers", value: "2.1K", delta: "+22%" },
  { label: "Revenue", value: "$1,320", delta: "+15%" },
];

export const INSIGHTS_CHART_DATA = [
  { date: "May 1", v: 40 },
  { date: "May 8", v: 52 },
  { date: "May 15", v: 48 },
  { date: "May 22", v: 68 },
  { date: "May 29", v: 85 },
];

export const AI_INSIGHTS = [
  {
    icon: "audience",
    title: "Your audience is most active",
    subtext: "7PM – 10PM",
  },
  {
    icon: "trend",
    title: "This clip could trend",
    subtext: "High potential",
  },
  {
    icon: "collab",
    title: "You have 3 collab invites",
    subtext: "From top creators",
  },
  {
    icon: "missions",
    title: "Can pitch 2 missions",
    subtext: "Unlock +200 XP",
    highlight: true,
  },
];

export const UPCOMING_LIVE = [
  { id: "1", title: "Options Trading 101", host: "Mike Torres", time: "Today, 3:00 PM", avatar: null },
  { id: "2", title: "Weekly Q&A", host: "Sarah Chen", time: "Tomorrow, 10:00 AM", avatar: null },
  { id: "3", title: "Chart Patterns Deep Dive", host: "Emma Wilson", time: "Fri, 2:00 PM", avatar: null },
];

export const EARNINGS = {
  total: "$4,680.00",
  delta: "32.6% vs last month",
  chartBars: [32, 48, 40, 56, 44, 62, 50, 68, 46, 58, 42, 54, 38],
};

export const TOP_MISSIONS = [
  { icon: "circle", name: "Create 5 Clips", reward: "+300%", progress: 75 },
  { icon: "mic", name: "Host 2 Voice Rooms", reward: "+60%", progress: 40 },
  { icon: "users", name: "Invite 3 Friends", reward: "+20%", progress: 20 },
];

export const MINI_LIVE = {
  title: "Editing Live: Advanced Color Grading + Q&A",
  streamer: "Bruce Melody",
  viewers: "1.3K watching",
};

export const MOCK_USER = {
  name: "John Doe",
  isPremium: true,
  level: 42,
  role: "Creator",
  verified: true,
  xp: 4250,
  xpGoal: 6000,
};
