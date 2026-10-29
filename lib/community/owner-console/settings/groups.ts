/**
 * Settings groups shown to owners (design: General, Visibility, Profile &
 * About, Community Access, Customization, Integrations, Advanced, Danger
 * Zone). Each group renders one or more underlying settings sections, so
 * the API and saved data are unchanged.
 */
import type { SettingsSectionId } from "./types";

export type SettingsGroupId =
  | "general"
  | "visibility"
  | "profile"
  | "access"
  | "customization"
  | "integrations"
  | "advanced"
  | "danger";

export type SettingsGroup = {
  id: SettingsGroupId;
  label: string;
  description: string;
  title: string;
  subtitle: string;
  sections: SettingsSectionId[];
};

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    id: "general",
    label: "General",
    description: "Name, URL, category, language",
    title: "General Information",
    subtitle: "Basic details about your community.",
    sections: ["general"],
  },
  {
    id: "visibility",
    label: "Visibility",
    description: "Public, private or hidden",
    title: "Visibility",
    subtitle: "Who can find and see your community.",
    sections: ["privacy", "discovery"],
  },
  {
    id: "profile",
    label: "Profile & About",
    description: "Community profile details",
    title: "Profile & About",
    subtitle: "What visitors read about your community.",
    sections: ["info", "onboarding"],
  },
  {
    id: "access",
    label: "Community Access",
    description: "Free or paid & access control",
    title: "Community Access",
    subtitle: "Control who can join and what it costs.",
    sections: ["commerce"],
  },
  {
    id: "customization",
    label: "Customization",
    description: "Logo, cover, colors, theme",
    title: "Customization",
    subtitle: "Logo, cover image, colors and theme.",
    sections: ["branding"],
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Connect third-party tools",
    title: "Integrations",
    subtitle: "Connected apps and webhooks.",
    sections: ["integrations"],
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Notifications, live, AI, security",
    title: "Advanced",
    subtitle: "Defaults for spaces, rooms, notifications, live, AI and security.",
    sections: ["notifications", "groups", "channels", "live", "ai", "security"],
  },
  {
    id: "danger",
    label: "Danger Zone",
    description: "Archive or delete this community",
    title: "Danger Zone",
    subtitle: "Actions that cannot be easily undone.",
    sections: ["danger"],
  },
];

const GROUP_IDS = new Set<string>(SETTINGS_GROUPS.map((g) => g.id));

/** Resolve a ?tab= value (group id or legacy section id) to a group. */
export function settingsGroupForTab(tab: string | null | undefined): SettingsGroupId | null {
  if (!tab) return null;
  if (GROUP_IDS.has(tab)) return tab as SettingsGroupId;
  const owner = SETTINGS_GROUPS.find((g) => (g.sections as readonly string[]).includes(tab));
  return owner?.id ?? null;
}

export function settingsGroup(id: SettingsGroupId): SettingsGroup {
  return SETTINGS_GROUPS.find((g) => g.id === id) ?? SETTINGS_GROUPS[0];
}
