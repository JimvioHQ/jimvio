// ─── Shared Types ──────────────────────────────────────────────────────────────

export type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

export type Msg = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  thread_id: string | null;
  reactions: unknown;
  attachments?: unknown;
  profiles?: Profile | null;
  reply_count?: number | null;
  is_edited?: boolean | null;
  edited_at?: string | null;
  reply_to_id?: string | null;
  reply_to_body?: string | null;
  reply_to_sender?: string | null;
};

export type Attachment = {
  url: string;
  name?: string;
  mime?: string;
};

export type SidebarMember = {
  user_id: string;
  role?: string;
  profile?: Profile;
};

export type InboxConversation = {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
};

export type ChatFilter = "all" | "media";

export type SidebarFilter = "all" | "unread" | "group" | "inbox" | "calls";

export type IncomingCall = {
  type: "audio" | "video";
  sender: Profile | null;
  roomId: string;
  convId?: string;
};

export type ActiveConvPeer = {
  name: string;
  avatar: string | null;
};

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥"] as const;
export type QuickReaction = (typeof QUICK_REACTIONS)[number];

export const MAX_ATTACH = 6;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;