/**
 * Settings section catalog and default config.
 */

import type {
  CommunitySettingsConfig,
  SettingsSectionId,
} from "./types";

export const SETTINGS_SECTION_LABELS: Record<SettingsSectionId, string> = {
  general: "General",
  branding: "Branding",
  info: "Community Info",
  privacy: "Privacy",
  discovery: "Discovery",
  onboarding: "Onboarding",
  groups: "Spaces Defaults",
  channels: "Rooms Defaults",
  notifications: "Notifications",
  integrations: "Integrations",
  commerce: "Commerce",
  live: "Live",
  ai: "AI",
  security: "Security",
  danger: "Danger Zone",
};

export const SETTINGS_SECTION_DESCRIPTIONS: Record<SettingsSectionId, string> = {
  general: "Name, slug, locale, and core identity.",
  branding: "Logo, cover, colors, and visual theme.",
  info: "Long-form description and public profile copy.",
  privacy: "Visibility, invites, and access controls.",
  discovery: "Search, SEO, tags, and social preview.",
  onboarding: "Welcome flow, rules, and default destinations.",
  groups: "Starter Spaces and default Space permissions.",
  channels: "Default room templates and behaviors.",
  notifications: "Email, push, and announcement preferences.",
  integrations: "API, webhooks, and external apps (future-ready).",
  commerce: "Store, memberships, affiliates, and currency.",
  live: "Recording, waiting room, and screen share defaults.",
  ai: "Summaries, moderation assist, and recommendations.",
  security: "2FA, domains, trusted admins, and sessions.",
  danger: "Archive or permanently delete this community.",
};

export const COMMUNITY_CATEGORIES = [
  "Business",
  "Tech",
  "Marketing",
  "Finance",
  "Fitness",
  "Education",
  "Creator",
  "Other",
] as const;

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
] as const;

export const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Singapore",
] as const;

export function defaultSettingsConfig(): CommunitySettingsConfig {
  return {
    branding: {
      accentColor: "#fd5000",
      theme: "system",
      icon: null,
      bannerUrl: null,
    },
    privacy: {
      visibility: "public",
      approvalRequired: false,
      ageRestriction: null,
    },
    discovery: {
      searchVisible: true,
      featured: false,
      tags: [],
      seoTitle: null,
      seoDescription: null,
      socialPreviewUrl: null,
    },
    onboarding: {
      welcomeTitle: null,
      welcomeMessage: null,
      rules: null,
      requiredSteps: [],
      defaultGroupId: null,
      defaultChannelId: null,
    },
    groupDefaults: {
      templateKey: null,
      autoCreateStarter: false,
      defaultPermissions: [],
    },
    channelDefaults: {
      templateKey: null,
      defaultTabs: ["chat", "feed"],
      slowModeSeconds: 0,
      threadsEnabled: true,
    },
    notifications: {
      email: true,
      push: true,
      mentions: true,
      announcements: true,
      events: true,
      commerce: true,
    },
    live: {
      recordingDefault: false,
      waitingRoom: true,
      screenShareDefault: true,
    },
    commerce: {
      storeEnabled: true,
      affiliateEnabled: false,
      donationsEnabled: false,
      membershipsEnabled: true,
      currency: "USD",
      taxReady: false,
    },
    ai: {
      summaries: true,
      knowledgeSuggestions: true,
      moderationAssistance: true,
      recommendations: true,
      automation: false,
    },
    integrations: {
      apiEnabled: false,
      webhooksEnabled: false,
      externalAppsEnabled: false,
      ssoPlaceholder: false,
    },
    security: {
      require2fa: false,
      allowedDomains: [],
      trustedAdminIds: [],
      sessionControls: true,
    },
  };
}

export function slugifyCommunity(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "community"
  );
}
