import { Conversation } from "./types";

export const CURRENT_USER = {
  id: "u-mira",
  name: "Mira Chen",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mira",
};

export const MOCK_USERS: Record<string, { id: string; name: string; avatar: string }> = {
  "u-june": {
    id: "u-june",
    name: "June Park",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=June",
  },
  "u-alex": {
    id: "u-alex",
    name: "Alex Rivera",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  },
  "u-sam": {
    id: "u-sam",
    name: "Sam Wilson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam",
  },
  "u-taylor": {
    id: "u-taylor",
    name: "Taylor Kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor",
  },
};

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    title: "June Park",
    avatar: MOCK_USERS["u-june"].avatar,
    lastMessage: "I pinned order #842 tracking to our thread so we can verify exact crate arrival during the stream.",
    lastMessageTime: "10:16 AM",
    unreadCount: 2,
    pinnedMessage: "Please review the customs declaration limits before tomorrow's masterclass.",
    participant: { id: "u-june", name: "June Park", status: "online", creatorLevel: "Level 5 Studio Lead" },
  },
  {
    id: "conv-2",
    title: "Industry Watch — Audio Crate Alerts",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Group",
    lastMessage: "New ceramic shipment alert: Seto bound crate #842 expected early delivery",
    lastMessageTime: "Yesterday",
    unreadCount: 5,
    isGroup: true,
    pinnedMessage: "Wave 3 shipment schedule confirmed — check pins.",
    participant: { id: "u-alex", name: "Alex Rivera", status: "online" },
  },
  {
    id: "conv-3",
    title: "Creator Safe Haven (Peer Circle)",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Space",
    lastMessage: "Sam shared a new resource: How to Handle Shipping Delays with Clients",
    lastMessageTime: "2h ago",
    unreadCount: 1,
    isSpace: true,
    isTyping: true,
    participant: { id: "u-sam", name: "Sam Wilson", status: "away" },
  },
  {
    id: "conv-4",
    title: "Alex Rivera",
    avatar: MOCK_USERS["u-alex"].avatar,
    lastMessage: "Got it — sending the revised invoice shortly.",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    participant: { id: "u-alex", name: "Alex Rivera", status: "offline" },
  },
  {
    id: "conv-5",
    title: "Taylor Kim",
    avatar: MOCK_USERS["u-taylor"].avatar,
    lastMessage: "Let me know when you're free for a sync!",
    lastMessageTime: "Mon",
    unreadCount: 0,
    participant: { id: "u-taylor", name: "Taylor Kim", status: "online" },
  },
];

export const INITIAL_COMMUNITIES = [
  {
    id: "comm-1",
    name: "House Matters Guild",
    icon: "https://api.dicebear.com/7.x/icons/svg?seed=house",
    memberCount: 284,
  },
];
