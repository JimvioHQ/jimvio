"use client";

import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Radio,
  Settings,
  Users,
} from "lucide-react";

export type StudioMode = "minimal" | "creator" | "studio";
export type ActivityMode = "live" | "share" | "present";
export type LeftPanel = "none" | "people" | "rooms" | "layout" | "settings";
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
export const LAYOUTS = ["Presentation", "Grid", "Screen Share", "Classroom"] as const;

export const LEFT_TOOLS: { id: Exclude<LeftPanel, "none">; label: string; icon: LucideIcon }[] = [
  { id: "people", label: "People", icon: Users },
  { id: "rooms", label: "Rooms", icon: Radio },
  { id: "layout", label: "Layout", icon: LayoutGrid },
  { id: "settings", label: "Settings", icon: Settings },
];

export const RIGHT_TABS: { id: RightTab; label: string }[] = [
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
  rightOpen: true,
  rightWidth: 320,
  leftPanel: "none",
  chatScroll: 0,
  panelScrolls: {},
};

export type SpeakerUi = {
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  connection: "good" | "warn" | "poor";
  role: "host" | "cohost" | "speaker";
  speaking: boolean;
};
