/**
 * Role catalog, templates, labels — capability-driven (no role-name auth).
 */

import type { PermissionCapability } from "@/lib/community/workspace/permissions";
import { ALL_CAPABILITIES, capabilitiesForRole } from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import type {
  OwnerRoleTemplate,
  PermissionCatalogItem,
  PermissionCategoryId,
  RoleTemplateKey,
  SystemRoleKey,
} from "./types";

export const SYSTEM_ROLE_LABELS: Record<SystemRoleKey, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  creator: "Creator",
  mentor: "Mentor",
  verified: "Verified",
  vip: "VIP",
  member: "Member",
  guest: "Guest",
};

export const SYSTEM_ROLE_DESCRIPTIONS: Record<SystemRoleKey, string> = {
  owner: "Full control. Protected and non-transferable via this console.",
  admin: "Full operational control except ownership transfer.",
  moderator: "Safety, members, and content moderation.",
  creator: "Publish content, courses, live, and commerce tools.",
  mentor: "Guide members and manage learning spaces.",
  verified: "Trusted member with elevated presence.",
  vip: "Premium member privileges.",
  member: "Standard community access.",
  guest: "Limited public/preview access.",
};

export const SYSTEM_ROLE_COLORS: Record<SystemRoleKey, string> = {
  owner: "#fd5000",
  admin: "#ea580c",
  moderator: "#7c3aed",
  creator: "#db2777",
  mentor: "#0891b2",
  verified: "#2563eb",
  vip: "#ca8a04",
  member: "#64748b",
  guest: "#94a3b8",
};

export const SYSTEM_ROLE_ICONS: Record<SystemRoleKey, string> = {
  owner: "👑",
  admin: "🛡️",
  moderator: "⚖️",
  creator: "✨",
  mentor: "🎓",
  verified: "✅",
  vip: "💎",
  member: "👤",
  guest: "👁️",
};

export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategoryId, string> = {
  community: "Community",
  groups: "Groups",
  channels: "Channels",
  members: "Members",
  roles: "Roles",
  moderation: "Moderation",
  content: "Content",
  knowledge: "Knowledge",
  courses: "Courses",
  events: "Events",
  live: "Live",
  commerce: "Commerce",
  analytics: "Analytics",
  ai: "AI",
  security: "Security",
  integrations: "Integrations",
  audit: "Audit Logs",
};

export const PERMISSION_CATALOG: PermissionCatalogItem[] = [
  { id: "community.view", label: "View community", description: "Access community surfaces", category: "community" },
  { id: "community.edit", label: "Edit community", description: "Update community profile settings", category: "community", alias: "community.edit" },
  { id: "group.create", label: "Create groups", description: "Create new groups/spaces", category: "groups", alias: "groups.create" },
  { id: "group.manage", label: "Manage groups", description: "Configure groups and staff", category: "groups", alias: "groups.manage" },
  { id: "group.delete", label: "Delete groups", description: "Archive or delete groups", category: "groups", alias: "groups.delete" },
  { id: "channel.create", label: "Create channels", description: "Create rooms/channels", category: "channels", alias: "channels.create" },
  { id: "channel.read", label: "View channels", description: "Read channel content", category: "channels" },
  { id: "channel.write", label: "Post in channels", description: "Post, reply, and react", category: "channels" },
  { id: "channel.manage", label: "Manage channels", description: "Configure channel settings", category: "channels", alias: "channels.manage" },
  { id: "channel.delete", label: "Delete channels", description: "Archive or delete channels", category: "channels", alias: "channels.delete" },
  { id: "members.view", label: "View members", description: "See community roster", category: "members" },
  { id: "members.invite", label: "Invite members", description: "Send invites and share links", category: "members" },
  { id: "members.manage", label: "Manage members", description: "Notes, groups, join requests", category: "members" },
  { id: "members.role", label: "Change roles", description: "Assign system or custom roles", category: "members" },
  { id: "members.ban", label: "Moderate members", description: "Mute, timeout, suspend, ban", category: "members" },
  { id: "members.remove", label: "Remove members", description: "Remove members from community", category: "members" },
  { id: "roles.view", label: "View roles", description: "See role definitions", category: "roles" },
  { id: "roles.manage", label: "Manage roles", description: "Create and edit roles & permissions", category: "roles" },
  { id: "moderation.view", label: "View moderation", description: "Access reports and safety queues", category: "moderation" },
  { id: "moderation.manage", label: "Manage moderation", description: "Resolve reports and configure auto-mod", category: "moderation" },
  { id: "moderation.warn", label: "Warn members", description: "Issue formal warnings", category: "moderation" },
  { id: "moderation.mute", label: "Mute members", description: "Mute and timeout members", category: "moderation" },
  { id: "moderation.suspend", label: "Suspend members", description: "Temporarily suspend access", category: "moderation" },
  { id: "moderation.ban", label: "Ban members", description: "Permanently ban members", category: "moderation" },
  { id: "moderation.delete", label: "Delete content", description: "Remove flagged content", category: "moderation" },
  { id: "pins.manage", label: "Pin content", description: "Pin and feature posts", category: "content" },
  { id: "content.manage", label: "Manage content", description: "Moderate posts and assets", category: "content" },
  { id: "files.upload", label: "Upload files", description: "Upload media and documents", category: "content" },
  { id: "knowledge.manage", label: "Manage knowledge", description: "Courses and knowledge base", category: "knowledge" },
  { id: "events.manage", label: "Manage events", description: "Create and run events", category: "events" },
  { id: "live.manage", label: "Manage live", description: "Start and host live sessions", category: "live" },
  { id: "commerce.manage", label: "Manage commerce", description: "Storefront and monetization", category: "commerce" },
  { id: "analytics.view", label: "View analytics", description: "Growth and engagement metrics", category: "analytics" },
  { id: "analytics.export", label: "Export analytics", description: "Download analytics reports", category: "analytics" },
  { id: "analytics.manage", label: "Manage analytics", description: "Configure analytics preferences", category: "analytics" },
  { id: "intelligence.view", label: "View AI insights", description: "Intelligence platform access", category: "ai" },
  { id: "security.manage", label: "Security settings", description: "Access policies and safeguards", category: "security" },
  { id: "integrations.manage", label: "Manage integrations", description: "Connected services and webhooks", category: "integrations" },
  { id: "automations.manage", label: "Manage automations", description: "Workflows and rules", category: "integrations" },
  { id: "settings.view", label: "View settings", description: "View community configuration", category: "community" },
  { id: "settings.manage", label: "Community settings", description: "Edit community configuration", category: "community" },
  { id: "audit.view", label: "View audit logs", description: "Administrative activity history", category: "audit" },
];

