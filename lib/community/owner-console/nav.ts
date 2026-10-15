/**
 * Community Owner Console — navigation & domain types.
 * Permanent home: /owner/communities/[communitySlug]
 */

import type { LucideIcon } from "lucide-react";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import type { PermissionCapability } from "@/lib/community/workspace/permissions";

/** Hub list — communities the user owns or can manage. */
export const OWNER_CONSOLE_HUB = "/owner/communities";

/** Preferred member-facing management entry: /communities/{slug}/manage */
export const MANAGE_COMMUNITY_SEGMENT = "manage";

/**
 * Base path segment for Owner Console (hub). Section URLs are built with
 * `ownerConsoleHref(slug, section)` → `/owner/communities/{slug}/…`.
 */
export const OWNER_CONSOLE_BASE = OWNER_CONSOLE_HUB;

export type OwnerConsoleSectionId =
  | "overview"
  | "spaces"
  /** @deprecated Use "spaces" — kept for redirects / legacy consumers */
  | "groups"
  /** @deprecated Use "spaces" — kept for redirects / legacy consumers */
  | "channels"
  | "members"
  | "roles"
  | "content"
  | "courses"
  | "events"
  | "missions"
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
  /** Path segment under /owner/communities/[slug] (empty = overview). */
  section: string;
  /** @deprecated Prefer `section` + ownerConsoleHref — kept for verify scripts. */
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

function navItem(
  id: OwnerConsoleSectionId,
  label: string,
  section: string,
  capability: PermissionCapability,
  description: string,
  badgeKey?: OwnerNavItem["badgeKey"]
): OwnerNavItem {
  return {
    id,
    label,
    section,
    href: section ? `${OWNER_CONSOLE_BASE}/${section}` : OWNER_CONSOLE_BASE,
    capability,
    badgeKey,
    description,
  };
}

export const OWNER_NAV_ITEMS: Record<OwnerConsoleSectionId, OwnerNavItem> = {
  overview: navItem(
    "overview",
    "Overview",
    "",
    "settings.manage",
    "Community health and operating dashboard"
  ),
  spaces: navItem(
    "spaces",
    "Spaces",
    "spaces",
    "group.manage",
    "Spaces and mini workspaces"
  ),
  /** @deprecated alias — redirects to /spaces */
  groups: navItem(
    "groups",
    "Spaces",
    "spaces",
    "group.manage",
    "Spaces and mini workspaces"
  ),
  /** @deprecated alias — redirects to /spaces */
  channels: navItem(
    "channels",
    "Spaces",
    "spaces",
    "group.manage",
    "Spaces and mini workspaces"
  ),
  members: navItem(
    "members",
    "Members",
    "members",
    "members.view",
    "Roster, invites, and join requests",
    "joins"
  ),
  roles: navItem(
    "roles",
    "Roles",
    "roles",
    "roles.manage",
    "Owner, admin, moderator, and custom roles"
  ),
  content: navItem(
    "content",
    "Posts",
    "content",
    "channel.manage",
    "Posts, pins, and media library"
  ),
  courses: navItem(
    "courses",
    "Courses",
    "courses",
    "knowledge.manage",
    "Learning catalog management"
  ),
  events: navItem(
    "events",
    "Events",
    "events",
    "channel.manage",
    "Calendar, RSVP, and workshops"
  ),
  missions: navItem(
    "missions",
    "Missions",
    "missions",
    "channel.manage",
    "Challenges, submissions, and reviews"
  ),
  live: navItem(
    "live",
    "Live",
    "live",
    "live.manage",
    "Live Studio sessions and recordings",
    "live"
  ),
  commerce: navItem(
    "commerce",
    "Products",
    "commerce",
    "commerce.manage",
    "Storefront, products, orders, and revenue"
  ),
  analytics: navItem(
    "analytics",
    "Analytics",
    "analytics",
    "analytics.view",
    "Growth, engagement, and revenue"
  ),
  moderation: navItem(
    "moderation",
    "Moderation",
    "moderation",
    "moderation.view",
    "Reports, queues, and safety",
    "reports"
  ),
  ai: navItem(
    "ai",
    "Notifications",
    "ai",
    "intelligence.view",
    "Alerts and intelligence suggestions"
  ),
  automations: navItem(
    "automations",
    "Monetization",
    "automations",
    "settings.manage",
    "Billing, plans, and automation workflows"
  ),
  security: navItem(
    "security",
    "API",
    "security",
    "settings.manage",
    "API keys, access policies, and safeguards"
  ),
  integrations: navItem(
    "integrations",
    "Integrations",
    "integrations",
    "settings.manage",
    "Connected services and webhooks"
  ),
  audit: navItem(
    "audit",
    "Audit Logs",
    "audit",
    "settings.manage",
    "Administrative activity history"
  ),
  settings: navItem(
    "settings",
    "General",
    "settings",
    "settings.view",
    "Name, description, and branding"
  ),
};

/** Grouped management navigation — collapsible sections. */
export const OWNER_NAV_SECTIONS: OwnerNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    collapsible: false,
    items: ["overview"],
  },
  {
    id: "manage",
    label: "Manage",
    collapsible: true,
    items: ["spaces", "members", "roles"],
  },
  {
    id: "content",
    label: "Content",
    collapsible: true,
    items: ["content", "courses", "events", "missions", "live"],
  },
  {
    id: "community",
    label: "Community",
    collapsible: true,
    items: ["settings", "analytics", "moderation"],
  },
  {
    id: "tools",
    label: "Tools",
    collapsible: true,
    items: ["commerce", "automations", "integrations", "security", "audit", "ai"],
  },
];

