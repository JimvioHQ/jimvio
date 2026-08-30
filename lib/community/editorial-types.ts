/**
 * Shared types for Jimvio editorial community programming.
 */
import type { JimvioContentOrigin } from "./editorial-origin";

export type EditorialCommentSpec = {
  key: string;
  body: string;
  daysAgo: number;
  hour?: number;
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
  posts: EditorialPostSpec[];
};
