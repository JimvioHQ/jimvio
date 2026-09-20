"use client";

import { useState } from "react";
import Link from "next/link";
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
  if (
    status === "failed" ||
    status === "error" ||
    status === "reconnect_required"
  )
    return "bg-red-400";
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
    case "reconnect_required":
      return "Reconnect required";
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

type Theme = {
  shell: string;
  title: string;
  subtitle: string;
  warn: string;
  error: string;
  row: string;
  iconMuted: string;
  iconJimvio: string;
  name: string;
  meta: string;
  badge: string;
  message: string;
  connectBtn: string;
  dashedBtn: string;
  form: string;
  input: string;
  cancel: string;
  enableOn: string;
  enableOff: string;
  iconBtn: string;
  focus: string;
};

const STUDIO_THEME: Theme = {
  shell: "border border-white/10 bg-black/45 text-left backdrop-blur-md",
  title: "text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55",
  subtitle: "mt-0.5 text-[12px] text-white/40",
  warn: "mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100",
  error: "mb-3 text-[12px] text-red-300",
  row: "flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5",
  iconMuted: "flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-[11px] font-bold text-white/70",
  iconJimvio: "flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5A1F]/20 text-[11px] font-bold text-[#FF5A1F]",
  name: "text-[13px] font-medium text-white",
  meta: "text-[11px] text-white/45",
  badge: "rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/50",
  message: "mt-0.5 line-clamp-2 text-[11px] text-white/35",
  connectBtn: "rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-white/15",
  dashedBtn:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-[12px] font-medium text-white/60 hover:border-white/25 hover:text-white/80",
  form: "space-y-2 rounded-xl border border-white/10 bg-black/30 p-3",
  input:
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder:text-white/30",
  cancel: "flex-1 rounded-lg px-3 py-2 text-[12px] text-white/50 hover:text-white/80",
  enableOn: "bg-emerald-500/20 text-emerald-300",
  enableOff: "bg-white/10 text-white/70 hover:bg-white/15",
  iconBtn: "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/80",
  focus: FOCUS_RING_DARK,
};

const SETTINGS_THEME: Theme = {
  shell: "border border-[#E8E4DC] bg-white text-left shadow-sm",
  title: "text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]",
  subtitle: "mt-0.5 text-[12px] text-[#8B8579]",
  warn: "mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900",
  error: "mb-3 text-[12px] text-red-600",
  row: "flex items-center gap-3 rounded-xl border border-[#EFEBE3] bg-[#FBF9F6] px-3 py-2.5",
  iconMuted: "flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EBE3] text-[11px] font-bold text-[#6B655C]",
  iconJimvio: "flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF1EA] text-[11px] font-bold text-[#D6480F]",
  name: "text-[13px] font-medium text-[#1C1B19]",
  meta: "text-[11px] text-[#8B8579]",
  badge: "rounded-md bg-[#F0EBE3] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#8B8579]",
  message: "mt-0.5 line-clamp-2 text-[11px] text-[#8B8579]",
  connectBtn:
    "rounded-lg bg-[#1C1B19] px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#2c2a26]",
  dashedBtn:
    "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D9D3C8] px-3 py-2.5 text-[12px] font-medium text-[#8B8579] hover:border-[#C7C1B4] hover:text-[#1C1B19]",
  form: "space-y-2 rounded-xl border border-[#E8E4DC] bg-[#FBF9F6] p-3",
  input:
    "w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-[13px] text-[#1C1B19] placeholder:text-[#B0A99C]",
  cancel: "flex-1 rounded-lg px-3 py-2 text-[12px] text-[#8B8579] hover:text-[#1C1B19]",
  enableOn: "bg-emerald-50 text-emerald-700",
  enableOff: "bg-[#F0EBE3] text-[#6B655C] hover:bg-[#E8E4DC]",
  iconBtn:
    "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EBE3] text-[#8B8579] hover:bg-[#E8E4DC] hover:text-[#1C1B19]",
  focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6480F]/35 focus-visible:ring-offset-2",
};

