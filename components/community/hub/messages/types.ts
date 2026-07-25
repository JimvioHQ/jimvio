export type ThreadKind = "direct" | "group" | "space";

export type HubThread = {
  id: string;
  kind: ThreadKind;
  name: string;
  avatarUrl: string | null;
  subtitle: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  isPinned?: boolean;
  isTyping?: boolean;
  communityId: string;
  communityName: string;
  communitySlug: string;
  peerId: string | null;
  roomId: string | null;
  href: string | null;
};

export type HubMessageAttachment = {
  url?: string;
  name?: string;
  mime?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
};

export type HubChatMessage = {
  id: string;
  body: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  created_at: string;
  message_type: string;
  attachments: HubMessageAttachment[];
  reactions: Record<string, number>;
  reactionUsers?: Record<string, string[]>;
  reply_to_id?: string | null;
  reply_to_body?: string | null;
  reply_to_sender?: string | null;
  thread_id?: string | null;
  reply_count?: number;
  is_pinned?: boolean;
  is_edited?: boolean;
  deliveryStatus?: "sending" | "sent" | "delivered" | "seen";
  optimistic?: boolean;
};

export type HubPeerInfo = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  level: number;
  streakDays: number;
  isOnline: boolean;
  isCreator?: boolean;
  topPercentLabel?: string | null;
  sharedCommunities: Array<{
    id: string;
    name: string;
    slug: string;
    href: string;
    messageCount?: number;
  }>;
};

export type MessagesTabId = "all" | "unread" | "groups" | "spaces";

export type MediaTabId = "Media" | "Files" | "Links" | "Voice";

export type QuickActionId =
  | "ai"
  | "course"
  | "clip"
  | "space"
  | "product"
  | "signal"
  | "more";
