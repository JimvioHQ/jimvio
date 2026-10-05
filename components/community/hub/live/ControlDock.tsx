"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Fullscreen,
  HelpCircle,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  MousePointer2,
  PenLine,
  Presentation,
  ScreenShare,
  ScreenShareOff,
  Share2,
  Smile,
  Timer,
  Users,
  UsersRound,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityMode } from "./studio-types";
import { FOCUS_RING, MOTION } from "./studio-ui";

export function useEphemeralToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  // Stable identity — callers put `show` in effect deps; a new function each
  // render + sticky error string caused React #185 (maximum update depth).
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
  onPoll,
  onInvite,
  onChat,
  chatOpen = false,
  onPeople,
  participantCount,
  onReact,
  onQa,
  onCopyLink,
  onAnnotate,
  onLaser,
  onFullscreen,
  onPrev,
  onNext,
  onTimer,
  onSlides,
  onMore,
  onEnd,
  onLeave,
  canEnd = true,
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
  onPoll?: () => void;
  onInvite: () => void;
  onChat?: () => void;
  chatOpen?: boolean;
  onPeople?: () => void;
  participantCount?: number;
  onReact?: () => void;
  onQa?: () => void;
  onCopyLink?: () => void;
  onAnnotate?: () => void;
  onLaser?: () => void;
  onFullscreen?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onTimer?: () => void;
  onSlides?: () => void;
  onMore?: () => void;
  onEnd?: () => void;
  onLeave?: () => void;
  canEnd?: boolean;
}) {
  const icon = "h-[17px] w-[17px]";
  const sw = 1.65;
  const showAv = canPublish;

  return (
    <div className={cn("flex justify-center", focusMode ? "mt-3" : "mt-1")}>
      <div
        role="toolbar"
        aria-label="Live session controls"
        className={cn(
          "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl px-2 py-1.5 sm:gap-1 sm:px-2.5 sm:py-2",
          MOTION,
          "scrollbar-hide",
          dark
            ? "bg-[#0b1220]/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
            : "bg-white shadow-[0_8px_30px_rgba(15,23,42,0.10)]"
        )}
      >
        {(activity === "live" || activity === "share" || activity === "present") && showAv && (
          <>
            <DockBtn
              pressed={micOn}
              off={!micOn}
              onClick={onMic}
              label={micOn ? "Mute" : "Unmute"}
              hint="M"
              dark={dark}
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
              dark={dark}
            >
              {camOn ? (
                <Video className={icon} strokeWidth={sw} aria-hidden />
              ) : (
                <VideoOff className={icon} strokeWidth={sw} aria-hidden />
              )}
            </DockBtn>
          </>
        )}

        {activity === "live" && (
          <>
            {showAv ? (
              <DockBtn
                pressed={sharing}
                success={sharing}
                onClick={sharing ? onStopShare : onShare}
                label={sharing ? "Stop Share" : "Share Screen"}
                hint="S"
                dark={dark}
              >
                {sharing ? (
                  <ScreenShareOff className={icon} strokeWidth={sw} aria-hidden />
                ) : (
                  <ScreenShare className={icon} strokeWidth={sw} aria-hidden />
                )}
              </DockBtn>
            ) : null}
            {onCopyLink && (
              <DockBtn onClick={onCopyLink} label="Share" dark={dark}>
                <Share2 className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            )}
            <DockBtn onClick={onInvite} label="Invite" className="hidden sm:flex" dark={dark}>
              <UsersRound className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            {onPeople ? (
              <DockBtn
                onClick={onPeople}
                label="Participants"
                className="hidden sm:flex"
                dark={dark}
                badge={
                  typeof participantCount === "number" && participantCount > 0
                    ? participantCount
                    : undefined
                }
              >
                <Users className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            {onChat ? (
              <DockBtn
                pressed={chatOpen}
                onClick={onChat}
                label={chatOpen ? "Close chat" : "Chat"}
                dark={dark}
              >
                <MessageSquare className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            <DockBtn
              pressed={recording}
              recording={recording}
              onClick={onRecord}
              label="Record"
              hint="R"
              dark={dark}
            >
              <CircleDot className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            {onReact ? (
              <DockBtn onClick={onReact} label="Reactions" className="hidden md:flex" dark={dark}>
                <Smile className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            {onPoll ? (
              <DockBtn onClick={onPoll} label="Polls" hint="P" className="hidden md:flex" dark={dark}>
                <ClipboardList className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            {onQa ? (
              <DockBtn onClick={onQa} label="Q&A" className="hidden md:flex" dark={dark}>
                <HelpCircle className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            {onMore ? (
              <DockBtn onClick={onMore} label="More" className="hidden lg:flex" dark={dark}>
                <MoreHorizontal className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
          </>
        )}

        {activity === "share" && (
          <>
            <DockBtn accent onClick={onStopShare} label="Stop Share">
              <ScreenShareOff className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            {onAnnotate && (
              <DockBtn onClick={onAnnotate} label="Annotate">
                <PenLine className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            )}
            {onLaser && (
              <DockBtn onClick={onLaser} label="Laser" className="hidden sm:flex">
                <MousePointer2 className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            )}
            <DockBtn onClick={onFullscreen} label="Fullscreen" className="hidden sm:flex">
              <Fullscreen className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn
              pressed={recording}
              recording={recording}
              onClick={onRecord}
              label="Record"
              hint="R"
            >
              <CircleDot className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            {onCopyLink && (
              <DockBtn onClick={onCopyLink} label="Share">
                <Share2 className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            )}
            {onMore ? (
              <DockBtn onClick={onMore} label="More" className="hidden md:flex">
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
            {onPoll ? (
              <DockBtn onClick={onPoll} label="Polls" hint="P">
                <ClipboardList className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
            <DockBtn
              pressed={recording}
              recording={recording}
              onClick={onRecord}
              label="Record"
              hint="R"
              className="hidden md:flex"
            >
              <CircleDot className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            {onMore ? (
              <DockBtn onClick={onMore} label="More" className="hidden md:flex">
                <MoreHorizontal className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : onPresent ? (
              <DockBtn onClick={onPresent} label="More" className="hidden md:flex">
                <MoreHorizontal className={icon} strokeWidth={sw} aria-hidden />
              </DockBtn>
            ) : null}
          </>
        )}

        <span
          className={cn(
            "mx-1 hidden h-8 w-px sm:block",
            dark ? "bg-white/10" : "bg-neutral-200/80"
          )}
          aria-hidden
        />

        {canEnd ? (
          <button
            type="button"
            title="End Live"
            aria-label="End live session"
            onClick={onEnd}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#FF5A1F] px-4 text-[12px] font-semibold tracking-[-0.01em] text-white",
              MOTION,
              FOCUS_RING,
              "hover:bg-[#e04e1a] active:scale-[0.98] sm:h-11 sm:px-5"
            )}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">End Live</span>
            <span className="sm:hidden">End</span>
          </button>
        ) : (
          <button
            type="button"
            title="Leave Live"
            aria-label="Leave live session"
            onClick={onLeave}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[12px] font-semibold tracking-[-0.01em]",
              MOTION,
              FOCUS_RING,
              "active:scale-[0.98] sm:h-11 sm:px-5",
              dark
                ? "bg-white/10 text-white hover:bg-white/15"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            )}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
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
  dark,
  badge,
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
  dark?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      title={hint ? `${label} (${hint})` : label}
      aria-label={label}
      aria-pressed={typeof pressed === "boolean" ? pressed : undefined}
      onClick={onClick}
      className={cn(
        "relative inline-flex min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 sm:min-w-[56px]",
        MOTION,
        FOCUS_RING,
        "hover:scale-[1.01] active:scale-[0.97] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
        off
          ? dark
            ? "bg-red-500/20 text-red-300"
            : "bg-red-500/10 text-red-600"
          : accent
            ? "bg-neutral-900 text-white"
            : recording
              ? "bg-red-500 text-white"
              : success
                ? dark
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-emerald-500/10 text-emerald-600"
                : dark
                  ? pressed
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
        className
      )}
    >
      {children}
      <span className="max-w-[64px] truncate text-[9px] font-medium leading-none sm:text-[10px]">
        {label}
      </span>
      {typeof badge === "number" ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-[#FF5A1F] px-1 text-center text-[9px] font-semibold leading-4 text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

export const ControlDock = memo(ControlDockImpl);
