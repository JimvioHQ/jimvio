/**
 * Shared types for Jimvio editorial community programming.
 */
import type { JimvioContentOrigin } from "./editorial-origin";

export type EditorialCommentSpec = {
  key: string;
  body: string;
  daysAgo: number;
  hour?: number;
  personaKey?: string;
};

export type EditorialPostSpec = {
  key: string;
  title: string;
  body: string;
  postType: "discussion" | "poll";
  origin: JimvioContentOrigin;
  daysAgo: number;
  hour?: number;
  pinned?: boolean;
  href?: string;
  pollOptions?: string[];
  comments?: EditorialCommentSpec[];
  /** Optional HTTPS image URLs for photo+text posts */
  images?: string[];
  /** Optional HTTPS video URL for video+text posts */
  videoUrl?: string | null;
  viewCount?: number;
  likeCount?: number;
  personaKey?: string;
};

export type EditorialMessageSpec = {
  key: string;
  body: string;
  daysAgo: number;
  hour?: number;
  pinned?: boolean;
  replyToKey?: string;
  personaKey?: string;
};

export type EditorialRoomSpec = {
  slug: string;
  name: string;
  description: string;
  welcomeMessage: string;
  messages: EditorialMessageSpec[];
};

export type EditorialCommunityAccess = "free" | "paid" | "private";

export type EditorialCommunitySpec = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: string;
  tags: string[];
  createdAt: string;
  welcomeTitle: string;
  welcomeMessage: string;
  rules: string;
  extraRoom: EditorialRoomSpec;
  extraRooms?: EditorialRoomSpec[];
  avatarUrl?: string;
  coverImage?: string;
  featured?: boolean;
  /** Editorial display member count (≤ 2000). Real memberships may be a smaller authorship pool. */
  targetMemberCount?: number;
  activity?: "high" | "medium" | "low";
  /** Majority free/public; small paid + private minorities. */
  access?: EditorialCommunityAccess;
  posts: EditorialPostSpec[];
};
