"use client";

import { useState } from "react";
import {
  Check,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING_DARK, MOTION_COLORS } from "./studio-ui";
import type { useLiveDestinations } from "@/hooks/live/useLiveDestinations";
import type {
  DestinationPlatform,
  PublicDestinationSession,
} from "@/lib/live/destinations/types";

type DestHook = ReturnType<typeof useLiveDestinations>;

function statusDot(status: string) {
  if (status === "live") return "bg-red-500 animate-pulse";
  if (status === "ready" || status === "connected" || status === "supported")
    return "bg-emerald-400";
  if (status === "connecting" || status === "reconnecting" || status === "preparing")
    return "bg-amber-400 animate-pulse";
  if (status === "failed" || status === "error") return "bg-red-400";
  if (status === "requires_approval") return "bg-neutral-500";
  return "bg-white/30";
}

function statusLabel(status: string) {
  switch (status) {
    case "live":
      return "LIVE";
    case "ready":
      return "Ready";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "failed":
      return "Failed";
    case "requires_approval":
      return "Requires approval";
    case "connected":
      return "Connected";
    case "stopped":
      return "Stopped";
    default:
      return status;
  }
}

function platformIconLabel(platform: DestinationPlatform): string {
  switch (platform) {
    case "jimvio":
      return "JV";
    case "youtube":
      return "YT";
    case "twitch":
      return "TW";
    case "facebook":
      return "FB";
    case "instagram":
      return "IG";
    case "tiktok":
      return "TT";
    case "custom_rtmp":
      return "RT";
    default:
      return "?";
  }
}

