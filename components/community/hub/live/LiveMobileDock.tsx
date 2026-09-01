"use client";

import {
  Heart,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  ScreenShare,
  Settings,
  Share2,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, MOTION } from "./studio-ui";

function DockAction({
  label,
  onClick,
  active,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5",
        MOTION,
        FOCUS_RING,
        danger
          ? "text-red-500"
          : active
            ? "bg-white/15 text-white"
            : "text-white/80 hover:bg-white/10"
      )}
    >
      {children}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

export function LiveMobileDock({
  isHost,
  micOn,
  camOn,
  sharing,
  onMic,
  onCam,
  onShare,
  onAudio,
  onSettings,
  onChat,
  onReact,
  onShareLink,
  onMore,
}: {
  isHost: boolean;
  micOn?: boolean;
  camOn?: boolean;
  sharing?: boolean;
  onMic?: () => void;
  onCam?: () => void;
  onShare?: () => void;
  onAudio?: () => void;
  onSettings?: () => void;
  onChat?: () => void;
  onReact?: () => void;
  onShareLink?: () => void;
  onMore?: () => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      role="toolbar"
      aria-label="Live controls"
    >
      <div className="pointer-events-auto inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[20px] border border-white/10 bg-black/55 px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl scrollbar-hide">
        {isHost ? (
          <>
            <DockAction label="Mic" onClick={onMic} active={micOn} danger={!micOn}>
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </DockAction>
            <DockAction label="Camera" onClick={onCam} active={camOn} danger={!camOn}>
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </DockAction>
            <DockAction label="Share" onClick={onShare} active={sharing}>
              <ScreenShare className="h-5 w-5" />
            </DockAction>
            <DockAction label="Audio" onClick={onAudio}>
              <Volume2 className="h-5 w-5" />
            </DockAction>
            <DockAction label="Settings" onClick={onSettings}>
              <Settings className="h-5 w-5" />
            </DockAction>
          </>
        ) : (
          <>
            <DockAction label="Chat" onClick={onChat}>
              <MessageSquare className="h-5 w-5" />
            </DockAction>
            <DockAction label="React" onClick={onReact}>
              <Heart className="h-5 w-5" />
            </DockAction>
            <DockAction label="Share" onClick={onShareLink}>
              <Share2 className="h-5 w-5" />
            </DockAction>
            <DockAction label="More" onClick={onMore}>
              <MoreHorizontal className="h-5 w-5" />
            </DockAction>
          </>
        )}
      </div>
    </div>
  );
}
