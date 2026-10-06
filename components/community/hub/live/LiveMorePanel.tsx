"use client";

import {
  BarChart3,
  Circle,
  Film,
  MessageSquare,
  MonitorUp,
  PhoneOff,
  Settings,
  ShieldAlert,
  Signal,
  Smile,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, MOTION_COLORS } from "./studio-ui";

export type LiveMoreActionId =
  | "chat"
  | "people"
  | "invite"
  | "record"
  | "recordings"
  | "share"
  | "streamTo"
  | "settings"
  | "reactions"
  | "analytics"
  | "report"
  | "leave"
  | "end";

type MoreItem = {
  id: LiveMoreActionId;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClass: string;
};

const DESKTOP_ITEMS: MoreItem[] = [
  { id: "chat", label: "Chat", icon: MessageSquare, iconClass: "text-[#FF5A1F]" },
  { id: "people", label: "Participants", icon: Users, iconClass: "text-[#2563EB]" },
  { id: "invite", label: "Invite", icon: UserPlus, iconClass: "text-[#16A34A]" },
  { id: "record", label: "Record", icon: Circle, iconClass: "text-[#EF4444]" },
  { id: "recordings", label: "Saved Recordings", icon: Film, iconClass: "text-[#0EA5E9]" },
  { id: "share", label: "Share Screen", icon: MonitorUp, iconClass: "text-[#7C3AED]" },
  { id: "streamTo", label: "Destinations & RTMP", icon: Signal, iconClass: "text-[#9333EA]" },
  { id: "settings", label: "Settings", icon: Settings, iconClass: "text-[#4B5563]" },
  { id: "reactions", label: "Reactions", icon: Smile, iconClass: "text-[#EAB308]" },
  { id: "analytics", label: "Live Analytics", icon: BarChart3, iconClass: "text-[#2563EB]" },
  { id: "report", label: "Report", icon: ShieldAlert, iconClass: "text-[#EF4444]" },
];

const MOBILE_ITEMS: MoreItem[] = [
  { id: "chat", label: "Chat", icon: MessageSquare, iconClass: "text-[#111827]" },
  { id: "people", label: "Participants", icon: Users, iconClass: "text-[#111827]" },
  { id: "invite", label: "Invite", icon: UserPlus, iconClass: "text-[#111827]" },
  { id: "record", label: "Record", icon: Circle, iconClass: "text-[#111827]" },
  { id: "recordings", label: "Saved Recordings", icon: Film, iconClass: "text-[#111827]" },
  { id: "streamTo", label: "Destinations & RTMP", icon: Signal, iconClass: "text-[#111827]" },
  { id: "share", label: "Share Screen", icon: MonitorUp, iconClass: "text-[#111827]" },
  { id: "settings", label: "Settings", icon: Settings, iconClass: "text-[#111827]" },
  { id: "reactions", label: "Reactions", icon: Smile, iconClass: "text-[#111827]" },
  { id: "analytics", label: "Live Analytics", icon: BarChart3, iconClass: "text-[#111827]" },
  { id: "report", label: "Report", icon: ShieldAlert, iconClass: "text-[#111827]" },
];

/**
 * Reference More command grid — desktop 2-col / mobile 3-col.
 * Every action maps to real Live handlers (no placeholders).
 */
export function LiveMorePanel({
  variant = "desktop",
  canEnd = false,
  onAction,
}: {
  variant?: "desktop" | "mobile";
  /** Host/cohost can end; participants get Leave Live instead. */
  canEnd?: boolean;
  onAction: (id: LiveMoreActionId) => void;
}) {
  const items = [
    ...(variant === "mobile" ? MOBILE_ITEMS : DESKTOP_ITEMS),
    canEnd
      ? ({
          id: "end" as const,
          label: "End Live",
          icon: PhoneOff,
          iconClass: "text-[#EF4444]",
        } satisfies MoreItem)
      : ({
          id: "leave" as const,
          label: "Leave Live",
          icon: PhoneOff,
          iconClass: "text-[#111827]",
        } satisfies MoreItem),
  ];

  return (
    <div
      className={cn(
        "grid gap-3 px-1 pb-2",
        variant === "mobile" ? "grid-cols-3" : "grid-cols-2"
      )}
      role="menu"
      aria-label="More Live actions"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={() => onAction(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#F3F4F6] px-3 py-5 text-center",
              MOTION_COLORS,
              FOCUS_RING,
              "hover:bg-[#EBEDEF] active:scale-[0.98]"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                variant === "desktop" ? item.iconClass : "text-[#111827]"
              )}
              strokeWidth={item.id === "record" ? 2.4 : 1.75}
              aria-hidden
            />
            <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#111827]">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
