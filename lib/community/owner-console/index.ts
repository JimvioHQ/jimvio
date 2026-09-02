export type {
  OwnerCommunitySummary,
  OwnerConsoleBadges,
  OwnerConsoleSectionId,
  OwnerDashboardCardId,
  OwnerDashboardMetric,
  OwnerNavItem,
  OwnerNavSection,
  OwnerQuickAction,
  OwnerQuickActionId,
  CommunityConsoleMode,
} from "./nav";

export {
  OWNER_CONSOLE_BASE,
  OWNER_CONSOLE_HUB,
  MANAGE_COMMUNITY_SEGMENT,
  OWNER_NAV_ITEMS,
  OWNER_NAV_SECTIONS,
  MANAGE_NAV_SECTIONS,
  OWNER_QUICK_ACTIONS,
  OWNER_SECTION_ICON_KEYS,
  ownerConsoleHref,
  manageCommunityHref,
  communityConsoleHref,
} from "./nav";

export {
  canEnterOwnerConsole,
  listManageableCommunities,
  listOwnedCommunities,
  sectionPath,
  type ManageableCommunityRow,
} from "./access";

export { useOwnerConsoleUiStore } from "./store";

export { buildOwnerDashboardMetrics, buildManageDashboardMetrics } from "./dashboard-metrics";

export * from "./groups";

// Channels — import from `@/lib/community/owner-console/channels` for full surface.
// Selective re-exports avoid colliding with groups helpers of the same name.
export type {
  ChannelAutomationConfig,
  ChannelBehaviorConfig,
  ChannelPermissionConfig,
  ChannelSettingsTab,
  ChannelVisibilityMode,
  CreateOwnerChannelInput,
  OwnerChannelAction,
  OwnerChannelAnalytics,
  OwnerChannelKind,
  OwnerChannelListItem,
  UpdateOwnerChannelInput,
} from "./channels";

export {
  CHANNEL_KIND_LABELS,
  CHANNEL_SETTINGS_TABS,
  CHANNEL_TEMPLATES,
  CHANNEL_VISIBILITY_LABELS,
  OWNER_CHANNEL_KINDS,
  resolveChannelManageContext,
  mapRoomToOwnerChannel,
} from "./channels";

// Members — import from `@/lib/community/owner-console/members` for full surface.
export type {
  OwnerJoinRequest,
  OwnerMemberAction,
  OwnerMemberAnalytics,
  OwnerMemberDetail,
  OwnerMemberInvite,
  OwnerMemberListItem,
  OwnerMemberOverview,
} from "./members";

export {
  MEMBER_ASSIGNABLE_ROLES,
  MEMBER_FILTER_STATUSES,
  MEMBER_PROFILE_TABS,
  resolveMemberManageContext,
  mapMembershipToOwnerMember,
} from "./members";

// Roles — import from `@/lib/community/owner-console/roles` for full surface.
export type {
  OwnerRoleAnalytics,
  OwnerRoleAuditEntry,
  OwnerRoleListItem,
  OwnerRoleTemplate,
  PermissionCatalogItem,
  RoleEditorTab,
} from "./roles";

export {
  PERMISSION_CATALOG,
  ROLE_EDITOR_TABS,
  ROLE_TEMPLATES,
  SYSTEM_ROLE_KEYS,
  resolveRoleManageContext,
  mapCustomRoleRow,
} from "./roles";

// Moderation — import from `@/lib/community/owner-console/moderation` for full surface.
export type {
  OwnerAppealItem,
  OwnerAutoModRule,
  OwnerModerationAnalytics,
  OwnerModerationOverview,
  OwnerReportListItem,
} from "./moderation";

export {
  MODERATION_ACTIONS,
  MODERATION_QUEUES,
  QUEUE_LABELS,
  resolveModerationContext,
  mapReportRow,
} from "./moderation";

// Settings — import from `@/lib/community/owner-console/settings` for full surface.
export type {
  CommunitySettingsConfig,
  OwnerCommunitySettings,
  SettingsSectionId,
  UpdateOwnerSettingsInput,
} from "./settings";

export {
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_LABELS,
  resolveSettingsContext,
  mapCommunitySettings,
} from "./settings";

// Analytics — import from `@/lib/community/owner-console/analytics` for full surface.
export type {
  AnalyticsSectionId,
  OwnerAnalyticsBundle,
  OwnerAnalyticsOverview,
} from "./analytics";

export {
  ANALYTICS_SECTIONS,
  SECTION_LABELS,
  resolveAnalyticsContext,
  computeOwnerAnalytics,
} from "./analytics";

