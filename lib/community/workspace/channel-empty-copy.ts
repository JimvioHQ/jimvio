/**
 * Channel empty-state + read-only composer copy.
 * Keeps ChatRoom / PostsRoom free of per-template branching.
 */

import type { ChannelType } from "./types";

export type ChannelEmptyCopy = {
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel: string;
  readOnlyTitle: string;
  readOnlyDescription: string;
};

const BY_TYPE: Record<ChannelType, ChannelEmptyCopy> = {
  announcement: {
    emptyTitle: "Publish your first announcement",
    emptyDescription:
      "Share updates, launches, and important news with this channel.",
    emptyActionLabel: "Write announcement",
    readOnlyTitle: "Announcements only",
    readOnlyDescription:
      "Members can read. Only owners, admins, and moderators can post.",
  },
  discussion: {
    emptyTitle: "Start the conversation",
    emptyDescription: "Say hello, ask a question, or share what's on your mind.",
    emptyActionLabel: "Write a message",
    readOnlyTitle: "Only admins can send messages in this Space.",
    readOnlyDescription:
      "You can read the conversation and scroll history. Messaging is limited to community admins.",
  },
  qa: {
    emptyTitle: "Ask your first question",
    emptyDescription: "Members can ask; publishers and staff can answer.",
    emptyActionLabel: "Ask a question",
    readOnlyTitle: "Posting is restricted",
    readOnlyDescription: "Only authorized publishers can post questions here.",
  },
  resources: {
    emptyTitle: "Upload your first resource",
    emptyDescription: "Share guides, links, and docs members can reuse.",
    emptyActionLabel: "Add resource",
    readOnlyTitle: "Publishing is restricted",
    readOnlyDescription: "Only authorized publishers can add resources.",
  },
  knowledge: {
    emptyTitle: "Create your first knowledge article",
    emptyDescription:
      "Capture answers and guides so the group can find them later.",
    emptyActionLabel: "Create article",
    readOnlyTitle: "Publishing is restricted",
    readOnlyDescription: "Only authorized publishers can add knowledge.",
  },
  files: {
    emptyTitle: "Upload your first file",
    emptyDescription: "Docs, decks, and shared assets live here.",
    emptyActionLabel: "Upload file",
    readOnlyTitle: "Uploading is restricted",
    readOnlyDescription: "Only authorized publishers can upload files.",
  },
  media: {
    emptyTitle: "Add your first media",
    emptyDescription: "Photos, clips, and galleries for this channel.",
    emptyActionLabel: "Add media",
    readOnlyTitle: "Uploading is restricted",
    readOnlyDescription: "Only authorized publishers can add media.",
  },
  events: {
    emptyTitle: "Create your first event",
    emptyDescription: "Schedule meetups, workshops, and group sessions.",
    emptyActionLabel: "Create event",
    readOnlyTitle: "Creating events is restricted",
    readOnlyDescription: "Only authorized publishers can create events.",
  },
  voice: {
    emptyTitle: "Start the first voice session",
    emptyDescription: "Jump in when you are ready — hangouts happen here.",
    emptyActionLabel: "Open voice",
    readOnlyTitle: "Voice hosting is restricted",
    readOnlyDescription: "Only authorized hosts can start voice sessions.",
  },
  live: {
    emptyTitle: "Go live",
    emptyDescription: "Stream workshops and office hours from Live Studio.",
    emptyActionLabel: "Open Live",
    readOnlyTitle: "Going live is restricted",
    readOnlyDescription: "Only authorized hosts can start a live session.",
  },
  course: {
    emptyTitle: "Start the course discussion",
    emptyDescription: "Cohort chat for lessons, questions, and wins.",
    emptyActionLabel: "Write a message",
    readOnlyTitle: "Posting is restricted",
    readOnlyDescription: "Only authorized publishers can post here.",
  },
  signals: {
    emptyTitle: "Post your first signal",
    emptyDescription: "Share alerts and updates members follow closely.",
    emptyActionLabel: "Post signal",
    readOnlyTitle: "This is a signals channel.",
    readOnlyDescription: "Only authorized publishers can post signals.",
  },
};

const SUPPORT_COPY: ChannelEmptyCopy = {
  emptyTitle: "Ask your first question",
  emptyDescription: "Describe what you need help with — staff will respond.",
  emptyActionLabel: "Ask for help",
  readOnlyTitle: "Posting is restricted",
  readOnlyDescription: "Only authorized members can open support threads.",
};

const INTRO_COPY: ChannelEmptyCopy = {
  emptyTitle: "Introduce yourself",
  emptyDescription: "Tell the group who you are and what you are building.",
  emptyActionLabel: "Say hello",
  readOnlyTitle: "Posting is restricted",
  readOnlyDescription: "Only authorized publishers can post introductions.",
};

const WINS_COPY: ChannelEmptyCopy = {
  emptyTitle: "Share your first win",
  emptyDescription: "Celebrate progress — big or small — with the group.",
  emptyActionLabel: "Share a win",
  readOnlyTitle: "Posting is restricted",
  readOnlyDescription: "Only authorized publishers can post wins.",
};

const CAMPAIGN_COPY: ChannelEmptyCopy = {
  emptyTitle: "Launch your first campaign",
  emptyDescription: "Announce launches, drops, and coordinated pushes here.",
  emptyActionLabel: "Launch campaign",
  readOnlyTitle: "This is a campaigns channel.",
  readOnlyDescription: "Only authorized publishers can launch campaigns.",
};

const MARKETPLACE_COPY: ChannelEmptyCopy = {
  emptyTitle: "Post your first offer",
  emptyDescription: "List buys, sells, and member offers in one place.",
  emptyActionLabel: "Post offer",
  readOnlyTitle: "Posting is restricted",
  readOnlyDescription: "Only authorized publishers can post offers.",
};

/** Name-based overrides for templates that share a ChannelType. */
const BY_NAME: Array<{ test: RegExp; copy: ChannelEmptyCopy }> = [
  { test: /introduc/i, copy: INTRO_COPY },
  { test: /\bwin(s)?\b|celebrat/i, copy: WINS_COPY },
  { test: /campaign/i, copy: CAMPAIGN_COPY },
  { test: /marketplace|buy|sell|offer/i, copy: MARKETPLACE_COPY },
  { test: /support|help/i, copy: SUPPORT_COPY },
];

export function resolveChannelEmptyCopy(args: {
  type: ChannelType;
  name?: string | null;
  channelKind?: string | null;
}): ChannelEmptyCopy {
  const name = args.name?.trim() || "";
  for (const row of BY_NAME) {
    if (row.test.test(name)) return row.copy;
  }
  const kind = (args.channelKind || "").toLowerCase();
  if (kind === "support") return SUPPORT_COPY;
  if (kind === "marketplace" || kind === "commerce") return MARKETPLACE_COPY;
  if (kind === "knowledge") return BY_TYPE.knowledge;
  if (kind === "files") return BY_TYPE.files;
  if (kind === "media") return BY_TYPE.media;
  if (kind === "events") return BY_TYPE.events;
  if (kind === "announcement") return BY_TYPE.announcement;
  return BY_TYPE[args.type] ?? BY_TYPE.discussion;
}
