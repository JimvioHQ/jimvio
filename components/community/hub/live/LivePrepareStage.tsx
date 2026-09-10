"use client";

import type { ReactNode } from "react";
import { Loader2, Mic, MicOff, Radio, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, FOCUS_RING_DARK } from "./studio-ui";

/**
 * Pre-live studio stage — authenticated users can preview media and Go Live
 * without joining a community first. Replaces the old "offline gate".
 */
export function LivePrepareStage({
  previewStream,
  title,
  busy,
  micOn,
  camOn,
  permissionDenied,
  lastError,
  onGoLive,
  onToggleMic,
  onToggleCam,
  canGoLive = true,
  destinationsSlot,
}: {
  previewStream?: MediaStream | null;
  title?: string;
  busy?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  permissionDenied?: { audio?: boolean; video?: boolean };
  lastError?: string | null;
  onGoLive?: () => void;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
  canGoLive?: boolean;
  destinationsSlot?: ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-[min(72vh,640px)] w-full flex-col overflow-hidden bg-gradient-to-b from-[#0f1115] via-[#141820] to-[#0a0c10]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,90,31,0.08),transparent_55%)]" />

      {previewStream ? (
        <video
          autoPlay
          muted
          playsInline
          ref={(el) => {
            if (el && el.srcObject !== previewStream) el.srcObject = previewStream;
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
      ) : null}

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-28 pt-10 text-center">
        {!previewStream ? (
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Radio className="h-7 w-7 text-white/40" strokeWidth={1.5} aria-hidden />
          </div>
        ) : null}

        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60 backdrop-blur-md">
          Ready to go live
        </span>

        <h2 className="max-w-lg text-[18px] font-bold tracking-[-0.02em] text-white sm:text-[22px]">
          {title?.trim() || "Start your Live"}
        </h2>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/50">
          Turn on your camera and mic, then go live. No community join required.
        </p>

        {(permissionDenied?.audio || permissionDenied?.video || lastError) && (
          <p className="mt-3 max-w-sm rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
            {lastError ||
              (permissionDenied?.video
                ? "Camera permission denied — allow access in browser settings."
                : "Microphone permission denied — allow access in browser settings.")}
          </p>
        )}

        {destinationsSlot ? (
          <div className="mt-5 w-full max-w-md text-left">{destinationsSlot}</div>
        ) : null}

        {canGoLive && onGoLive ? (
          <button
            type="button"
            onClick={onGoLive}
            disabled={busy}
            className={cn(
              "mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#FF5A1F] px-8 text-[14px] font-semibold text-white hover:bg-[#e54e1a] disabled:opacity-60",
              FOCUS_RING
            )}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Starting…
              </>
            ) : (
              "Go Live"
            )}
          </button>
        ) : (
          <p className="mt-6 text-[13px] text-white/45">Sign in to start a Live.</p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[2] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="inline-flex items-center gap-1 rounded-[18px] border border-white/10 bg-black/55 px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <button
            type="button"
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            onClick={onToggleMic}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl",
              FOCUS_RING_DARK,
              micOn ? "bg-white/15 text-white" : "bg-red-500/90 text-white"
            )}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            onClick={onToggleCam}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl",
              FOCUS_RING_DARK,
              camOn ? "bg-white/15 text-white" : "bg-red-500/90 text-white"
            )}
          >
            {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use LivePrepareStage — kept as alias during migration */
export { LivePrepareStage as LiveOfflineStage };
