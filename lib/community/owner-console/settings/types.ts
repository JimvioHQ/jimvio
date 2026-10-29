/**
 * Owner Console Community Settings — domain types.
 */

export const SETTINGS_SECTIONS = [
  "general",
  "branding",
  "info",
  "privacy",
  "discovery",
  "onboarding",
  "groups",
  "channels",
  "notifications",
  "integrations",
  "commerce",
  "live",
  "ai",
  "security",
  "danger",
] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];

export const VISIBILITY_MODES = [
  "public",
  "private",
  "invite_only",
  "hidden",
] as const;
export type VisibilityMode = (typeof VISIBILITY_MODES)[number];

export const THEME_OPTIONS = ["system", "light", "dark"] as const;
export type ThemeOption = (typeof THEME_OPTIONS)[number];

export type SettingsBranding = {
  accentColor: string;
  theme: ThemeOption;
  icon: string | null;
  bannerUrl: string | null;
};

export type SettingsPrivacy = {
  visibility: VisibilityMode;
  approvalRequired: boolean;
  ageRestriction: number | null;
};

export type SettingsDiscovery = {
  searchVisible: boolean;
  featured: boolean;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  socialPreviewUrl: string | null;
};

export type SettingsOnboarding = {
  welcomeTitle: string | null;
  welcomeMessage: string | null;
  rules: string | null;
  requiredSteps: string[];
  defaultGroupId: string | null;
  defaultChannelId: string | null;
};

export type SettingsGroupDefaults = {
  templateKey: string | null;
  autoCreateStarter: boolean;
  defaultPermissions: string[];
};

export type SettingsChannelDefaults = {
  templateKey: string | null;
  defaultTabs: string[];
  slowModeSeconds: number;
  threadsEnabled: boolean;
};

export type SettingsNotifications = {
  email: boolean;
  push: boolean;
  mentions: boolean;
  announcements: boolean;
  events: boolean;
  commerce: boolean;
};

export type SettingsLive = {
  recordingDefault: boolean;
  waitingRoom: boolean;
  screenShareDefault: boolean;
};

export type SettingsCommerce = {
  storeEnabled: boolean;
  affiliateEnabled: boolean;
  donationsEnabled: boolean;
  membershipsEnabled: boolean;
  currency: string;
  taxReady: boolean;
};

export type SettingsAi = {
  summaries: boolean;
  knowledgeSuggestions: boolean;
  moderationAssistance: boolean;
  recommendations: boolean;
  automation: boolean;
};

export type SettingsIntegrations = {
  apiEnabled: boolean;
  webhooksEnabled: boolean;
  externalAppsEnabled: boolean;
  ssoPlaceholder: boolean;
};

export type SettingsSecurity = {
  require2fa: boolean;
  allowedDomains: string[];
  trustedAdminIds: string[];
  sessionControls: boolean;
};

export type CommunitySettingsConfig = {
  branding: SettingsBranding;
  privacy: SettingsPrivacy;
  discovery: SettingsDiscovery;
  onboarding: SettingsOnboarding;
  groupDefaults: SettingsGroupDefaults;
  channelDefaults: SettingsChannelDefaults;
  notifications: SettingsNotifications;
  live: SettingsLive;
  commerce: SettingsCommerce;
  ai: SettingsAi;
  integrations: SettingsIntegrations;
  security: SettingsSecurity;
};

export type OwnerCommunitySettings = {
  communityId: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  longDescription: string | null;
  category: string | null;
  language: string | null;
  timezone: string | null;
  region: string | null;
  avatarUrl: string | null;
  coverImage: string | null;
  bannerUrl: string | null;
  accentColor: string | null;
  visibilityMode: VisibilityMode;
  isPrivate: boolean;
  isFeatured: boolean;
  isActive: boolean;
  isFree: boolean;
  currency: string | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  lifetimePrice: number | null;
  trialDays: number | null;
  tags: string[];
  archivedAt: string | null;
  config: CommunitySettingsConfig;
  updatedAt: string | null;
  createdAt?: string | null;
  /** Owner/worker-only. Never render as seed/demo/bot to members. */
  editorialOrigin: "editorial" | null;
};

export type UpdateOwnerSettingsInput = {
  communityId: string;
  section?: SettingsSectionId;
  // Core / general
  name?: string;
  slug?: string;
  tagline?: string | null;
  description?: string | null;
  longDescription?: string | null;
  category?: string | null;
  language?: string | null;
  timezone?: string | null;
  region?: string | null;
  // Branding columns
  avatarUrl?: string | null;
  coverImage?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  // Privacy / discovery columns
  visibilityMode?: VisibilityMode;
  isPrivate?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  // Commerce columns
  isFree?: boolean;
  currency?: string | null;
  monthlyPrice?: number | null;
  yearlyPrice?: number | null;
  lifetimePrice?: number | null;
  trialDays?: number | null;
  // Nested config (partial deep merge)
  config?: Partial<{
    branding: Partial<SettingsBranding>;
    privacy: Partial<SettingsPrivacy>;
    discovery: Partial<SettingsDiscovery>;
    onboarding: Partial<SettingsOnboarding>;
    groupDefaults: Partial<SettingsGroupDefaults>;
    channelDefaults: Partial<SettingsChannelDefaults>;
    notifications: Partial<SettingsNotifications>;
    live: Partial<SettingsLive>;
    commerce: Partial<SettingsCommerce>;
    ai: Partial<SettingsAi>;
    integrations: Partial<SettingsIntegrations>;
    security: Partial<SettingsSecurity>;
  }>;
};

export type DangerAction = "archive" | "restore" | "delete";
