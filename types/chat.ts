// ─── Shared Types ──────────────────────────────────────────────────────────────

export type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_verified?: boolean | null;
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
  metadata?: Record<string, unknown> | null;
  is_pinned?: boolean | null;
  is_deleted?: boolean | null;
  /** Migration 085+ — present when API returns pin metadata */
  pinned_at?: string | null;
  pinned_by?: string | null;
  /** Optional community role label for MessageCard header */
  sender_role?: string | null;
  /** Thread UX flags (client + future server) */
  thread_solved?: boolean | null;
  thread_unread_count?: number | null;
};

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

export type GifResult = {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
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

export type ChatFilter = "all" | "media" | "files" | "pinned" | "threads";

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