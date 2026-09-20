"use client";

import { useMemo, useState } from "react";
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
import { UGCPlatformIcon } from "@/components/ugc/workspace/UGCPlatformMarks";
import {
  isUserVisibleLiveDestination,
  USER_VISIBLE_LIVE_DESTINATIONS,
} from "@/lib/live/destinations/capabilities";
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
  if (status === "not_connected") return "bg-neutral-400/50";
  if (
    status === "connecting" ||
    status === "reconnecting" ||
    status === "preparing"
  )
    return "bg-amber-400 animate-pulse";
  if (
    status === "failed" ||
    status === "error" ||
    status === "reconnect_required"
  )
    return "bg-red-400";
  if (status === "requires_approval") return "bg-amber-500/80";
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
      return "Retrying";
    case "preparing":
      return "Preparing";
    case "failed":
      return "Failed";
    case "requires_approval":
      return "Approval required";
    case "connected":
      return "Connected";
    case "reconnect_required":
      return "Reconnect required";
    case "stopped":
      return "Stopped";
    case "not_connected":
      return "Not connected";
    case "supported":
      return "Ready";
    default:
      return status;
  }
}

type Theme = {
  shell: string;
  title: string;
  subtitle: string;
  warn: string;
  error: string;
  list: string;
  row: string;
  iconShell: string;
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
  divider: string;
};

const STUDIO_THEME: Theme = {
  shell: "border border-white/10 bg-black/45 text-left backdrop-blur-md",
  title: "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50",
  subtitle: "mt-0.5 text-[11px] leading-snug text-white/35",
  warn: "mb-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-100",
  error: "mb-2.5 text-[11px] text-red-300",
  list: "divide-y divide-white/[0.06]",
  row: "flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0",
  iconShell:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/10",
  iconJimvio:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF5A1F]/15 text-[10px] font-bold tracking-wide text-[#FF5A1F] ring-1 ring-[#FF5A1F]/25",
  name: "truncate text-[13px] font-medium text-white",
  meta: "text-[10px] font-medium uppercase tracking-[0.08em] text-white/40",
  badge:
    "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/45 bg-white/[0.06]",
  message: "mt-0.5 line-clamp-1 text-[10px] text-white/30",
  connectBtn:
    "shrink-0 rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/16",
  dashedBtn:
    "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/12 px-2.5 py-2 text-[11px] font-medium text-white/45 transition-colors hover:border-white/22 hover:text-white/70",
  form: "mt-2 space-y-2 rounded-lg border border-white/10 bg-black/30 p-2.5",
  input:
    "w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/25",
  cancel: "flex-1 rounded-md px-2.5 py-1.5 text-[11px] text-white/45 hover:text-white/75",
  enableOn: "bg-emerald-500/20 text-emerald-300",
  enableOff: "bg-white/8 text-white/55 hover:bg-white/12",
  iconBtn:
    "inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/8 text-white/45 transition-colors hover:bg-white/14 hover:text-white/80",
  focus: FOCUS_RING_DARK,
  divider: "border-t border-white/[0.06] pt-2.5 mt-2.5",
};

