"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Maximize2, Mic, MicOff, Monitor, Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import { FOCUS_RING, FOCUS_RING_DARK } from "./studio-ui";

/**
 * Picture-in-picture participant tile inside the Host stage (bottom-right stack).
 * Rounded card — circular avatar when camera off; video fill when camera/share on.
 */
export function LiveStagePipTile({
  name,
  avatarUrl,
  stream,
  camOn,
  micOn,
  sharing = false,
  isYou = false,
  speaking = false,
  selected = false,
  canManage = false,
  onSelect,
  onViewFull,
  onMoveToStage,
  onStopShare,
}: {
  name: string;
  avatarUrl?: string | null;
  stream?: MediaStream | null;
  camOn: boolean;
  micOn: boolean;
  sharing?: boolean;
  isYou?: boolean;
  speaking?: boolean;
  selected?: boolean;
  canManage?: boolean;
  onSelect?: () => void;
  onViewFull?: () => void;
  onMoveToStage?: () => void;
  onStopShare?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = Boolean(stream && (camOn || sharing));

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = showVideo ? stream ?? null : null;
    if (showVideo) void el.play().catch(() => undefined);
  }, [showVideo, stream]);

  return (
    <div
      className={cn(
        "group relative w-[104px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.08] sm:w-[124px]",
        (speaking || selected) && "ring-2 ring-[#FF5A1F]",
        sharing && "ring-2 ring-[#7C3AED]/70"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${name}${isYou ? ", you" : ""}${sharing ? ", screen sharing" : ""}${!micOn ? ", muted" : ""}`}
        className={cn(
          "relative block aspect-[4/5] w-full overflow-hidden bg-[#EEF2F7]",
          FOCUS_RING
        )}
      >
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute inset-0 h-full w-full",
              sharing ? "object-contain bg-[#0B1220]" : "object-cover"
            )}
            aria-hidden
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-transparent">
            <span
              className="overflow-hidden rounded-full"
              style={{ width: 64, height: 64, borderRadius: 9999 }}
            >
              <HubAvatar
                name={name}
                src={avatarUrl}
                size={64}
                className="!bg-transparent !shadow-none !ring-0"
              />
            </span>
          </span>
        )}

        <span
          className={cn(
            "absolute bottom-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/30 shadow-sm",
            micOn ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          )}
          aria-hidden
        >
          {micOn ? (
            <Mic className="h-2.5 w-2.5" strokeWidth={2.2} />
          ) : (
            <MicOff className="h-2.5 w-2.5" strokeWidth={2.2} />
          )}
        </span>

        {sharing ? (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-[#7C3AED] px-1.5 py-0.5 text-[9px] font-semibold text-white">
            <Monitor className="h-2.5 w-2.5" aria-hidden />
            Screen
          </span>
        ) : null}
      </button>

      <div className="space-y-0.5 px-2 py-1.5 text-left">
        <p className="truncate text-[11px] font-semibold leading-tight text-[#111827]">
          {name}
        </p>
        {isYou ? (
          <p className="text-[10px] font-medium text-[#FF5A1F]">(You)</p>
        ) : sharing ? (
          <p className="text-[10px] font-medium text-[#7C3AED]">Screen sharing</p>
        ) : (
          <p className="text-[10px] text-neutral-400">Participant</p>
        )}
      </div>

      {(onViewFull || onMoveToStage || onStopShare) && (sharing || canManage) ? (
        <div className="flex items-center gap-0.5 border-t border-neutral-100 px-1 py-1">
          {onViewFull ? (
            <button
              type="button"
              title="View full"
              aria-label="View full"
              onClick={onViewFull}
              className={cn(
                "inline-flex h-7 flex-1 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800",
                FOCUS_RING
              )}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
          {onMoveToStage && canManage ? (
            <button
              type="button"
              title="Move to stage"
              aria-label="Move to stage"
              onClick={onMoveToStage}
              className={cn(
                "inline-flex h-7 flex-1 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800",
                FOCUS_RING
              )}
            >
              <Pin className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
          {onStopShare && canManage && sharing ? (
            <button
              type="button"
              title="Stop sharing"
              aria-label="Stop sharing"
              onClick={onStopShare}
              className={cn(
                "inline-flex h-7 flex-1 items-center justify-center rounded-lg text-red-500 hover:bg-red-50",
                FOCUS_RING
              )}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LiveStagePipStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 right-3 z-[5] flex max-h-[78%] flex-col-reverse items-end gap-2 overflow-y-auto sm:bottom-4 sm:right-4",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
      aria-label="Participant tiles"
    >
      <div className="pointer-events-auto flex flex-col-reverse items-end gap-2">
        {children}
      </div>
    </div>
  );
}

/** Optional local-only fullscreen overlay for View Full (does not change global stage). */
export function LiveViewFullOverlay({
  name,
  stream,
  onClose,
}: {
  name: string;
  stream: MediaStream | null;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  if (!stream) return null;

  return (
    <div
      className="absolute inset-0 z-[40] flex flex-col bg-black/92"
      role="dialog"
      aria-label={`Viewing ${name}`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="truncate text-[13px] font-semibold text-white">{name}</p>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/20",
            FOCUS_RING_DARK
          )}
        >
          Close
        </button>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="min-h-0 flex-1 object-contain"
      />
    </div>
  );
}
