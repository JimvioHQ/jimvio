"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Fullscreen,
  LogOut,
  Mic,
  MicOff,
  MousePointer2,
  PenLine,
  Presentation,
  ScreenShare,
  ScreenShareOff,
  Square,
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
  focusMode,
  onMic,
  onCam,
  onShare,
  onStopShare,
  onPresent,
  onRecord,
  onPoll,
  onInvite,
  onAnnotate,
  onLaser,
  onFullscreen,
  onPrev,
  onNext,
  onTimer,
  onSlides,
  onEnd,
  onLeave,
  canEnd = true,
}: {
  activity: ActivityMode;
  micOn: boolean;
  camOn: boolean;
  recording: boolean;
  focusMode?: boolean;
  onMic: () => void;
  onCam: () => void;
  onShare: () => void;
  onStopShare: () => void;
  onPresent: () => void;
  onRecord: () => void;
  onPoll: () => void;
  onInvite: () => void;
  onAnnotate?: () => void;
  onLaser?: () => void;
  onFullscreen?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onTimer?: () => void;
  onSlides?: () => void;
  onEnd?: () => void;
  onLeave?: () => void;
  /** When false, show Leave instead of End Live (non-host participants). */
  canEnd?: boolean;
}) {
  const icon = "h-[18px] w-[18px]";
  const sw = 1.6;

  return (
    <div className={cn("flex justify-center px-2", focusMode ? "mt-5" : "mt-4")}>
      <div
        role="toolbar"
        aria-label="Live session controls"
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-1.5 sm:gap-1 sm:px-2 sm:py-1.5",
          "bg-white/65 backdrop-blur-2xl",
          "shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
          MOTION
        )}
      >
        {activity === "live" && (
          <>
            <DockBtn pressed={micOn} off={!micOn} onClick={onMic} label={micOn ? "Mute microphone" : "Unmute microphone"} hint="M">
              {micOn ? <Mic className={icon} strokeWidth={sw} aria-hidden /> : <MicOff className={icon} strokeWidth={sw} aria-hidden />}
            </DockBtn>
            <DockBtn pressed={camOn} off={!camOn} onClick={onCam} label={camOn ? "Stop camera" : "Start camera"} hint="V">
              {camOn ? <Video className={icon} strokeWidth={sw} aria-hidden /> : <VideoOff className={icon} strokeWidth={sw} aria-hidden />}
            </DockBtn>
            <DockBtn onClick={onShare} label="Share screen" hint="S">
              <ScreenShare className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onInvite} label="Invite" className="hidden sm:flex">
              <UsersRound className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn pressed={recording} recording={recording} onClick={onRecord} label={recording ? "Stop recording" : "Start recording"} hint="R">
              <CircleDot className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onPresent} label="Present" className="hidden md:flex">
              <Presentation className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onPoll} label="Poll" hint="P" className="hidden sm:flex">
              <ClipboardList className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
          </>
        )}

        {activity === "share" && (
          <>
            <DockBtn accent onClick={onStopShare} label="Stop sharing">
              <ScreenShareOff className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onAnnotate} label="Annotate">
              <PenLine className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onLaser} label="Laser pointer" className="hidden sm:flex">
              <MousePointer2 className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onFullscreen} label="Fullscreen" className="hidden sm:flex">
              <Fullscreen className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn pressed={recording} recording={recording} onClick={onRecord} label={recording ? "Stop recording" : "Start recording"} hint="R">
              <CircleDot className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
          </>
        )}

        {activity === "present" && (
          <>
            <DockBtn onClick={onSlides} label="Slides">
              <Presentation className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onPrev} label="Previous slide">
              <ChevronLeft className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onNext} label="Next slide">
              <ChevronRight className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onTimer} label="Timer" className="hidden sm:flex">
              <Timer className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn onClick={onPoll} label="Poll" hint="P">
              <ClipboardList className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
            <DockBtn
              pressed={recording}
              recording={recording}
              onClick={onRecord}
              label={recording ? "Stop recording" : "Start recording"}
              hint="R"
              className="hidden md:flex"
            >
              <CircleDot className={icon} strokeWidth={sw} aria-hidden />
            </DockBtn>
          </>
        )}

        <span className="mx-1.5 hidden h-5 w-px bg-neutral-200/60 sm:block" aria-hidden />

        {canEnd ? (
          <button
            type="button"
            title="End Live"
            aria-label="End live session"
            onClick={onEnd}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full bg-red-500/95 px-3.5 text-[12px] font-medium tracking-[-0.01em] text-white",
              MOTION,
              FOCUS_RING,
              "hover:bg-red-500 active:scale-[0.98] sm:px-4"
            )}
          >
            <Square className="h-2.5 w-2.5" fill="currentColor" aria-hidden />
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
              "inline-flex h-10 items-center gap-2 rounded-full bg-neutral-900/90 px-3.5 text-[12px] font-medium tracking-[-0.01em] text-white",
              MOTION,
              FOCUS_RING,
              "hover:bg-neutral-900 active:scale-[0.98] sm:px-4"
            )}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Leave</span>
            <span className="sm:hidden">Leave</span>
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
        "inline-flex h-10 w-10 items-center justify-center rounded-full",
        MOTION,
        FOCUS_RING,
        "hover:scale-[1.02] active:scale-[0.97] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
        off
          ? "bg-red-500/10 text-red-600"
          : accent
            ? "bg-neutral-900 text-white"
            : recording
              ? "bg-red-500 text-white"
              : "text-neutral-600 hover:bg-black/[0.035] hover:text-neutral-900",
        className
      )}
    >
      {children}
    </button>
  );
}

export const ControlDock = memo(ControlDockImpl);
