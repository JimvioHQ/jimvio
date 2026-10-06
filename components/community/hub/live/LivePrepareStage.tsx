"use client";

import type { ReactNode } from "react";
import {
  Loader2,
  Mic,
  MicOff,
  Radio,
  ShieldAlert,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import { FOCUS_RING } from "./studio-ui";
import type { MediaAccessKind } from "@/lib/live/media-errors";

/**
 * Pre-live studio — light Jimvio canvas with real camera preview or host avatar.
 */
export function LivePrepareStage({
  previewStream,
  title,
  hostName,
  hostAvatarUrl,
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
  hostName?: string | null;
  hostAvatarUrl?: string | null;
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
  onStreamDestinations?: () => void;
  mediaBusy?: boolean;
  canGoLive?: boolean;
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
  const displayName = hostName?.trim() || "You";

  function handleStreamDestinations() {
    if (needsPermission && onEnableMedia && !showRecovery) {
      onEnableMedia();
    }
    onStreamDestinations?.();
  }

  return (
    <div className="flex h-full min-h-[min(68vh,620px)] w-full flex-col bg-[#F8FAFC] px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-4">
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,90,31,0.07),transparent_55%)]" />

          {camReady && previewStream ? (
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
          ) : (
            <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <div className="relative mb-4">
                <HubAvatar
                  name={displayName}
                  src={hostAvatarUrl}
                  size={112}
                  className="!ring-4 !ring-white shadow-[0_10px_30px_rgba(255,90,31,0.18)]"
                />
                <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#64748B] shadow-sm ring-1 ring-[#E5E7EB]">
                  <VideoOff className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <p className="max-w-[260px] truncate text-[17px] font-semibold tracking-[-0.02em] text-[#111827]">
                {displayName}
              </p>
              <p className="mt-1 text-[13px] text-[#64748B]">Camera off</p>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 z-[2] flex justify-center px-4 pb-4">
            <div className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
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
                  "inline-flex h-11 w-11 items-center justify-center rounded-full",
                  FOCUS_RING,
                  micBlocked
                    ? "bg-amber-500 text-white"
                    : micOn
                      ? "bg-[#F3F4F6] text-[#111827]"
                      : "bg-[#EF4444] text-white"
                )}
              >
                {micOn && !micBlocked ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
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
                  "inline-flex h-11 w-11 items-center justify-center rounded-full",
                  FOCUS_RING,
                  camBlocked
                    ? "bg-amber-500 text-white"
                    : camOn && camReady
                      ? "bg-[#F3F4F6] text-[#111827]"
                      : "bg-[#EF4444] text-white"
                )}
              >
                {camOn && !camBlocked ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Ready
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[#111827] sm:text-[20px]">
            {title?.trim() || "Start your Live"}
          </h2>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Preview your camera, then go live on Jimvio and any connected destinations.
          </p>

          {showRecovery ? (
            <div
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-left"
              role="status"
            >
              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-950">
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
                    "mt-2.5 inline-flex min-h-9 items-center justify-center rounded-lg bg-white px-3 text-[12px] font-semibold text-[#111827] ring-1 ring-[#E5E7EB] hover:bg-[#F8FAFC] disabled:opacity-60",
                    FOCUS_RING
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
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
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
                    "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#FF5A1F] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#e54e1a] disabled:opacity-60",
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
              ) : null}

              {onStreamDestinations ? (
                <button
                  type="button"
                  onClick={handleStreamDestinations}
                  disabled={busy || mediaBusy}
                  className={cn(
                    "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-6 text-[14px] font-semibold text-[#111827] hover:bg-[#F8FAFC] disabled:opacity-60",
                    FOCUS_RING
                  )}
                >
                  {mediaBusy && needsPermission ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Requesting access…
                    </>
                  ) : (
                    <>
                      <Radio className="h-4 w-4 text-[#FF5A1F]" aria-hidden />
                      Destinations & RTMP
                    </>
                  )}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 text-[13px] text-[#64748B]">Sign in to start a Live.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use LivePrepareStage — kept as alias during migration */
export { LivePrepareStage as LiveOfflineStage };
