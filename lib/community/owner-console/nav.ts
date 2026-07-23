/**
 * Community Owner Console — navigation & domain types (Phase A.1).
 * Framework only — section pages are shells until later phases.
 */

import type { LucideIcon } from "lucide-react";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import type { PermissionCapability } from "@/lib/community/workspace/permissions";

export const OWNER_CONSOLE_BASE = "/community-owner";

export type OwnerConsoleSectionId =
  | "overview"
  | "groups"
  | "channels"
  | "members"
  | "roles"
  | "content"
  | "courses"
  | "events"
  | "live"
  | "commerce"
  | "analytics"
  | "moderation"
  | "ai"
  | "automations"
  | "security"
  | "integrations"
  | "audit"
  | "settings";

export type OwnerNavItem = {
  id: OwnerConsoleSectionId;
  label: string;
  href: string;
  /** Capability required to see the item (settings.manage = full console) */
  capability: PermissionCapability;
  badgeKey?: "reports" | "joins" | "live";
  description: string;
};

export type OwnerNavSection = {
  id: string;
  label: string;
  collapsible?: boolean;
  items: OwnerConsoleSectionId[];
};

export const OWNER_NAV_ITEMS: Record<OwnerConsoleSectionId, OwnerNavItem> = {
  overview: {
    id: "overview",
    label: "Overview",
    href: OWNER_CONSOLE_BASE,
    capability: "settings.manage",
    description: "Community health and operating dashboard",
  },
  groups: {
    id: "groups",
    label: "Groups",
    href: `${OWNER_CONSOLE_BASE}/groups`,
    capability: "group.manage",
    description: "Spaces and mini workspaces",
  },
  channels: {
    id: "channels",
    label: "Channels",
    href: `${OWNER_CONSOLE_BASE}/channels`,
    capability: "channel.manage",
    description: "Rooms and collaboration hubs",
  },
  members: {
    id: "members",
    label: "Members",
    href: `${OWNER_CONSOLE_BASE}/members`,
    capability: "members.view",
    badgeKey: "joins",
    description: "Roster, invites, and join requests",
  },
  roles: {
    id: "roles",
    label: "Roles & Permissions",
    href: `${OWNER_CONSOLE_BASE}/roles`,
    capability: "settings.manage",
    description: "Owner, admin, moderator, and custom roles",
  },
  content: {
    id: "content",
    label: "Content",
    href: `${OWNER_CONSOLE_BASE}/content`,
    capability: "channel.manage",
    description: "Posts, pins, and published assets",
  },
  courses: {
    id: "courses",
    label: "Courses",
    href: `${OWNER_CONSOLE_BASE}/courses`,
    capability: "knowledge.manage",
    description: "Learning catalog management",
  },
  events: {
    id: "events",
    label: "Events",
    href: `${OWNER_CONSOLE_BASE}/events`,
    capability: "channel.manage",
    description: "Calendar, RSVP, and workshops",
  },
  live: {
    id: "live",
    label: "Live",
    href: `${OWNER_CONSOLE_BASE}/live`,
    capability: "live.manage",
    badgeKey: "live",
    description: "Live Studio sessions and recordings",
  },
  commerce: {
    id: "commerce",
    label: "Commerce",
    href: `${OWNER_CONSOLE_BASE}/commerce`,
    capability: "commerce.manage",
    description: "Storefront, offers, and monetization",
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    href: `${OWNER_CONSOLE_BASE}/analytics`,
    capability: "settings.manage",
    description: "Growth, engagement, and trust",
  },
  moderation: {
    id: "moderation",
    label: "Moderation",
    href: `${OWNER_CONSOLE_BASE}/moderation`,
    capability: "pins.manage",
    badgeKey: "reports",
    description: "Reports, queues, and safety",
  },
  ai: {
    id: "ai",
    label: "AI",
    href: `${OWNER_CONSOLE_BASE}/ai`,
    capability: "intelligence.view",
    description: "Intelligence platform controls",
  },
  automations: {
    id: "automations",
    label: "Automations",
    href: `${OWNER_CONSOLE_BASE}/automations`,
    capability: "settings.manage",
    description: "Suggested workflows and rules",
  },
  security: {
    id: "security",
    label: "Security",
    href: `${OWNER_CONSOLE_BASE}/security`,
    capability: "settings.manage",
    description: "Access policies and safeguards",
  },
  integrations: {
    id: "integrations",
    label: "Integrations",
    href: `${OWNER_CONSOLE_BASE}/integrations`,
    capability: "settings.manage",
    description: "Connected services and webhooks",
  },
  audit: {
    id: "audit",
    label: "Audit Logs",
    href: `${OWNER_CONSOLE_BASE}/audit`,
    capability: "settings.manage",
    description: "Administrative activity history",
  },
  settings: {
    id: "settings",
    label: "Settings",
    href: `${OWNER_CONSOLE_BASE}/settings`,
    capability: "settings.manage",
    description: "Community profile and preferences",
  },
};

