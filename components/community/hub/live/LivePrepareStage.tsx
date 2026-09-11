"use client";

import type { ReactNode } from "react";
import { Loader2, Mic, MicOff, Radio, ShieldAlert, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, FOCUS_RING_DARK } from "./studio-ui";
import type { MediaAccessKind } from "@/lib/live/media-errors";

function accessLabel(kind: MediaAccessKind, ready: boolean, off: boolean): string {
  if (ready) return "Ready";
  if (kind === "idle") return "Needs permission";
  if (kind === "requesting") return "Requesting…";
  if (kind === "denied") return "Blocked";
  if (kind === "not_found") return "Unavailable";
  if (kind === "unavailable") return "In use";
  if (kind === "overconstrained") return "Unsupported";
  if (kind === "security") return "Blocked";
  if (off && kind === "granted") return "Off";
  if (kind === "granted") return "Ready";
  return "Unavailable";
}

/**
 * Pre-live studio stage — authenticated users can preview media and Go Live
 * without joining a community first.
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
  mediaBusy = false,
  canGoLive = true,
  destinationsHint,
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
  mediaBusy?: boolean;
  canGoLive?: boolean;
  destinationsHint?: ReactNode;
}) {
  const camReady = Boolean(camOn && previewStream?.getVideoTracks().some((t) => t.readyState === "live"));
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
    (!camReady && !micReady && !blocked && audioAccess !== "granted" && videoAccess !== "granted");

  const showRecovery =
    permissionRequested &&
    (blocked ||
      ["not_found", "unavailable", "overconstrained", "security", "unknown"].includes(audioAccess) ||
      ["not_found", "unavailable", "overconstrained", "security", "unknown"].includes(videoAccess) ||
      Boolean(lastError));

  const camBlocked = videoAccess === "denied" || permissionDenied?.video;
  const micBlocked = audioAccess === "denied" || permissionDenied?.audio;

  return (
    <div className="relative flex h-full min-h-[min(72vh,640px)] w-full flex-col overflow-hidden bg-[#0c0e12]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,90,31,0.07),transparent_55%)]" />

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
          Prepare your camera and microphone, then start your live.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium",
              camReady
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                : camBlocked
                  ? "border-red-500/30 bg-red-500/10 text-red-100"
                  : "border-white/10 bg-black/40 text-white/70"
            )}
            aria-label={`Camera ${accessLabel(videoAccess, camReady, !camOn)}`}
          >
            {camReady ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
            Camera · {accessLabel(videoAccess, camReady, !camOn)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium",
              micReady
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                : micBlocked
                  ? "border-red-500/30 bg-red-500/10 text-red-100"
                  : "border-white/10 bg-black/40 text-white/70"
            )}
            aria-label={`Microphone ${accessLabel(audioAccess, micReady, !micOn)}`}
          >
            {micReady ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            Microphone · {accessLabel(audioAccess, micReady, !micOn)}
          </span>
        </div>

        {showRecovery ? (
          <div
            className="mt-4 max-w-sm rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-left"
            role="status"
          >
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-50">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
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
                  "mt-3 inline-flex min-h-9 items-center justify-center rounded-full bg-white/10 px-4 text-[12px] font-semibold text-white hover:bg-white/15 disabled:opacity-60",
                  FOCUS_RING_DARK
                )}
              >
                {mediaBusy ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
                    Trying…
                  </>
                ) : (
                  "Try again"
                )}
              </button>
            ) : null}
          </div>
        ) : null}

        {destinationsHint ? (
          <div className="mt-4 text-[11px] text-white/45">{destinationsHint}</div>
        ) : null}

        {canGoLive && onEnableMedia && needsPermission && !showRecovery ? (
          <button
            type="button"
            onClick={onEnableMedia}
            disabled={mediaBusy || busy}
            className={cn(
              "mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-[14px] font-semibold text-neutral-900 hover:bg-white/90 disabled:opacity-60",
              FOCUS_RING
            )}
          >
            {mediaBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Requesting access…
              </>
            ) : (
              "Enable camera & microphone"
            )}
          </button>
        ) : null}

        {canGoLive && onGoLive ? (
          <button
            type="button"
            onClick={onGoLive}
            disabled={busy}
            className={cn(
              "mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#FF5A1F] px-8 text-[14px] font-semibold text-white hover:bg-[#e54e1a] disabled:opacity-60",
              FOCUS_RING,
              needsPermission && !showRecovery && onEnableMedia ? "mt-3" : "mt-6"
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
        ) : !canGoLive ? (
          <p className="mt-6 text-[13px] text-white/45">Sign in to start a Live.</p>
        ) : null}
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
              if (micBlocked && onEnableMedia) onEnableMedia();
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
              if (camBlocked && onEnableMedia) onEnableMedia();
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
