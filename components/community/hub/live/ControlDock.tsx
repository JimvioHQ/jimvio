"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Fullscreen,
  HelpCircle,
  LogOut,
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
  const show = (text: string) => {
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 1600);
  };
  return { msg, show };
}

function ControlDockImpl({
  activity,
  micOn,
  camOn,
  recording,
  sharing,
  focusMode,
  onMic,
  onCam,
  onShare,
  onStopShare,
  onPresent,
  onRecord,
  onPoll,
  onInvite,
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
  onMic: () => void;
  onCam: () => void;
  onShare: () => void;
  onStopShare: () => void;
  onPresent: () => void;
  onRecord: () => void;
  onPoll: () => void;
  onInvite: () => void;
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

  return (
    <div className={cn("flex justify-center", focusMode ? "mt-3" : "mt-2.5")}>
      <div
        role="toolbar"
        aria-label="Live session controls"
        className={cn(
          "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-white px-2 py-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.10)] sm:gap-1 sm:px-2.5 sm:py-2",
          MOTION,
          "scrollbar-hide"
        )}
      >
        {activity === "live" && (
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
            <DockBtn
              pressed={sharing}
              success={sharing}
              onClick={onShare}
              label="Share Screen"
              hint="S"
            >
              <ScreenShare className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onCopyLink} label="Share" className="hidden sm:flex">
              <Share2 className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onInvite} label="Invite" className="hidden sm:flex">
              <UsersRound className={icon} strokeWidth={sw} aria-hidden />
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
            <DockBtn onClick={onReact} label="React" className="hidden sm:flex">
              <Smile className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onPoll} label="Polls" hint="P" className="hidden md:flex">
              <ClipboardList className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onQa} label="Q&A" className="hidden md:flex">
              <HelpCircle className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onMore ?? onPresent} label="More" className="hidden lg:flex">
              <MoreHorizontal className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
          </>
        )}

        {activity === "share" && (
          <>
            <DockBtn accent onClick={onStopShare} label="Stop Share">
              <ScreenShareOff className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onAnnotate} label="Annotate">
              <PenLine className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onLaser} label="Laser" className="hidden sm:flex">
              <MousePointer2 className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
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
          </>
        )}

        {activity === "present" && (
          <>
            <DockBtn onClick={onSlides} label="Slides">
              <Presentation className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onPrev} label="Prev">
              <ChevronLeft className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onNext} label="Next">
              <ChevronRight className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onTimer} label="Timer" className="hidden sm:flex">
              <Timer className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onPoll} label="Polls" hint="P">
              <ClipboardList className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
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
          </>
        )}

        <span className="mx-1 hidden h-8 w-px bg-neutral-200/80 sm:block" aria-hidden />

        {canEnd ? (
          <button
            type="button"
            title="End Room"
            aria-label="End live session"
            onClick={onEnd}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-[12px] font-semibold tracking-[-0.01em] text-white",
              MOTION,
              FOCUS_RING,
              "hover:bg-accent-hover active:scale-[0.98] sm:h-11 sm:px-5"
            )}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">End Room</span>
            <span className="sm:hidden">End</span>
          </button>
        ) : (
          <button
            type="button"
            title="Leave Live"
            aria-label="Leave live session"
            onClick={onLeave}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-[12px] font-semibold tracking-[-0.01em] text-white",
              MOTION,
              FOCUS_RING,
              "hover:bg-neutral-800 active:scale-[0.98] sm:h-11 sm:px-5"
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
}) {
  return (
    <button
      type="button"
      title={hint ? `${label} (${hint})` : label}
      aria-label={label}
      aria-pressed={typeof pressed === "boolean" ? pressed : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 sm:min-w-[56px]",
        MOTION,
        FOCUS_RING,
        "hover:scale-[1.01] active:scale-[0.97] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
        off
          ? "bg-red-500/10 text-red-600"
          : accent
            ? "bg-neutral-900 text-white"
            : recording
              ? "bg-red-500 text-white"
              : success
                ? "bg-emerald-500/10 text-emerald-600"
                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
        className
      )}
    >
      {children}
      <span
        className={cn(
          "max-w-[68px] truncate text-[9px] font-medium leading-none tracking-[-0.01em] sm:text-[10px]",
          off
            ? "text-red-600"
            : accent || recording
              ? "text-white/90"
              : success
                ? "text-emerald-600"
                : "text-neutral-400"
        )}
      >
        {label}
      </span>
    </button>
  );
}

export const ControlDock = memo(ControlDockImpl);
