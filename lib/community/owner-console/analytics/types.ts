/**
 * Owner Console Analytics Platform — domain types.
 */

export const ANALYTICS_SECTIONS = [
  "overview",
  "members",
  "groups",
  "channels",
  "messages",
  "knowledge",
  "courses",
  "commerce",
  "live",
  "events",
  "moderation",
  "growth",
  "retention",
  "engagement",
  "ai",
] as const;
export type AnalyticsSectionId = (typeof ANALYTICS_SECTIONS)[number];

export const ANALYTICS_RANGES = [
  "today",
  "7d",
  "30d",
  "90d",
  "custom",
] as const;
export type AnalyticsRangeId = (typeof ANALYTICS_RANGES)[number];

export const EXPORT_FORMATS = ["csv", "xlsx", "pdf", "api"] as const;
export type AnalyticsExportFormat = (typeof EXPORT_FORMATS)[number];

export type ScoreLabel = "Excellent" | "Strong" | "Steady" | "Building";

export type AnalyticsScore = {
  id: string;
  label: string;
  score: number;
  labelTier: ScoreLabel;
};

export type SeriesPoint = { date: string; value: number; secondary?: number };

export type NamedCount = { id: string; name: string; count: number };

export type InsightAction = {
  id: string;
  title: string;
  summary: string;
  severity: "info" | "warn" | "critical" | "opportunity";
  hrefSection?: string;
};

export type OwnerAnalyticsOverview = {
  scores: AnalyticsScore[];
  healthScore: number;
  healthLabel: ScoreLabel;
  totals: {
    members: number;
    online: number;
    groups: number;
    channels: number;
    messages: number;
    reportsOpen: number;
  };
  growthSeries: SeriesPoint[];
};

export type OwnerAnalyticsMembers = {
  newMembers: number;
  returningMembers: number;
  retentionRate: number;
  onlineMembers: number;
  topContributors: NamedCount[];
  topCreators: NamedCount[];
  roleDistribution: NamedCount[];
  invites: number;
  joinRequests: number;
  growthSeries: SeriesPoint[];
};

export type OwnerAnalyticsGroups = {
  fastestGrowing: NamedCount[];
  mostActive: NamedCount[];
  inactive: NamedCount[];
  retentionScore: number;
  commerceScore: number;
};

export type OwnerAnalyticsChannels = {
  mostActive: NamedCount[];
  inactive: NamedCount[];
  messageVolume: number;
  threadCreation: number;
  knowledgeGenerated: number;
  filesShared: number;
  volumeSeries: SeriesPoint[];
};

export type OwnerAnalyticsKnowledge = {
  cards: number;
  faqs: number;
  guides: number;
  courseNotes: number;
  searches: number;
  usageScore: number;
};

export type OwnerAnalyticsLive = {
  sessions: number;
  watchTimeMinutes: number;
  attendance: number;
  participation: number;
  replays: number;
};

export type OwnerAnalyticsCommerce = {
  revenue: number;
  orders: number;
  affiliateEarnings: number;
  tips: number;
  memberships: number;
  courses: number;
  products: number;
  currency: string;
};

export type OwnerAnalyticsModeration = {
  reports: number;
  spam: number;
  warnings: number;
  mutes: number;
  bans: number;
  appeals: number;
  avgResponseHours: number | null;
};

export type OwnerAnalyticsAiInsights = {
  healthSummary: string;
  recommendations: InsightAction[];
  inactiveGroups: NamedCount[];
  inactiveChannels: NamedCount[];
  trendingTopics: string[];
  creatorOpportunities: InsightAction[];
  risks: InsightAction[];
};

export type OwnerAnalyticsBundle = {
  range: AnalyticsRangeId;
  rangeStart: string;
  rangeEnd: string;
  overview: OwnerAnalyticsOverview;
  members: OwnerAnalyticsMembers;
  groups: OwnerAnalyticsGroups;
  channels: OwnerAnalyticsChannels;
  knowledge: OwnerAnalyticsKnowledge;
  live: OwnerAnalyticsLive;
  commerce: OwnerAnalyticsCommerce;
  moderation: OwnerAnalyticsModeration;
  ai: OwnerAnalyticsAiInsights;
  filters: {
    groupId: string | null;
    channelId: string | null;
    role: string | null;
  };
};
