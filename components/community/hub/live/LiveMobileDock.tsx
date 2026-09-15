"use client";

import {
  FlipHorizontal2,
  Heart,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  ScreenShare,
  Share2,
  Square,
  Video,
  VideoOff,
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

/**
 * Mobile Live control bar. Mic/Cam remain available during screen share.
 * `canPublish` covers host, co-host, and speakers; viewers get chat-first actions.
 */
export function LiveMobileDock({
  isHost,
  canPublish,
  hasSession,
  micOn,
  camOn,
  sharing,
  onMic,
  onCam,
  onShare,
  onStopShare,
  onFlipCamera,
  onChat,
  onReact,
  onShareLink,
  onMore,
  onEndLive,
  onLeave,
}: {
  isHost: boolean;
  canPublish?: boolean;
  hasSession?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  sharing?: boolean;
  onMic?: () => void;
  onCam?: () => void;
  onShare?: () => void;
  onStopShare?: () => void;
  onFlipCamera?: () => void;
  onChat?: () => void;
  onReact?: () => void;
  onShareLink?: () => void;
  onMore?: () => void;
  onEndLive?: () => void;
  onLeave?: () => void;
}) {
  const handleShare = () => {
    if (sharing) onStopShare?.();
    else onShare?.();
  };

  const publish = Boolean(canPublish ?? isHost);
  const inSession = hasSession !== false;

  if (!inSession) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      role="toolbar"
      aria-label="Live controls"
    >
      <div className="pointer-events-auto inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[20px] border border-white/10 bg-black/55 px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl scrollbar-hide">
        {publish ? (
          <>
            <DockAction label={micOn ? "Mute" : "Unmute"} onClick={onMic} active={micOn} danger={!micOn}>
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </DockAction>
            <DockAction
              label={camOn ? "Camera" : "Cam off"}
              onClick={onCam}
              active={camOn}
              danger={!camOn}
            >
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </DockAction>
            {onFlipCamera ? (
              <DockAction label="Flip" onClick={onFlipCamera}>
                <FlipHorizontal2 className="h-5 w-5" />
              </DockAction>
            ) : null}
            <DockAction label={sharing ? "Stop" : "Share"} onClick={handleShare} active={sharing}>
              {sharing ? <Square className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
            </DockAction>
            <DockAction label="Chat" onClick={onChat}>
              <MessageSquare className="h-5 w-5" />
            </DockAction>
            <DockAction label="More" onClick={onMore}>
              <MoreHorizontal className="h-5 w-5" />
            </DockAction>
            {isHost ? (
              <DockAction label="End" onClick={onEndLive} danger>
                <PhoneOff className="h-5 w-5" />
              </DockAction>
            ) : (
              <DockAction label="Leave" onClick={onLeave} danger>
                <PhoneOff className="h-5 w-5" />
              </DockAction>
            )}
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
            {onLeave ? (
              <DockAction label="Leave" onClick={onLeave} danger>
                <PhoneOff className="h-5 w-5" />
              </DockAction>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
