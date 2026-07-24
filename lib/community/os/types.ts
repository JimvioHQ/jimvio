/**
 * Creator Collaboration OS — domain types (Phase 4).
 * Extends workspace + knowledge; never forks chat.
 */

export const COLLAB_OBJECT_KINDS = [
  "task",
  "project",
  "meeting_notes",
  "learning_notes",
  "knowledge_card",
  "resource",
  "announcement",
  "action_item",
] as const;

export type CollabObjectKind = (typeof COLLAB_OBJECT_KINDS)[number];

export const COLLAB_OBJECT_LABELS: Record<CollabObjectKind, string> = {
  task: "Task",
  project: "Project",
  meeting_notes: "Meeting Notes",
  learning_notes: "Learning Notes",
  knowledge_card: "Knowledge Card",
  resource: "Resource",
  announcement: "Announcement",
  action_item: "Action Item",
};

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "completed",
  "assigned",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type CollaborationTask = {
  id: string;
  communityId: string | null;
  roomId: string | null;
  groupId: string | null;
  title: string;
  body: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  sourceMessageId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollaborationEvent = {
  id: string;
  communityId: string | null;
  roomId: string | null;
  groupId: string | null;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  speakers: string[];
  rsvpCount: number;
  rsvpUserIds: string[];
  recordingUrl: string | null;
  sourceMessageId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CommunityScoreBreakdown = {
  knowledgePoints: number;
  helpfulness: number;
  contributionScore: number;
  creatorXp: number;
  total: number;
  level: number;
  badges: string[];
};

export const GROUP_TAB_IDS = [
  "overview",
  "discussion",
  "knowledge",
  "resources",
  "courses",
  "events",
  "members",
  "live",
  "store",
  "activity",
  "ai",
] as const;

export type GroupTabId = (typeof GROUP_TAB_IDS)[number];

export const GROUP_TABS: { id: GroupTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "discussion", label: "Discussion" },
  { id: "knowledge", label: "Knowledge" },
  { id: "resources", label: "Resources" },
  { id: "courses", label: "Courses" },
  { id: "events", label: "Events" },
  { id: "members", label: "Members" },
  { id: "live", label: "Live" },
  { id: "store", label: "Store" },
  { id: "activity", label: "Activity" },
  { id: "ai", label: "AI" },
];

/** Sidebar nav for Group Creator Workspace (Settings is owner-only). */
export const GROUP_SIDEBAR_IDS = [
  "overview",
  "discussion",
  "knowledge",
  "resources",
  "events",
  "courses",
  "members",
  "store",
  "live",
  "activity",
  "ai",
  "settings",
] as const;

export type GroupSidebarId = (typeof GROUP_SIDEBAR_IDS)[number];

export const GROUP_SIDEBAR: { id: GroupSidebarId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "discussion", label: "Discussion" },
  { id: "knowledge", label: "Knowledge" },
  { id: "resources", label: "Resources" },
  { id: "events", label: "Events" },
  { id: "courses", label: "Courses" },
  { id: "members", label: "Members" },
  { id: "store", label: "Store" },
  { id: "live", label: "Live" },
  { id: "activity", label: "Activity" },
  { id: "ai", label: "AI" },
  { id: "settings", label: "Settings" },
];

export const RESOURCE_LIBRARY_SHELVES = [
  "pdf",
  "video",
  "image",
  "links",
  "templates",
  "downloads",
] as const;

export type ResourceLibraryShelf = (typeof RESOURCE_LIBRARY_SHELVES)[number];
