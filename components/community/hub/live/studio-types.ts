"use client";

import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Radio,
  Settings,
  Signal,
  Users,
} from "lucide-react";

export type StudioMode = "minimal" | "creator" | "studio";
export type ActivityMode = "live" | "share" | "present";
export type LeftPanel =
  | "none"
  | "people"
  | "rooms"
  | "layout"
  | "settings"
  | "destinations";
export type RightTab =
  | "chat"
  | "qa"
  | "polls"
  | "clips"
  | "events"
  | "analytics"
  | "whiteboard"
  | "notes"
  | "resources"
  | "tasks"
  | "knowledge"
  | "commerce"
  | "recording"
  | "tools"
  | "ai";

export const MODE_KEY = "jimvio-live-studio-mode";
export const DRAWER_KEY = "jimvio-live-drawer-state";
/** Bump when DrawerState shape changes — invalid/old persisted state resets safely.
 * v7: restore left/right panels after refresh when session is live (client gates pre-live). */
export const DRAWER_STATE_VERSION = 7;
export const LAYOUTS = ["Presentation", "Grid", "Screen Share", "Classroom"] as const;

export const VALID_RIGHT_TABS: readonly RightTab[] = [
  "chat",
  "qa",
  "polls",
  "clips",
  "events",
  "analytics",
  "whiteboard",
  "notes",
  "resources",
  "tasks",
  "knowledge",
  "commerce",
  "recording",
  "tools",
  "ai",
] as const;

export const VALID_LEFT_PANELS: readonly LeftPanel[] = [
  "none",
  "people",
  "rooms",
  "layout",
  "settings",
  "destinations",
] as const;

export const LEFT_TOOLS: { id: Exclude<LeftPanel, "none">; label: string; icon: LucideIcon }[] = [
  { id: "people", label: "Participants", icon: Users },
  { id: "rooms", label: "Rooms", icon: Radio },
  { id: "layout", label: "Layout", icon: LayoutGrid },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "destinations", label: "Destinations & RTMP", icon: Signal },
];

/** Primary Live Studio right rail — Chat only. Other tools stay available via dock/More. */
export const RIGHT_TABS: { id: RightTab; label: string }[] = [
  { id: "chat", label: "Chat" },
];

/** Full tab registry retained for drawer state validation / secondary entry points. */
export const ALL_RIGHT_TABS: { id: RightTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "qa", label: "Q&A" },
  { id: "polls", label: "Polls" },
  { id: "whiteboard", label: "Board" },
  { id: "notes", label: "Notes" },
  { id: "resources", label: "Resources" },
  { id: "tasks", label: "Tasks" },
  { id: "knowledge", label: "Knowledge" },
  { id: "commerce", label: "Shop" },
  { id: "recording", label: "Replay" },
  { id: "tools", label: "Tools" },
  { id: "ai", label: "AI" },
  { id: "events", label: "Events" },
  { id: "analytics", label: "Analytics" },
];

export type DrawerState = {
  rightTab: RightTab;
  rightOpen: boolean;
  rightWidth: number;
  leftPanel: LeftPanel;
  chatScroll: number;
  panelScrolls: Partial<Record<RightTab | LeftPanel, number>>;
};

export const DEFAULT_DRAWER: DrawerState = {
  rightTab: "chat",
  rightOpen: false,
  rightWidth: 320,
  leftPanel: "none",
  chatScroll: 0,
  panelScrolls: {},
};

export type SpeakerUi = {
  micOn: boolean;
  camOn: boolean;
  sharing?: boolean;
  handRaised: boolean;
  connection: "good" | "warn" | "poor";
  role: "host" | "cohost" | "speaker" | "moderator" | "viewer";
  speaking: boolean;
};
