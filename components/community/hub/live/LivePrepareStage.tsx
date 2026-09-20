"use client";

import type { ReactNode } from "react";
import { Loader2, Mic, MicOff, Radio, ShieldAlert, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, FOCUS_RING_DARK } from "./studio-ui";
import type { MediaAccessKind } from "@/lib/live/media-errors";

/**
 * Pre-live studio stage — minimal preview + primary streaming CTAs.
 * Permission UX is compact (dock + optional recovery), never a giant onboarding block.
 */
export function LivePrepareStage({
  previewStream,
  title,
  busy,
  micOn,
  camOn,
  permissionDenied,
  permissionRequested = false,
  audioAccess = "idle",
  videoAccess = "idle",
  lastError,
  onGoLive,
  onToggleMic,
  onToggleCam,
  onEnableMedia,
  onStreamDestinations,
  mediaBusy = false,
  canGoLive = true,
}: {
  previewStream?: MediaStream | null;
  title?: string;
  busy?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  permissionDenied?: { audio?: boolean; video?: boolean };
  permissionRequested?: boolean;
  audioAccess?: MediaAccessKind;
  videoAccess?: MediaAccessKind;
  lastError?: string | null;
  onGoLive?: () => void;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
  onEnableMedia?: () => void;
  /** Opens Live Destinations / multi-platform stream setup */
  onStreamDestinations?: () => void;
  mediaBusy?: boolean;
  canGoLive?: boolean;
  /** @deprecated unused — destinations managed via Stream CTA */
  destinationsHint?: ReactNode;
}) {
  const camReady = Boolean(
    camOn && previewStream?.getVideoTracks().some((t) => t.readyState === "live")
  );
  const micReady = Boolean(micOn);
  const blocked =
    audioAccess === "denied" ||
    videoAccess === "denied" ||
    permissionDenied?.audio ||
    permissionDenied?.video;
  const needsPermission =
    !permissionRequested ||
    audioAccess === "idle" ||
    videoAccess === "idle" ||
    (!camReady &&
      !micReady &&
      !blocked &&
      audioAccess !== "granted" &&
      videoAccess !== "granted");

  const showRecovery =
    permissionRequested &&
    (blocked ||
      ["not_found", "unavailable", "overconstrained", "security", "unknown"].includes(
        audioAccess
      ) ||
      ["not_found", "unavailable", "overconstrained", "security", "unknown"].includes(
        videoAccess
      ) ||
      Boolean(lastError));

  const camBlocked = videoAccess === "denied" || permissionDenied?.video;
  const micBlocked = audioAccess === "denied" || permissionDenied?.audio;

  function handleStreamDestinations() {
    if (needsPermission && onEnableMedia && !showRecovery) {
      onEnableMedia();
    }
    onStreamDestinations?.();
  }

  return (
    <div className="relative flex h-full min-h-[min(72vh,640px)] w-full flex-col overflow-hidden bg-[#0c0e12]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,90,31,0.06),transparent_55%)]" />

      {previewStream ? (
        <video
          autoPlay
          muted
          playsInline
          ref={(el) => {
            if (!el) return;
            if (el.srcObject !== previewStream) el.srcObject = previewStream;
            void el.play().catch(() => undefined);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {/* Soft vignette over preview for readable CTAs */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 pb-28 pt-8 text-center">
        {!previewStream ? (
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
            <Radio className="h-6 w-6 text-white/35" strokeWidth={1.5} aria-hidden />
          </div>
        ) : null}

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          {previewStream ? "Preview" : "Ready to go live"}
        </p>

        <h2 className="max-w-md text-[20px] font-semibold tracking-[-0.03em] text-white sm:text-[24px]">
          {title?.trim() || "Start your Live"}
        </h2>

        {showRecovery ? (
          <div
            className="mt-5 max-w-sm rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-left"
            role="status"
          >
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-50">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {lastError ||
                  (blocked
                    ? "Camera & microphone access is blocked. Allow access in your browser settings, then try again."
                    : "Could not access your camera or microphone.")}
              </span>
            </p>
            {onEnableMedia ? (
              <button
                type="button"
                onClick={onEnableMedia}
                disabled={mediaBusy}
                className={cn(
                  "mt-2.5 inline-flex min-h-8 items-center justify-center rounded-lg bg-white/10 px-3 text-[11px] font-semibold text-white hover:bg-white/15 disabled:opacity-60",
                  FOCUS_RING_DARK
                )}
              >
                {mediaBusy ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" aria-hidden />
                    Trying…
                  </>
                ) : (
                  "Try again"
                )}
              </button>
            ) : null}
          </div>
        ) : null}

        {canGoLive ? (
          <div className="mt-7 flex w-full max-w-xs flex-col items-stretch gap-2.5">
            {onStreamDestinations ? (
              <button
                type="button"
                onClick={handleStreamDestinations}
                disabled={busy || mediaBusy}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-[13px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/16 disabled:opacity-60",
                  FOCUS_RING_DARK
                )}
              >
                {mediaBusy && needsPermission ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Requesting access…
                  </>
                ) : (
                  "Stream to multiple platforms"
                )}
              </button>
            ) : null}

            {onGoLive ? (
              <button
                type="button"
                onClick={() => {
                  if (needsPermission && onEnableMedia && !showRecovery) {
                    onEnableMedia();
                  }
                  onGoLive();
                }}
                disabled={busy}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#FF5A1F] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#e54e1a] disabled:opacity-60",
                  FOCUS_RING
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Starting…
                  </>
                ) : (
                  "Go Live"
                )}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-[13px] text-white/45">Sign in to start a Live.</p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[2] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="inline-flex items-center gap-1 rounded-[18px] border border-white/10 bg-black/55 px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <button
            type="button"
            title={
              micBlocked
                ? "Microphone blocked — allow access in browser settings"
                : micOn
                  ? "Mute microphone"
                  : "Unmute microphone"
            }
            aria-label={
              micBlocked
                ? "Microphone blocked"
                : micOn
                  ? "Mute microphone"
                  : "Unmute microphone"
            }
            onClick={() => {
              if ((micBlocked || needsPermission) && onEnableMedia) onEnableMedia();
              else onToggleMic?.();
            }}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl",
              FOCUS_RING_DARK,
              micBlocked
                ? "bg-amber-500/90 text-white"
                : micOn
                  ? "bg-white/15 text-white"
                  : "bg-red-500/90 text-white"
            )}
          >
            {micOn && !micBlocked ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            title={
              camBlocked
                ? "Camera blocked — allow access in browser settings"
                : camOn
                  ? "Turn camera off"
                  : "Turn camera on"
            }
            aria-label={
              camBlocked ? "Camera blocked" : camOn ? "Turn camera off" : "Turn camera on"
            }
            onClick={() => {
              if ((camBlocked || needsPermission) && onEnableMedia) onEnableMedia();
              else onToggleCam?.();
            }}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl",
              FOCUS_RING_DARK,
              camBlocked
                ? "bg-amber-500/90 text-white"
                : camOn
                  ? "bg-white/15 text-white"
                  : "bg-red-500/90 text-white"
            )}
          >
            {camOn && !camBlocked ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use LivePrepareStage — kept as alias during migration */
export { LivePrepareStage as LiveOfflineStage };
