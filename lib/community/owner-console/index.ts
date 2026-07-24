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
} from "./nav";

export {
  OWNER_CONSOLE_BASE,
  OWNER_CONSOLE_HUB,
  OWNER_NAV_ITEMS,
  OWNER_NAV_SECTIONS,
  OWNER_QUICK_ACTIONS,
  OWNER_SECTION_ICON_KEYS,
  ownerConsoleHref,
} from "./nav";

export {
  canEnterOwnerConsole,
  listManageableCommunities,
  listOwnedCommunities,
  sectionPath,
  type ManageableCommunityRow,
} from "./access";

export { useOwnerConsoleUiStore } from "./store";

export { buildOwnerDashboardMetrics } from "./dashboard-metrics";

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

