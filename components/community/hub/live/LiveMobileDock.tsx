"use client";

import {
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Radio,
  ScreenShare,
  ScreenShareOff,
  Share2,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileDockControls } from "@/lib/live/control-dock-visibility";
import type { MediaAccessKind } from "@/lib/live/media-errors";
import { FOCUS_RING_DARK, LIVE_DOCK_BG, MOTION } from "./studio-ui";

function DockIcon({
  label,
  onClick,
  active,
  danger,
  disabled,
  title,
  badge,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
        MOTION,
        FOCUS_RING_DARK,
        disabled
          ? "cursor-not-allowed text-white/30"
          : danger
            ? "bg-red-500 text-white"
            : active
              ? "bg-white/15 text-white ring-1 ring-[#FF5A1F]/80"
              : "text-white/85 hover:bg-white/10 hover:text-white"
      )}
    >
      {children}
      {typeof badge === "number" ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-black px-1 text-center text-[9px] font-semibold leading-4 text-white ring-1 ring-white/20">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

type AvAccess = MediaAccessKind;

/**
 * Mobile Live control dock — icon-first circular bar matching reference.
 * End Live is in the mobile header, not here.
 */
export function LiveMobileDock({
  isHost,
  canPublish,
  hasSession,
  micOn,
  camOn,
  sharing,
  audioAccess,
  videoAccess,
  permissionDenied,
  participantCount,
  chatOpen,
  peopleOpen,
  streamToOpen,
  moreOpen,
  onMic,
  onCam,
  onShare,
  onStopShare,
  screenShareSupported = true,
  screenShareReason = null,
  onChat,
  onPeople,
  onStreamTo,
  onShareLink,
  onMore,
}: {
  isHost: boolean;
  canPublish?: boolean;
  hasSession?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  sharing?: boolean;
  recording?: boolean;
  audioAccess?: AvAccess;
  videoAccess?: AvAccess;
  permissionDenied?: { audio?: boolean; video?: boolean };
  participantCount?: number;
  chatOpen?: boolean;
  inviteOpen?: boolean;
  peopleOpen?: boolean;
  streamToOpen?: boolean;
  moreOpen?: boolean;
  onMic?: () => void;
  onCam?: () => void;
  onShare?: () => void;
  onStopShare?: () => void;
  screenShareSupported?: boolean;
  screenShareReason?: string | null;
  onChat?: () => void;
  onInvite?: () => void;
  onPeople?: () => void;
  onRecord?: () => void;
  onStreamTo?: () => void;
  onShareLink?: () => void;
  onMore?: () => void;
  onEndLive?: () => void;
  onLeave?: () => void;
}) {
  const publish = Boolean(canPublish ?? isHost);
  const inSession = hasSession !== false;

  if (!inSession) return null;

  const controls = mobileDockControls({
    canPublish: publish,
    isHost,
    sharing: Boolean(sharing),
  });

  const audioDenied =
    Boolean(permissionDenied?.audio) || audioAccess === "denied";
  const videoDenied =
    Boolean(permissionDenied?.video) || videoAccess === "denied";

  const handleShare = () => {
    if (sharing) {
      onStopShare?.();
      return;
    }
    if (!screenShareSupported) return;
    onShare?.();
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      role="toolbar"
      aria-label="Live controls"
    >
      <div
        className={cn(
          "pointer-events-auto inline-flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full px-2.5 py-2 scrollbar-hide",
          LIVE_DOCK_BG
        )}
      >
        {controls.map((id) => {
          switch (id) {
            case "mic":
              return (
                <DockIcon
                  key={id}
                  label={micOn ? "Mute" : "Unmute"}
                  onClick={publish ? onMic : undefined}
                  disabled={!publish}
                  danger={publish && (!micOn || audioDenied)}
                >
                  {micOn && publish && !audioDenied ? (
                    <Mic className="h-5 w-5" aria-hidden />
                  ) : (
                    <MicOff className="h-5 w-5" aria-hidden />
                  )}
                </DockIcon>
              );
            case "cam":
              return (
                <DockIcon
                  key={id}
                  label={camOn ? "Stop Video" : "Start Video"}
                  onClick={publish ? onCam : undefined}
                  disabled={!publish}
                  danger={publish && (!camOn || videoDenied)}
                >
                  {camOn && publish && !videoDenied ? (
                    <Video className="h-5 w-5" aria-hidden />
                  ) : (
                    <VideoOff className="h-5 w-5" aria-hidden />
                  )}
                </DockIcon>
              );
            case "share":
            case "stopShare":
              return (
                <DockIcon
                  key={id}
                  label={sharing ? "Stop Share" : "Share Screen"}
                  title={
                    sharing
                      ? "Stop sharing"
                      : screenShareSupported
                        ? "Share screen"
                        : (screenShareReason ??
                          "Screen sharing isn't supported by this browser.")
                  }
                  onClick={
                    sharing || screenShareSupported ? handleShare : undefined
                  }
                  disabled={!sharing && !screenShareSupported}
                  active={Boolean(sharing)}
                >
                  {sharing ? (
                    <ScreenShareOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <ScreenShare className="h-5 w-5" aria-hidden />
                  )}
                </DockIcon>
              );
            case "people":
              return (
                <DockIcon
                  key={id}
                  label="Participants"
                  onClick={onPeople}
                  active={peopleOpen}
                  badge={
                    typeof participantCount === "number" && participantCount > 0
                      ? participantCount
                      : undefined
                  }
                >
                  <Users className="h-5 w-5" aria-hidden />
                </DockIcon>
              );
            case "chat":
              return (
                <DockIcon key={id} label="Chat" onClick={onChat} active={chatOpen}>
                  <MessageSquare className="h-5 w-5" aria-hidden />
                </DockIcon>
              );
            case "streamTo":
              return (
                <DockIcon
                  key={id}
                  label="Stream To"
                  onClick={onStreamTo}
                  active={streamToOpen}
                >
                  <Radio className="h-5 w-5" aria-hidden />
                </DockIcon>
              );
            case "copyLink":
              return (
                <DockIcon key={id} label="Share" onClick={onShareLink}>
                  <Share2 className="h-5 w-5" aria-hidden />
                </DockIcon>
              );
            case "more":
              return (
                <DockIcon key={id} label="More" onClick={onMore} active={moreOpen}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </DockIcon>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