export const OWNER_NAV_SECTIONS: OwnerNavSection[] = [
  {
    id: "command",
    label: "Command",
    items: ["overview", "analytics", "ai", "automations"],
  },
  {
    id: "structure",
    label: "Structure",
    collapsible: true,
    items: ["groups", "channels", "members", "roles"],
  },
  {
    id: "experience",
    label: "Experience",
    collapsible: true,
    items: ["content", "courses", "events", "live", "commerce"],
  },
  {
    id: "trust",
    label: "Trust & Ops",
    collapsible: true,
    items: ["moderation", "security", "integrations", "audit", "settings"],
  },
];

export type OwnerQuickActionId =
  | "create_group"
  | "create_channel"
  | "invite_members"
  | "start_live"
  | "create_course"
  | "create_event"
  | "open_moderation"
  | "community_settings";

export type OwnerQuickAction = {
  id: OwnerQuickActionId;
  label: string;
  href: (ctx: { communityId: string; slug: string }) => string;
  capability: PermissionCapability;
};

export const OWNER_QUICK_ACTIONS: OwnerQuickAction[] = [
  {
    id: "create_group",
    label: "Create Group",
    href: ({ communityId }) =>
      `${OWNER_CONSOLE_BASE}/groups?community=${communityId}&action=create`,
    capability: "group.manage",
  },
  {
    id: "create_channel",
    label: "Create Channel",
    href: ({ communityId }) =>
      `${OWNER_CONSOLE_BASE}/channels?community=${communityId}&action=create`,
    capability: "channel.manage",
  },
  {
    id: "invite_members",
    label: "Invite Members",
    href: ({ communityId }) =>
      `${OWNER_CONSOLE_BASE}/members?community=${communityId}&action=invite`,
    capability: "members.invite",
  },
  {
    id: "start_live",
    label: "Start Live",
    href: ({ slug }) => `/communities/${slug}/live`,
    capability: "live.manage",
  },
  {
    id: "create_course",
    label: "Create Course",
    href: ({ communityId }) =>
      `${OWNER_CONSOLE_BASE}/courses?community=${communityId}&action=create`,
    capability: "knowledge.manage",
  },
  {
    id: "create_event",
    label: "Create Event",
    href: ({ communityId }) =>
      `${OWNER_CONSOLE_BASE}/events?community=${communityId}&action=create`,
    capability: "channel.manage",
  },
  {
    id: "open_moderation",
    label: "Open Moderation",
    href: ({ communityId }) =>
      `${OWNER_CONSOLE_BASE}/moderation?community=${communityId}`,
    capability: "pins.manage",
  },
  {
    id: "community_settings",
    label: "Community Settings",
    href: ({ communityId }) =>
      `${OWNER_CONSOLE_BASE}/settings?community=${communityId}`,
    capability: "settings.manage",
  },
];

export type OwnerDashboardCardId =
  | "health"
  | "members"
  | "growth"
  | "reports"
  | "joins"
  | "live"
  | "events"
  | "courses"
  | "commerce"
  | "ai"
  | "quick_actions"
  | "activity";

export type OwnerDashboardMetric = {
  id: OwnerDashboardCardId;
  label: string;
  value: string | number;
  hint: string;
  href?: string;
  tone?: "default" | "accent" | "warn" | "success";
};

export type OwnerCommunitySummary = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  memberCount: number;
  role: WorkspaceRole;
};

export type OwnerConsoleBadges = {
  reports: number;
  joins: number;
  live: number;
};

/** Icon keys resolved in UI layer (avoids Lucide in shared config). */
export const OWNER_SECTION_ICON_KEYS: Record<OwnerConsoleSectionId, string> = {
  overview: "layout",
  groups: "layers",
  channels: "hash",
  members: "users",
  roles: "shield",
  content: "file",
  courses: "graduation",
  events: "calendar",
  live: "radio",
  commerce: "shop",
  analytics: "chart",
  moderation: "flag",
  ai: "sparkles",
  automations: "wand",
  security: "lock",
  integrations: "puzzle",
  audit: "scroll",
  settings: "settings",
};

export type { LucideIcon };