export function LiveDestinationsPanel({
  dest,
  compact = false,
  isLive = false,
  variant = "studio",
}: {
  dest: DestHook;
  compact?: boolean;
  isLive?: boolean;
  variant?: "studio" | "settings";
}) {
  const t = variant === "settings" ? SETTINGS_THEME : STUDIO_THEME;
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
        "w-full rounded-2xl",
        t.shell,
        compact ? "p-3" : "p-4 sm:p-5",
        variant === "studio" && MOTION_COLORS
      )}
      aria-label="Live destinations"
    >
      {variant === "studio" ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className={t.title}>Live Destinations</h3>
            {!compact ? (
              <p className={t.subtitle}>
                Stream once on Jimvio — fan out to connected platforms.
              </p>
            ) : null}
          </div>
          {dest.loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/40" aria-hidden />
          ) : null}
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className={t.subtitle}>
            Enable destinations before Go Live. Connect accounts here — Jimvio Live
            is never interrupted by an external destination failure.
          </p>
          {dest.loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#B0A99C]" aria-hidden />
          ) : null}
        </div>
      )}

      {!dest.encryptionConfigured ? (
        <p className={t.warn}>
          Destination encryption is not configured on this deployment.
        </p>
      ) : null}

      {dest.error ? <p className={t.error}>{dest.error}</p> : null}

      <ul className="space-y-2">
        <li className={t.row}>
          <span className={t.iconJimvio}>JV</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={t.name}>Jimvio</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(isLive ? "live" : "ready"))} />
              <span className={t.meta}>{isLive ? "LIVE" : "Always on"}</span>
            </div>
          </div>
          <Check className="h-4 w-4 text-emerald-500" aria-hidden />
        </li>

        {dest.catalog
          .filter((c) => c.platform !== "jimvio" && c.platform !== "custom_rtmp")
          .map((entry) => {
            const connected = dest.destinations.filter(
              (d) => d.platform === entry.platform
            );
            if (connected.length === 0) {
              const requiresApproval = entry.status === "requires_approval";
              const canConnectAccount = Boolean(entry.connectPath);
              return (
                <li key={entry.platform} className={t.row}>
                  <span className={t.iconMuted}>
                    {platformIconLabel(entry.platform)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={t.name}>{entry.label}</span>
                      {requiresApproval ? (
                        <span className={t.badge}>Live requires approval</span>
                      ) : (
                        <span className={t.badge}>Not connected</span>
                      )}
                    </div>
                    {requiresApproval && entry.message ? (
                      <p className={t.message}>{entry.message}</p>
                    ) : null}
                  </div>
                  {canConnectAccount ? (
                    <button
                      type="button"
                      onClick={() => dest.connect(entry.platform)}
                      className={cn(t.connectBtn, t.focus)}
                    >
                      Connect
                    </button>
                  ) : null}
                </li>
              );
            }

            return connected.map((d) => {
              const sess = sessionByDest.get(d.id);
              const accountConnected = d.accountConnected && d.status === "connected";
              const rowStatus =
                sess?.status ??
                (d.status === "reconnect_required"
                  ? "reconnect_required"
                  : accountConnected
                    ? "connected"
                    : d.requiresApproval
                      ? "requires_approval"
                      : d.status === "connected"
                        ? "connected"
                        : "reconnect_required");
              const selected = dest.selectedIds.includes(d.id);
              const canEnableLive =
                d.liveStreamingAllowed !== false && d.status !== "reconnect_required";
              return (
                <DestinationRow
                  key={d.id}
                  theme={t}
                  name={d.displayName}
                  platform={d.platform}
                  status={rowStatus}
                  selected={selected}
                  isLive={isLive}
                  avatarUrl={d.avatarUrl}
                  subtitle={
                    d.status === "reconnect_required"
                      ? "Token expired — reconnect required"
                      : d.platform === "tiktok" && d.requiresApproval
                        ? "Account connected · Live streaming requires approval"
                        : undefined
                  }
                  lastError={sess?.lastError ?? d.lastError}
                  canEnable={canEnableLive}
                  onToggle={() => dest.toggleSelected(d.id)}
                  onDisconnect={() => {
                    setBusyId(d.id);
                    void dest.disconnect(d.id).finally(() => setBusyId(null));
                  }}
                  onReconnect={
                    d.status === "reconnect_required" && entry.connectPath
                      ? () => dest.connect(d.platform)
                      : undefined
                  }
                  onRetry={
                    canEnableLive &&
                    sess &&
                    (sess.status === "failed" || sess.status === "reconnecting")
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

        {dest.destinations
          .filter((d) => d.platform === "custom_rtmp")
          .map((d) => {
            const sess = sessionByDest.get(d.id);
            const rowStatus = sess?.status ?? "connected";
            return (
              <DestinationRow
                key={d.id}
                theme={t}
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
            className={cn(t.dashedBtn, t.focus)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add Custom RTMP
          </button>
        ) : (
          <div className={t.form}>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name"
              className={t.input}
            />
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="rtmps://example.com/live"
              className={t.input}
              autoComplete="off"
            />
            <input
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="Stream key"
              type="password"
              className={t.input}
              autoComplete="new-password"
            />
            {formError ? <p className={t.error}>{formError}</p> : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className={t.cancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === "custom"}
                onClick={() => void onAddCustom()}
                className={cn(
                  "flex-1 rounded-lg bg-[#FF5A1F] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60",
                  t.focus
                )}
              >
                {busyId === "custom" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>

      {variant === "settings" ? (
        <p className="mt-4 text-[12px] text-[#8B8579]">
          Destinations enabled here are used when you Go Live from{" "}
          <Link href="/communities/live" className="font-semibold text-[#D6480F] hover:underline">
            Live Studio
          </Link>
          . Jimvio Live is never interrupted by an external destination failure.
        </p>
      ) : null}

      {isLive && dest.sessionStatuses.length > 0 && !compact && variant === "studio" ? (
        <DesktopHealthTable sessions={dest.sessionStatuses} />
      ) : null}
    </section>
  );
}

function DestinationRow({
  theme: t,
  name,
  platform,
  status,
  selected,
  isLive,
  avatarUrl,
  subtitle,
  lastError,
  canEnable = true,
  onToggle,
  onDisconnect,
  onReconnect,
  onRetry,
  busy,
}: {
  theme: Theme;
  name: string;
  platform: DestinationPlatform;
  status: string;
  selected: boolean;
  isLive: boolean;
  avatarUrl?: string | null;
  subtitle?: string;
  lastError?: string | null;
  canEnable?: boolean;
  onToggle: () => void;
  onDisconnect: () => void;
  onReconnect?: () => void;
  onRetry?: () => void;
  busy?: boolean;
}) {
  return (
    <li className={t.row}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 rounded-lg object-cover"
        />
      ) : (
        <span className={t.iconMuted}>{platformIconLabel(platform)}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("truncate", t.name)}>{name}</span>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(status))} />
          <span className={t.meta}>{statusLabel(status)}</span>
        </div>
        {subtitle ? <p className={cn("truncate", t.message)}>{subtitle}</p> : null}
        {lastError ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-amber-700">{lastError}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {onReconnect ? (
          <button
            type="button"
            onClick={onReconnect}
            disabled={busy}
            className={cn(t.connectBtn, t.focus)}
          >
            Reconnect
          </button>
        ) : null}
        {canEnable &&
        (!isLive || status === "connected" || status === "ready" || status === "stopped") ? (
          <button
            type="button"
            aria-pressed={selected}
            onClick={onToggle}
            className={cn(
              "rounded-lg px-2 py-1.5 text-[11px] font-medium",
              t.focus,
              selected ? t.enableOn : t.enableOff
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
            className={cn(t.iconBtn, t.focus)}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDisconnect}
          disabled={busy}
          aria-label="Disconnect destination"
          className={cn(t.iconBtn, t.focus)}
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
            {s.status === "live" ? "Good" : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