const SETTINGS_THEME: Theme = {
  shell: "border border-[#E8E4DC] bg-white text-left shadow-sm",
  title: "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A9388]",
  subtitle: "mt-0.5 text-[11px] leading-snug text-[#8B8579]",
  warn: "mb-2.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900",
  error: "mb-2.5 text-[11px] text-red-600",
  list: "divide-y divide-[#EFEBE3]",
  row: "flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0",
  iconShell:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F7F4EF] ring-1 ring-[#E8E4DC]",
  iconJimvio:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF1EA] text-[10px] font-bold tracking-wide text-[#D6480F] ring-1 ring-[#FFD8C4]",
  name: "truncate text-[13px] font-medium text-[#1C1B19]",
  meta: "text-[10px] font-medium uppercase tracking-[0.08em] text-[#9A9388]",
  badge:
    "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8B8579] bg-[#F0EBE3]",
  message: "mt-0.5 line-clamp-1 text-[10px] text-[#9A9388]",
  connectBtn:
    "shrink-0 rounded-md bg-[#1C1B19] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#2c2a26]",
  dashedBtn:
    "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D9D3C8] px-2.5 py-2 text-[11px] font-medium text-[#8B8579] transition-colors hover:border-[#C7C1B4] hover:text-[#1C1B19]",
  form: "mt-2 space-y-2 rounded-lg border border-[#E8E4DC] bg-[#FBF9F6] p-2.5",
  input:
    "w-full rounded-md border border-[#E8E4DC] bg-white px-2.5 py-1.5 text-[12px] text-[#1C1B19] placeholder:text-[#B0A99C]",
  cancel: "flex-1 rounded-md px-2.5 py-1.5 text-[11px] text-[#8B8579] hover:text-[#1C1B19]",
  enableOn: "bg-emerald-50 text-emerald-700",
  enableOff: "bg-[#F0EBE3] text-[#6B655C] hover:bg-[#E8E4DC]",
  iconBtn:
    "inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#F0EBE3] text-[#8B8579] transition-colors hover:bg-[#E8E4DC] hover:text-[#1C1B19]",
  focus:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6480F]/35 focus-visible:ring-offset-2",
  divider: "border-t border-[#EFEBE3] pt-2.5 mt-2.5",
};