export const ROLE_TEMPLATES: OwnerRoleTemplate[] = [
  {
    key: "community_admin",
    name: "Community Admin",
    description: "Near-owner operational control for trusted operators.",
    icon: "🛡️",
    color: "#ea580c",
    inheritsFrom: "admin",
    capabilities: [...capabilitiesForRole("admin")],
  },
  {
    key: "community_moderator",
    name: "Community Moderator",
    description: "Safety, roster, and content moderation.",
    icon: "⚖️",
    color: "#7c3aed",
    inheritsFrom: "moderator",
    capabilities: [...capabilitiesForRole("moderator")],
  },
  {
    key: "event_manager",
    name: "Event Manager",
    description: "Plan and run community events.",
    icon: "📅",
    color: "#0891b2",
    inheritsFrom: "creator",
    capabilities: [
      "community.view",
      "channel.read",
      "channel.write",
      "events.manage",
      "members.view",
      "analytics.view",
      "files.upload",
    ],
  },
  {
    key: "course_manager",
    name: "Course Manager",
    description: "Build and manage learning catalogs.",
    icon: "📚",
    color: "#2563eb",
    inheritsFrom: "creator",
    capabilities: [
      "community.view",
      "channel.read",
      "channel.write",
      "knowledge.manage",
      "members.view",
      "files.upload",
      "analytics.view",
    ],
  },
  {
    key: "commerce_manager",
    name: "Commerce Manager",
    description: "Storefront, offers, and monetization.",
    icon: "🛒",
    color: "#16a34a",
    inheritsFrom: "creator",
    capabilities: [
      "community.view",
      "commerce.manage",
      "channel.read",
      "members.view",
      "analytics.view",
      "files.upload",
    ],
  },
  {
    key: "support_agent",
    name: "Support Agent",
    description: "Help members and triage join requests.",
    icon: "🎧",
    color: "#0d9488",
    inheritsFrom: "moderator",
    capabilities: [
      "community.view",
      "members.view",
      "members.invite",
      "members.manage",
      "channel.read",
      "channel.write",
      "moderation.manage",
    ],
  },
  {
    key: "mentor",
    name: "Mentor",
    description: "Guide cohorts inside focused groups.",
    icon: "🎓",
    color: "#0891b2",
    inheritsFrom: "mentor",
    capabilities: [...capabilitiesForRole("mentor")],
  },
  {
    key: "content_creator",
    name: "Content Creator",
    description: "Publish posts, courses, and live sessions.",
    icon: "✨",
    color: "#db2777",
    inheritsFrom: "creator",
    capabilities: [...capabilitiesForRole("creator")],
  },
];

export function getTemplate(key: string): OwnerRoleTemplate | undefined {
  return ROLE_TEMPLATES.find((t) => t.key === key);
}

export function slugifyRoleName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "role";
}

export function sanitizeCapabilities(
  input: readonly string[] | null | undefined
): PermissionCapability[] {
  const out = new Set<PermissionCapability>();
  for (const raw of input ?? []) {
    const hit = PERMISSION_CATALOG.find(
      (c) => c.id === raw || c.alias === raw
    );
    if (hit) out.add(hit.id);
  }
  return Array.from(out);
}

export function systemRoleCapabilities(role: WorkspaceRole): PermissionCapability[] {
  return Array.from(capabilitiesForRole(role));
}

export { ALL_CAPABILITIES };
export type { RoleTemplateKey };
