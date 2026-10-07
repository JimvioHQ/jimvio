"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Fullscreen,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  Presentation,
  Radio,
  ScreenShare,
  ScreenShareOff,
  Timer,
  UserPlus,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityMode } from "./studio-types";
import { FOCUS_RING, LIVE_DOCK_BG, MOTION } from "./studio-ui";

export function useEphemeralToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const show = useCallback((text: string) => {
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 1600);
  }, []);
  return { msg, show };
}

function ControlDockImpl({
  activity,
  micOn,
  camOn,
  recording,
  sharing,
  focusMode,
  canPublish = true,
  dark = false,
  onMic,
  onCam,
  onShare,
  onStopShare,
  onPresent,
  onRecord,
  onInvite,
  onChat,
  chatOpen = false,
  onPeople,
  peopleOpen = false,
  participantCount,
  onStreamTo,
  streamToOpen = false,
  onReact,
  onCopyLink,
  onAnnotate,
  onLaser,
  onFullscreen,
  onPrev,
  onNext,
  onTimer,
  onSlides,
  onMore,
  moreOpen = false,
  onEnd,
  onLeave,
  canEnd = true,
  inviteOpen = false,
}: {
  activity: ActivityMode;
  micOn: boolean;
  camOn: boolean;
  recording: boolean;
  sharing?: boolean;
  focusMode?: boolean;
  canPublish?: boolean;
  dark?: boolean;
  onMic: () => void;
  onCam: () => void;
  onShare: () => void;
  onStopShare: () => void;
  onPresent: () => void;
  onRecord: () => void;
  onInvite: () => void;
  onChat?: () => void;
  chatOpen?: boolean;
  onPeople?: () => void;
  peopleOpen?: boolean;
  participantCount?: number;
  onStreamTo?: () => void;
  streamToOpen?: boolean;
  onReact?: () => void;
  onCopyLink?: () => void;
  onAnnotate?: () => void;
  onLaser?: () => void;
  onFullscreen?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onTimer?: () => void;
  onSlides?: () => void;
  onMore?: () => void;
  moreOpen?: boolean;
  onEnd?: () => void;
  onLeave?: () => void;
  canEnd?: boolean;
  inviteOpen?: boolean;
}) {
  const icon = "h-[18px] w-[18px]";
  const sw = 1.65;
  const showAv = canPublish;
  const isSharing = Boolean(sharing) || activity === "share";
  // Screen share must NOT replace the dock — keep full Live controls.
  const showLiveDock = activity === "live" || activity === "share";
  void dark;
  void onCopyLink;
  void onReact;
  void onAnnotate;
  void onLaser;

  return (
    <div className={cn("flex justify-center", focusMode ? "mt-3" : "mt-1")}>
      <div
        role="toolbar"
        aria-label="Live session controls"
        className={cn(
          "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[22px] px-2.5 py-2 sm:gap-1 sm:px-3 sm:py-2.5",
          MOTION,
          "scrollbar-hide",
          LIVE_DOCK_BG
        )}
      >
        {(showLiveDock || activity === "present") && showAv && (
          <>
            <DockBtn
              pressed={micOn}
              off={!micOn}
              onClick={onMic}
              label={micOn ? "Mute" : "Unmute"}
              hint="M"
            >
              {micOn ? (
                <Mic className={icon} strokeWidth={sw} aria-hidden />
              ) : (
                <MicOff className={icon} strokeWidth={sw} aria-hidden />
              )}
            </DockBtn>
            <DockBtn
              pressed={camOn}
              off={!camOn}
              onClick={onCam}
              label={camOn ? "Stop Video" : "Start Video"}
              hint="V"
            >
              {camOn ? (
                <Video className={icon} strokeWidth={sw} aria-hidden />
              ) : (
                <VideoOff className={icon} strokeWidth={sw} aria-hidden />
              )}
            </DockBtn>
          </>
        )}

        {showLiveDock && (
          <>
            {showAv ? (
              <DockBtn
                pressed={isSharing}
                success={isSharing}
                onClick={isSharing ? onStopShare : onShare}
                label={isSharing ? "Stop Share" : "Share Screen"}
                hint="S"
              >
                {isSharing ? (
                  <ScreenShareOff className={icon} strokeWidth={sw} aria-hidden />
                ) : (
                  <ScreenShare className={icon} strokeWidth={sw} aria-hidden />
                )}
              </DockBtn>
            ) : null}
            {onFullscreen ? (
              <DockBtn onClick={onFullscreen} label="Fullscreen" className="hidden sm:flex">
                <Fullscreen className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            <DockBtn
              pressed={inviteOpen}
              onClick={onInvite}
              label="Invite"
              activeRing={inviteOpen}
            >
              <UserPlus className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            {onPeople ? (
              <DockBtn
                pressed={peopleOpen}
                onClick={onPeople}
                label="Participants"
                activeRing={peopleOpen}
                badge={
                  typeof participantCount === "number" && participantCount > 0
                    ? participantCount
                    : undefined
                }
              >
                <Users className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            <DockBtn
              pressed={recording}
              recording={recording}
              onClick={onRecord}
              label={recording ? "Recording" : "Record"}
              hint="R"
              className={recording ? "!bg-[#EF4444] !text-white" : undefined}
            >
              <Circle
                className={cn(icon, recording && "fill-current text-white")}
                strokeWidth={sw}
                aria-hidden
              />
            </DockBtn>
            {onChat ? (
              <DockBtn
                pressed={chatOpen}
                onClick={onChat}
                label="Chat"
                activeRing={chatOpen}
              >
                <MessageSquare className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            {onStreamTo ? (
              <DockBtn
                pressed={streamToOpen}
                onClick={onStreamTo}
                label="Destinations & RTMP"
                activeRing={streamToOpen}
              >
                <Radio className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            {onMore ? (
              <DockBtn pressed={moreOpen} onClick={onMore} label="More" activeRing={moreOpen}>
                <MoreHorizontal className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
          </>
        )}

        {activity === "present" && (
          <>
            {onSlides && (
              <DockBtn onClick={onSlides} label="Slides">
                <Presentation className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            )}
            {onPrev && (
              <DockBtn onClick={onPrev} label="Prev">
                <ChevronLeft className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            )}
            {onNext && (
              <DockBtn onClick={onNext} label="Next">
                <ChevronRight className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            )}
            {onTimer && (
              <DockBtn onClick={onTimer} label="Timer" className="hidden sm:flex">
                <Timer className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            )}
            <DockBtn
              pressed={recording}
              recording={recording}
              onClick={onRecord}
              label={recording ? "Recording" : "Record"}
              hint="R"
              className={recording ? "!bg-[#EF4444] !text-white" : undefined}
            >
              <Circle
                className={cn(icon, recording && "fill-current text-white")}
                strokeWidth={sw}
                aria-hidden
              />
            </DockBtn>
            {onPresent ? (
              <DockBtn onClick={onPresent} label="More" className="hidden md:flex">
                <MoreHorizontal className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
          </>
        )}

        <span className="mx-1.5 hidden h-8 w-px bg-[#E5E7EB] sm:block" aria-hidden />

        {canEnd ? (
          <button
            type="button"
            title="End Live"
            aria-label="End live session"
            onClick={onEnd}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-[#FF5A1F] px-5 text-[13px] font-semibold tracking-[-0.01em] text-white",
              MOTION,
              FOCUS_RING,
              "hover:bg-[#e04e1a] active:scale-[0.98]"
            )}
          >
            <PhoneOff className="h-4 w-4" aria-hidden />
            <span>End Live</span>
          </button>
        ) : (
          <button
            type="button"
            title="Leave Live"
            aria-label="Leave Live"
            onClick={onLeave}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-[#F3F4F6] px-5 text-[13px] font-semibold tracking-[-0.01em] text-[#111827]",
              MOTION,
              FOCUS_RING,
              "hover:bg-[#E5E7EB] active:scale-[0.98]"
            )}
          >
            <PhoneOff className="h-4 w-4" aria-hidden />
            <span>Leave Live</span>
          </button>
        )}
      </div>
    </div>
  );
}

function DockBtn({
  children,
  label,
  hint,
  off,
  accent,
  recording,
  pressed,
  success,
  onClick,
  className,
  badge,
  activeRing,
}: {
  children: React.ReactNode;
  label: string;
  hint?: string;
  off?: boolean;
  accent?: boolean;
  recording?: boolean;
  pressed?: boolean;
  success?: boolean;
  onClick?: () => void;
  className?: string;
  badge?: number;
  activeRing?: boolean;
}) {
  return (
    <button
      type="button"
      title={hint ? `${label} (${hint})` : label}
      aria-label={label}
      aria-pressed={typeof pressed === "boolean" ? pressed : undefined}
      onClick={onClick}
      className={cn(
        "relative inline-flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5",
        MOTION,
        FOCUS_RING,
        "hover:scale-[1.01] active:scale-[0.97] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
        off
          ? "bg-red-50 text-red-600"
          : accent
            ? "bg-[#111827] text-white"
            : recording
              ? "bg-[#EF4444] text-white"
              : success
                ? "bg-emerald-50 text-emerald-700"
                : pressed
                  ? "bg-[#F3F4F6] text-[#111827]"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#111827]",
        activeRing && "ring-1 ring-[#FF5A1F]/80",
        className
      )}
    >
      {children}
      <span className="max-w-[72px] truncate text-[10px] font-medium leading-none">
        {label}
      </span>
      {typeof badge === "number" ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-black px-1 text-center text-[9px] font-semibold leading-[18px] text-white ring-1 ring-white/20">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

export const ControlDock = memo(ControlDockImpl);