function PlatformGlyph({
  platform,
  theme,
}: {
  platform: DestinationPlatform;
  theme: Theme;
}) {
  if (platform === "jimvio") {
    return <span className={theme.iconJimvio}>JV</span>;
  }
  return (
    <span className={theme.iconShell} aria-hidden>
      <UGCPlatformIcon platform={platform} className="h-4 w-4" />
    </span>
  );
}

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

  const sessionByDest = useMemo(
    () => new Map(dest.sessionStatuses.map((s) => [s.destinationId, s])),
    [dest.sessionStatuses]
  );

  /** Ordered user-facing catalog: YouTube → Twitch → TikTok (Jimvio rendered separately). */
  const visibleCatalog = useMemo(() => {
    const byPlatform = new Map(dest.catalog.map((c) => [c.platform, c]));
    return USER_VISIBLE_LIVE_DESTINATIONS.filter((p) => p !== "jimvio")
      .map((p) => byPlatform.get(p))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [dest.catalog]);

  const customDestinations = useMemo(
    () => dest.destinations.filter((d) => d.platform === "custom_rtmp"),
    [dest.destinations]
  );

  const visibleSessions = useMemo(
    () =>
      dest.sessionStatuses.filter((s) => {
        const destRow = dest.destinations.find((d) => d.id === s.destinationId);
        if (!destRow) return false;
        return (
          isUserVisibleLiveDestination(destRow.platform) ||
          destRow.platform === "custom_rtmp" ||
          destRow.platform === "jimvio"
        );
      }),
    [dest.destinations, dest.sessionStatuses]
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
        "w-full rounded-xl",
        t.shell,
        compact ? "p-3" : "p-3.5 sm:p-4",
        variant === "studio" && MOTION_COLORS
      )}
      aria-label="Live destinations"
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={t.title}>Live Destinations</h3>
          {!compact ? (
            <p className={t.subtitle}>
              Fan out from Jimvio without interrupting the studio.
            </p>
          ) : null}
        </div>
        {dest.loading ? (
          <Loader2
            className={cn(
              "h-3.5 w-3.5 shrink-0 animate-spin",
              variant === "studio" ? "text-white/35" : "text-[#B0A99C]"
            )}
            aria-hidden
          />
        ) : null}
      </div>

      {!dest.encryptionConfigured ? (
        <p className={t.warn}>
          Destination encryption is not configured on this deployment.
        </p>
      ) : null}

      {dest.error ? <p className={t.error}>{dest.error}</p> : null}

      <ul className={t.list}>
        {/* Jimvio — native primary destination */}
        <li className={t.row}>
          <PlatformGlyph platform="jimvio" theme={t} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className={t.name}>Jimvio</span>
              <span
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot(isLive ? "live" : "ready"))}
              />
              <span className={t.meta}>{isLive ? "LIVE" : "Active"}</span>
            </div>
          </div>
          <Check
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              variant === "studio" ? "text-emerald-400" : "text-emerald-600"
            )}
            aria-hidden
          />
        </li>

        {visibleCatalog.map((entry) => {
          const connected = dest.destinations.filter(
            (d) => d.platform === entry.platform
          );

          if (connected.length === 0) {
            const requiresApproval = entry.status === "requires_approval";
            const canConnectAccount = Boolean(entry.connectPath);
            const rowStatus = requiresApproval
              ? "requires_approval"
              : "not_connected";

            return (
              <li key={entry.platform} className={t.row}>
                <PlatformGlyph platform={entry.platform} theme={t} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className={t.name}>{entry.label}</span>
                    <span className={t.meta}>{statusLabel(rowStatus)}</span>
                  </div>
                  {requiresApproval && entry.platform === "tiktok" && !canConnectAccount ? (
                    <p className={t.message}>Live API access pending App Review</p>
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
                ) : requiresApproval ? (
                  <span className={t.badge} aria-label="Approval required">
                    Pending
                  </span>
                ) : null}
              </li>
            );
          }

          return connected.map((d) => {
            const sess = sessionByDest.get(d.id);
            const accountConnected =
              d.accountConnected && d.status === "connected";
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
              d.liveStreamingAllowed !== false &&
              d.status !== "reconnect_required";

            return (
              <DestinationRow
                key={d.id}
                theme={t}
                name={entry.label}
                platform={d.platform}
                status={rowStatus}
                selected={selected}
                isLive={isLive}
                avatarUrl={d.avatarUrl}
                subtitle={
                  d.status === "reconnect_required"
                    ? "Authorization expired"
                    : d.platform === "tiktok" &&
                        d.accountConnected &&
                        d.requiresApproval
                      ? "Account linked · Live needs App Review"
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

        {customDestinations.map((d) => {
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

      <div className={t.divider}>
        {!showCustomForm ? (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className={cn(t.dashedBtn, t.focus)}
          >
            <Plus className="h-3 w-3" aria-hidden />
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
                  "flex-1 rounded-md bg-[#FF5A1F] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60",
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
        <p className="mt-3 text-[11px] leading-relaxed text-[#8B8579]">
          Enabled destinations fan out when you Go Live from{" "}
          <Link
            href="/communities/live"
            className="font-semibold text-[#D6480F] hover:underline"
          >
            Live Studio
          </Link>
          .
        </p>
      ) : null}

      {isLive &&
      visibleSessions.length > 0 &&
      !compact &&
      variant === "studio" ? (
        <DesktopHealthTable sessions={visibleSessions} />
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
          className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
        />
      ) : (
        <PlatformGlyph platform={platform} theme={t} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={t.name}>{name}</span>
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot(status))} />
          <span className={t.meta}>{statusLabel(status)}</span>
        </div>
        {subtitle ? <p className={t.message}>{subtitle}</p> : null}
        {lastError ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] text-amber-600/90">{lastError}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
        (!isLive ||
          status === "connected" ||
          status === "ready" ||
          status === "stopped") ? (
          <button
            type="button"
            aria-pressed={selected}
            onClick={onToggle}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold",
              t.focus,
              selected ? t.enableOn : t.enableOff
            )}
          >
            {selected ? "On" : "Off"}
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
            <RefreshCw className={cn("h-3 w-3", busy && "animate-spin")} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDisconnect}
          disabled={busy}
          aria-label={`Disconnect ${name}`}
          className={cn(t.iconBtn, t.focus)}
        >
          <Unplug className="h-3 w-3" />
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
    <div className="mt-3 hidden overflow-hidden rounded-lg border border-white/8 sm:block">
      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/35">
        <span>Platform</span>
        <span>Status</span>
        <span>Health</span>
      </div>
      {sessions.map((s) => (
        <div
          key={s.id}
          className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-white/5 px-2.5 py-1.5 text-[11px] text-white/65 last:border-0"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Radio className="h-2.5 w-2.5 text-white/30" aria-hidden />
            {s.displayName}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(s.status))} />
            {statusLabel(s.status)}
          </span>
          <span className="truncate text-white/40">
            {s.status === "live" ? "Good" : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