/** Lean manage-mode navigation — Commerce OS–style IA. */
export const MANAGE_NAV_SECTIONS: OwnerNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    collapsible: false,
    items: ["overview"],
  },
  {
    id: "community",
    label: "Community",
    collapsible: true,
    items: ["spaces", "members", "roles"],
  },
  {
    id: "content",
    label: "Content",
    collapsible: true,
    items: ["content", "courses", "events", "missions", "live"],
  },
  {
    id: "growth",
    label: "Growth",
    collapsible: true,
    items: ["analytics", "ai", "moderation"],
  },
  {
    id: "settings",
    label: "Settings",
    collapsible: true,
    items: ["settings", "integrations"],
  },
];

export type OwnerQuickActionId =
  | "create_post"
  | "create_community"
  | "create_space"
  /** @deprecated Use create_space */
  | "create_group"
  /** @deprecated removed from UI */
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
  /** When true, shown in the dashboard Quick Actions grid. */
  primary?: boolean;
};

/**
 * Build Owner Console URL for a community slug.
 * @param section - path under the console (e.g. "spaces", "channels/abc", "")
 * @param query - optional search params (action, tab, …) — community id is NOT required
 */
/**
 * Manage Community URL — /communities/{slug}/manage/…
 * Mirrors owner console sections under the community namespace.
 */
export function manageCommunityHref(
  slug: string,
  section: string = "",
  query?: Record<string, string | undefined | null>
): string {
  const clean = section.replace(/^\/+/, "").replace(/^manage\/?/i, "");
  const normalized =
    clean === "groups" || clean.startsWith("groups/")
      ? clean.replace(/^groups/, "spaces")
      : clean === "channels" || clean.startsWith("channels/")
        ? "spaces"
        : clean;
  const base = normalized
    ? `/communities/${encodeURIComponent(slug)}/${MANAGE_COMMUNITY_SEGMENT}/${normalized}`
    : `/communities/${encodeURIComponent(slug)}/${MANAGE_COMMUNITY_SEGMENT}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== "") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export type CommunityConsoleMode = "owner" | "manage";

export function communityConsoleHref(
  slug: string,
  section: string = "",
  options?: {
    mode?: CommunityConsoleMode;
    query?: Record<string, string | undefined | null>;
  }
): string {
  const mode = options?.mode ?? "owner";
  const query = options?.query;
  return mode === "manage"
    ? manageCommunityHref(slug, section, query)
    : ownerConsoleHref(slug, section, query);
}

export function ownerConsoleHref(
  slug: string,
  section: string = "",
  query?: Record<string, string | undefined | null>
): string {
  const clean = section.replace(/^\/+/, "").replace(/^community-owner\/?/i, "");
  // Legacy groups/channels console paths → spaces
  const normalized =
    clean === "groups" || clean.startsWith("groups/")
      ? clean.replace(/^groups/, "spaces")
      : clean === "channels" || clean.startsWith("channels/")
        ? "spaces"
        : clean;
  const base = normalized
    ? `${OWNER_CONSOLE_HUB}/${encodeURIComponent(slug)}/${normalized}`
    : `${OWNER_CONSOLE_HUB}/${encodeURIComponent(slug)}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== "") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export const OWNER_QUICK_ACTIONS: OwnerQuickAction[] = [
  {
    id: "create_post",
    label: "Create Post",
    href: ({ slug }) =>
      `/create/post${slug ? `?community=${encodeURIComponent(slug)}` : ""}`,
    capability: "channel.manage",
    primary: true,
  },
  {
    id: "create_community",
    label: "Create Community",
    href: () => "/communities/create",
    capability: "settings.manage",
    primary: true,
  },
  {
    id: "invite_members",
    label: "Invite Members",
    href: ({ slug }) =>
      ownerConsoleHref(slug, "members", { action: "invite" }),
    capability: "members.invite",
    primary: true,
  },
  {
    id: "start_live",
    label: "Start Live",
    href: ({ slug }) => `/communities/${slug}/live`,
    capability: "live.manage",
    primary: true,
  },
  {
    id: "create_course",
    label: "Create Course",
    href: ({ slug }) =>
      ownerConsoleHref(slug, "courses", { action: "create" }),
    capability: "knowledge.manage",
    primary: true,
  },
  {
    id: "create_event",
    label: "Schedule Event",
    href: ({ slug }) =>
      ownerConsoleHref(slug, "events", { action: "create" }),
    capability: "channel.manage",
    primary: true,
  },
  {
    id: "open_moderation",
    label: "Open Moderation",
    href: ({ slug }) => ownerConsoleHref(slug, "moderation"),
    capability: "moderation.view",
    primary: true,
  },
  {
    id: "create_space",
    label: "Create Space",
    href: ({ slug }) => ownerConsoleHref(slug, "spaces", { action: "create" }),
    capability: "group.manage",
    primary: true,
  },
  {
    id: "community_settings",
    label: "Community Settings",
    href: ({ slug }) => ownerConsoleHref(slug, "settings"),
    capability: "settings.view",
  },
];

export type OwnerDashboardCardId =
  | "health"
  | "members"
  | "communities"
  | "revenue"
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
  trend?: string;
  trendUp?: boolean;
  sparkline?: number[];
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
  spaces: "layers",
  groups: "layers",
  channels: "layers",
  members: "users",
  roles: "shield",
  content: "file",
  courses: "graduation",
  events: "calendar",
  missions: "target",
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
