/**
 * Knowledge & Collaboration Engine — domain model (Phase 3).
 * Knowledge is derived from collaboration objects (messages / threads),
 * not a parallel messaging system.
 */

export const KNOWLEDGE_KINDS = [
  "faq",
  "tutorial",
  "guide",
  "best_practice",
  "course_note",
  "resource",
  "knowledge_card",
  "collection",
  "learning_path",
  "important_discussion",
] as const;

export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export const KNOWLEDGE_KIND_LABELS: Record<KnowledgeKind, string> = {
  faq: "FAQ",
  tutorial: "Tutorial",
  guide: "Guide",
  best_practice: "Best Practice",
  course_note: "Course Note",
  resource: "Resource",
  knowledge_card: "Knowledge Card",
  collection: "Collection",
  learning_path: "Learning Path",
  important_discussion: "Important Discussion",
};

export const ANSWER_PICKS = [
  "accepted",
  "verified",
  "community",
  "moderator",
  "owner",
] as const;

export type AnswerPick = (typeof ANSWER_PICKS)[number];

export const ANSWER_PICK_LABELS: Record<AnswerPick, string> = {
  accepted: "Accepted Answer",
  verified: "Verified Answer",
  community: "Community Pick",
  moderator: "Moderator Pick",
  owner: "Owner Pick",
};

export const FILE_CATEGORIES = [
  "general",
  "guides",
  "templates",
  "assets",
  "recordings",
  "course",
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];

export type KnowledgeSourceType = "message" | "thread" | "discussion" | "manual";

export type KnowledgeCard = {
  id: string;
  roomId: string;
  communityId?: string | null;
  kind: KnowledgeKind;
  title: string;
  body: string;
  sourceType: KnowledgeSourceType;
  sourceMessageId: string | null;
  sourceThreadId: string | null;
  tags: string[];
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByName: string | null;
};

export type AnswerMark = {
  messageId: string;
  roomId: string;
  pick: AnswerPick;
  markedAt: string;
  markedBy: string | null;
};

export type ThreadMeta = {
  threadId: string;
  roomId: string;
  solved: boolean;
  featured: boolean;
  pinned: boolean;
  verifiedAnswerId: string | null;
  summary: string | null;
  updatedAt: string;
};

export type FileAssetMeta = {
  /** Stable key: `${messageId}::${url}` */
  key: string;
  roomId: string;
  messageId: string;
  url: string;
  description: string;
  category: FileCategory;
  tags: string[];
  relatedCourseIds: string[];
  relatedProductIds: string[];
  relatedEventIds: string[];
  updatedAt: string;
};

export type CollaborationDiscoveryScope =
  | "messages"
  | "knowledge"
  | "threads"
  | "files"
  | "media"
  | "members"
  | "groups"
  | "channels"
  | "courses"
  | "products"
  | "events"
  | "pinned";
