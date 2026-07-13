export type ScreenId = "messages" | "community-overview" | "home" | "live" | "chat" | "members";

export interface Conversation {
  id: string;
  title: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  pinnedMessage?: string;
  isGroup?: boolean;
  isSpace?: boolean;
  isTyping?: boolean;
  participant?: {
    id: string;
    name: string;
    status: "online" | "offline" | "away";
    creatorLevel?: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: { id: string; name: string; avatar: string };
  timestamp: string;
  content: string;
  attachment?: {
    type: "pdf" | "audio" | "image" | "video";
    url: string;
    fileName?: string;
    fileSize?: string;
    durationSeconds?: number;
  };
  reactions: { emoji: string; count: number; userReacted: boolean }[];
  seenBy: { id: string }[];
}