export function LiveDestinationsPanel({
  dest,
  compact = false,
  isLive = false,
}: {
  dest: DestHook;
  compact?: boolean;
  isLive?: boolean;
}) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const sessionByDest = new Map(
    dest.sessionStatuses.map((s) => [s.destinationId, s])
  );

  async function onAddCustom() {
    setFormError(null);
    setBusyId("custom");
    try {
      await dest.addCustomRtmp({
        displayName: customName.trim() || "Custom RTMP",
        rtmpUrl: customUrl.trim(),
        streamKey: customKey.trim(),
      });
      setCustomName("");
      setCustomUrl("");
      setCustomKey("");
      setShowCustomForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not add destination");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-black/45 text-left backdrop-blur-md",
        compact ? "p-3" : "p-4",
        MOTION_COLORS
      )}
      aria-label="Live destinations"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">
            Live Destinations
          </h3>
          {!compact ? (
            <p className="mt-0.5 text-[12px] text-white/40">
              Stream once on Jimvio — fan out to connected platforms.
            </p>
          ) : null}
        </div>
        {dest.loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white/40" aria-hidden />
        ) : null}
      </div>

      {!dest.encryptionConfigured ? (
        <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          Destination encryption is not configured on this deployment.
        </p>
      ) : null}

      {dest.error ? (
        <p className="mb-3 text-[12px] text-red-300">{dest.error}</p>
      ) : null}

      <ul className="space-y-2">
        {/* Jimvio always on */}
        <li className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5A1F]/20 text-[11px] font-bold text-[#FF5A1F]">
            JV
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-white">Jimvio</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(isLive ? "live" : "ready"))} />
              <span className="text-[11px] text-white/45">
                {isLive ? "LIVE" : "Always on"}
              </span>
            </div>
          </div>
          <Check className="h-4 w-4 text-emerald-400" aria-hidden />
        </li>

        {dest.catalog
          .filter((c) => c.platform !== "jimvio" && c.platform !== "custom_rtmp")
          .map((entry) => {
            const connected = dest.destinations.filter(
              (d) => d.platform === entry.platform
            );
            if (connected.length === 0) {
              const requiresApproval = entry.status === "requires_approval";
              return (
                <li
                  key={entry.platform}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-[11px] font-bold text-white/70">
                    {platformIconLabel(entry.platform)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-white">
                        {entry.label}
                      </span>
                      {requiresApproval ? (
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                          Requires approval
                        </span>
                      ) : null}
                    </div>
                    {requiresApproval && entry.message ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-white/35">
                        {entry.message}
                      </p>
                    ) : null}
                  </div>
                  {!requiresApproval && entry.connectPath ? (
                    <button
                      type="button"
                      onClick={() => dest.connect(entry.platform)}
                      className={cn(
                        "rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-white/15",
                        FOCUS_RING_DARK
                      )}
                    >
                      Connect
                    </button>
                  ) : null}
                </li>
              );
            }

            return connected.map((d) => {
              const sess = sessionByDest.get(d.id);
              const rowStatus = sess?.status ?? (d.requiresApproval ? "requires_approval" : "connected");
              const selected = dest.selectedIds.includes(d.id);
              return (
                <DestinationRow
                  key={d.id}
                  name={d.displayName}
                  platform={d.platform}
                  status={rowStatus}
                  selected={selected}
                  isLive={isLive}
                  avatarUrl={d.avatarUrl}
                  lastError={sess?.lastError ?? d.lastError}
                  onToggle={() => dest.toggleSelected(d.id)}
                  onDisconnect={() => {
                    setBusyId(d.id);
                    void dest.disconnect(d.id).finally(() => setBusyId(null));
                  }}
                  onRetry={
                    sess && (sess.status === "failed" || sess.status === "reconnecting")
                      ? () => {
                          setBusyId(d.id);
                          void dest
                            .retryDestination(sess.liveSessionId, sess.id)
                            .finally(() => setBusyId(null));
                        }
                      : undefined
                  }
                  busy={busyId === d.id}
                />
              );
            });
          })}

        {/* Custom RTMP destinations */}
        {dest.destinations
          .filter((d) => d.platform === "custom_rtmp")
          .map((d) => {
            const sess = sessionByDest.get(d.id);
            const rowStatus = sess?.status ?? "connected";
            return (
              <DestinationRow
                key={d.id}
                name={d.displayName}
                platform="custom_rtmp"
                status={rowStatus}
                selected={dest.selectedIds.includes(d.id)}
                isLive={isLive}
                subtitle={d.rtmpUrlMasked ?? undefined}
                lastError={sess?.lastError ?? d.lastError}
                onToggle={() => dest.toggleSelected(d.id)}
                onDisconnect={() => {
                  setBusyId(d.id);
                  void dest.disconnect(d.id).finally(() => setBusyId(null));
                }}
                onRetry={
                  sess && sess.status === "failed"
                    ? () => {
                        setBusyId(d.id);
                        void dest
                          .retryDestination(sess.liveSessionId, sess.id)
                          .finally(() => setBusyId(null));
                      }
                    : undefined
                }
                busy={busyId === d.id}
              />
            );
          })}
      </ul>

      <div className="mt-3">
        {!showCustomForm ? (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-[12px] font-medium text-white/60 hover:border-white/25 hover:text-white/80",
              FOCUS_RING_DARK
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add Custom RTMP
          </button>
        ) : (
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder:text-white/30"
            />
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="rtmps://example.com/live"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder:text-white/30"
              autoComplete="off"
            />
            <input
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="Stream key"
              type="password"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder:text-white/30"
              autoComplete="new-password"
            />
            {formError ? (
              <p className="text-[11px] text-red-300">{formError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="flex-1 rounded-lg px-3 py-2 text-[12px] text-white/50 hover:text-white/80"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === "custom"}
                onClick={() => void onAddCustom()}
                className={cn(
                  "flex-1 rounded-lg bg-[#FF5A1F] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60",
                  FOCUS_RING_DARK
                )}
              >
                {busyId === "custom" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>

      {isLive && dest.sessionStatuses.length > 0 && !compact ? (
        <DesktopHealthTable sessions={dest.sessionStatuses} />
      ) : null}
    </section>
  );
}

function DestinationRow({
  name,
  platform,
  status,
  selected,
  isLive,
  avatarUrl,
  subtitle,
  lastError,
  onToggle,
  onDisconnect,
  onRetry,
  busy,
}: {
  name: string;
  platform: DestinationPlatform;
  status: string;
  selected: boolean;
  isLive: boolean;
  avatarUrl?: string | null;
  subtitle?: string;
  lastError?: string | null;
  onToggle: () => void;
  onDisconnect: () => void;
  onRetry?: () => void;
  busy?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-[11px] font-bold text-white/70">
          {platformIconLabel(platform)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13px] font-medium text-white">{name}</span>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(status))} />
          <span className="text-[11px] text-white/45">{statusLabel(status)}</span>
        </div>
        {subtitle ? (
          <p className="truncate text-[11px] text-white/35">{subtitle}</p>
        ) : null}
        {lastError ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-amber-200/80">{lastError}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {!isLive || status === "connected" || status === "ready" || status === "stopped" ? (
          <button
            type="button"
            aria-pressed={selected}
            onClick={onToggle}
            className={cn(
              "rounded-lg px-2 py-1.5 text-[11px] font-medium",
              FOCUS_RING_DARK,
              selected
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            )}
          >
            {selected ? "Enabled" : "Enable"}
          </button>
        ) : null}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={busy}
            aria-label="Retry destination"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/15",
              FOCUS_RING_DARK
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDisconnect}
          disabled={busy}
          aria-label="Disconnect destination"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/80",
            FOCUS_RING_DARK
          )}
        >
          <Unplug className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function DesktopHealthTable({
  sessions,
}: {
  sessions: PublicDestinationSession[];
}) {
  return (
    <div className="mt-4 hidden overflow-hidden rounded-xl border border-white/8 sm:block">
      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-white/8 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        <span>Platform</span>
        <span>Status</span>
        <span>Health</span>
      </div>
      {sessions.map((s) => (
        <div
          key={s.id}
          className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-white/5 px-3 py-2 text-[12px] text-white/70 last:border-0"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Radio className="h-3 w-3 text-white/35" aria-hidden />
            {s.displayName}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(s.status))} />
            {statusLabel(s.status)}
          </span>
          <span className="truncate text-white/45">
            {s.health?.errorReason
              ? "—"
              : s.status === "live"
                ? "Good"
                : s.status === "failed"
                  ? "—"
                  : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
