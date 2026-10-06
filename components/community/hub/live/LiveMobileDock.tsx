"use client";

import {
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
import { mobileDockControls } from "@/lib/live/control-dock-visibility";
import type { MediaAccessKind } from "@/lib/live/media-errors";
import { FOCUS_RING, MOTION } from "./studio-ui";

function DockAction({
  label,
  onClick,
  active,
  danger,
  disabled,
  title,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
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
        "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-1.5 sm:min-h-[52px] sm:min-w-[56px] sm:px-2",
        MOTION,
        FOCUS_RING,
        disabled
          ? "cursor-not-allowed text-[#94A3B8]"
          : danger
            ? "text-red-600"
            : active
              ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
              : "text-[#111827] hover:bg-[#F1F5F9]"
      )}
    >
      {children}
      <span className="max-w-[4.5rem] truncate text-[10px] font-medium leading-none">
        {label}
      </span>
    </button>
  );
}

type AvAccess = MediaAccessKind;

/**
 * Mobile Live control bar.
 * Order: Audio → Video → Chat → React → Share → More → Leave/End
 * Mic/Cam remain visible (disabled with explanation when the role cannot publish).
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
  onMic,
  onCam,
  onShare,
  onStopShare,
  screenShareSupported = true,
  screenShareReason = null,
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
  audioAccess?: AvAccess;
  videoAccess?: AvAccess;
  permissionDenied?: { audio?: boolean; video?: boolean };
  onMic?: () => void;
  onCam?: () => void;
  onShare?: () => void;
  onStopShare?: () => void;
  screenShareSupported?: boolean;
  screenShareReason?: string | null;
  onChat?: () => void;
  onReact?: () => void;
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

  const micLabel = !publish
    ? "Mic"
    : audioDenied
      ? "Enable mic"
      : audioAccess === "requesting" || audioAccess === "idle"
        ? "Enable mic"
        : micOn
          ? "Mute"
          : "Unmute";

  const camLabel = !publish
    ? "Camera"
    : videoDenied
      ? "Enable cam"
      : videoAccess === "requesting" || videoAccess === "idle"
        ? "Enable cam"
        : camOn
          ? "Camera"
          : "Cam off";

  const micTitle = !publish
    ? "Microphone unavailable for viewers"
    : audioDenied
      ? "Allow microphone access in your browser settings"
      : micLabel;

  const camTitle = !publish
    ? "Camera unavailable for viewers"
    : videoDenied
      ? "Allow camera access in your browser settings"
      : camLabel;

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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-3 lg:hidden"
      role="toolbar"
      aria-label="Live controls"
    >
      <div className="pointer-events-auto inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[20px] border border-[#E5E7EB] bg-white/95 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl scrollbar-hide sm:gap-1 sm:px-2 sm:py-2">
        {controls.map((id) => {
          switch (id) {
            case "mic":
              return (
                <DockAction
                  key={id}
                  label={micLabel}
                  title={micTitle}
                  onClick={publish ? onMic : undefined}
                  disabled={!publish}
                  active={publish && Boolean(micOn) && !audioDenied}
                  danger={publish && (!micOn || audioDenied)}
                >
                  {micOn && publish && !audioDenied ? (
                    <Mic className="h-5 w-5" aria-hidden />
                  ) : (
                    <MicOff className="h-5 w-5" aria-hidden />
                  )}
                </DockAction>
              );
            case "cam":
              return (
                <DockAction
                  key={id}
                  label={camLabel}
                  title={camTitle}
                  onClick={publish ? onCam : undefined}
                  disabled={!publish}
                  active={publish && Boolean(camOn) && !videoDenied}
                  danger={publish && (!camOn || videoDenied)}
                >
                  {camOn && publish && !videoDenied ? (
                    <Video className="h-5 w-5" aria-hidden />
                  ) : (
                    <VideoOff className="h-5 w-5" aria-hidden />
                  )}
                </DockAction>
              );
            case "chat":
              return (
                <DockAction key={id} label="Chat" onClick={onChat}>
                  <MessageSquare className="h-5 w-5" aria-hidden />
                </DockAction>
              );
            case "react":
              return (
                <DockAction key={id} label="React" onClick={onReact}>
                  <Heart className="h-5 w-5" aria-hidden />
                </DockAction>
              );
            case "share":
              return (
                <DockAction
                  key={id}
                  label={
                    sharing
                      ? "Stop"
                      : screenShareSupported
                        ? "Share"
                        : "No share"
                  }
                  title={
                    sharing
                      ? "Stop sharing"
                      : screenShareSupported
                        ? "Share screen"
                        : (screenShareReason ??
                          "Screen sharing isn't supported by this browser. Update your browser or use a supported browser/device.")
                  }
                  onClick={
                    sharing || screenShareSupported ? handleShare : undefined
                  }
                  disabled={!sharing && !screenShareSupported}
                  active={Boolean(sharing)}
                >
                  {sharing ? (
                    <Square className="h-5 w-5" aria-hidden />
                  ) : (
                    <ScreenShare className="h-5 w-5" aria-hidden />
                  )}
                </DockAction>
              );
            case "stopShare":
              return (
                <DockAction
                  key={id}
                  label="Stop"
                  onClick={onStopShare}
                  active
                >
                  <Square className="h-5 w-5" aria-hidden />
                </DockAction>
              );
            case "copyLink":
              return (
                <DockAction key={id} label="Share" onClick={onShareLink}>
                  <Share2 className="h-5 w-5" aria-hidden />
                </DockAction>
              );
            case "more":
              return (
                <DockAction key={id} label="More" onClick={onMore}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </DockAction>
              );
            case "end":
              return (
                <DockAction key={id} label="End" onClick={onEndLive} danger>
                  <PhoneOff className="h-5 w-5" aria-hidden />
                </DockAction>
              );
            case "leave":
              return (
                <DockAction key={id} label="Leave" onClick={onLeave} danger>
                  <PhoneOff className="h-5 w-5" aria-hidden />
                </DockAction>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
