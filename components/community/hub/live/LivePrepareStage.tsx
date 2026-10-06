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
 * Pre-live studio — premium host preview. No giant white card, no nested
 * rectangular avatar frames. Settings stay closed; Go Live is the primary CTA.
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
  const blocked =
    audioAccess === "denied" ||
    videoAccess === "denied" ||
    permissionDenied?.audio ||
    permissionDenied?.video;
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

  return (
    <div className="relative flex h-full min-h-[min(72vh,680px)] w-full flex-col bg-transparent">
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center bg-transparent px-4 py-8 sm:px-8">
        {camReady && previewStream ? (
          <div className="flex flex-col items-center">
            <div
              className="relative overflow-hidden rounded-full"
              style={{ width: 168, height: 168, borderRadius: 9999 }}
            >
              <video
                autoPlay
                muted
                playsInline
                ref={(el) => {
                  if (!el) return;
                  if (el.srcObject !== previewStream) el.srcObject = previewStream;
                  void el.play().catch(() => undefined);
                }}
                className="h-full w-full rounded-full object-cover"
                style={{ borderRadius: 9999, objectFit: "cover" }}
              />
            </div>
            <p className="mt-4 max-w-[280px] truncate text-[20px] font-semibold tracking-[-0.03em] text-[#111827]">
              {displayName}
            </p>
          </div>
        ) : (
          <div className="relative z-[1] flex flex-col items-center bg-transparent text-center">
            <div
              className="relative mb-5 overflow-hidden rounded-full bg-transparent"
              style={{ width: 148, height: 148, borderRadius: 9999 }}
            >
              <HubAvatar
                name={displayName}
                src={hostAvatarUrl}
                size={148}
                className="!bg-transparent !shadow-none !ring-0"
              />
            </div>
            <p className="max-w-[280px] truncate text-[20px] font-semibold tracking-[-0.03em] text-[#111827]">
              {displayName}
            </p>
            {title?.trim() ? (
              <p className="mt-3 max-w-sm truncate text-[12px] text-[#94A3B8]">
                {title.trim()}
              </p>
            ) : null}
          </div>
        )}

        {/* Bottom AV + primary actions */}
        <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col items-center gap-3 px-4 pb-5 sm:pb-6">
          {showRecovery ? (
            <div
              className="w-full max-w-md rounded-2xl border border-amber-200/80 bg-white/95 px-3.5 py-3 text-left shadow-sm backdrop-blur-sm"
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

          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB]/90 bg-white/95 px-2 py-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.10)] backdrop-blur-sm">
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
                <Mic className="h-5 w-5" aria-hidden />
              ) : (
                <MicOff className="h-5 w-5" aria-hidden />
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
                if (camBlocked && onEnableMedia) onEnableMedia();
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
                <Video className="h-5 w-5" aria-hidden />
              ) : (
                <VideoOff className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>

          {canGoLive ? (
            <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row-reverse">
              {onGoLive ? (
                <button
                  type="button"
                  onClick={() => onGoLive()}
                  disabled={busy}
                  className={cn(
                    "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#FF5A1F] px-6 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(255,90,31,0.28)] transition-colors hover:bg-[#e54e1a] disabled:opacity-60",
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
                  onClick={() => onStreamDestinations()}
                  disabled={busy}
                  className={cn(
                    "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white/95 px-5 text-[14px] font-semibold text-[#111827] backdrop-blur-sm hover:bg-white disabled:opacity-60",
                    FOCUS_RING
                  )}
                >
                  <>
                    <Radio className="h-4 w-4 text-[#FF5A1F]" aria-hidden />
                    Destinations & RTMP
                  </>
                </button>
              ) : null}
            </div>
          ) : (
            <p className="rounded-full bg-white/90 px-4 py-2 text-[13px] text-[#64748B] shadow-sm">
              Sign in to start a Live.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use LivePrepareStage — kept as alias during migration */
export { LivePrepareStage as LiveOfflineStage };
