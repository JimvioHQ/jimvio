"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Activity, Calendar, Check, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import type { LiveDashboard, Speaker } from "@/lib/community/hub-live-types";
import type { LeftPanel, RightTab, SpeakerUi, StudioMode } from "./studio-types";
import { LAYOUTS } from "./studio-types";
import { formatCount, formatMoney, formatTime } from "./studio-utils";
import { FOCUS_RING, MOTION_COLORS } from "./studio-ui";

function Empty({ hint }: { hint: string }) {
  return (
    <p className="mx-auto max-w-[240px] py-10 text-center text-[12px] leading-relaxed text-neutral-400" role="status">
      {hint}
    </p>
  );
}

export function ScrollPersist({
  scrollKey,
  scrollTop,
  onSave,
  children,
  className,
}: {
  scrollKey: string;
  scrollTop: number;
  onSave: (y: number) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && scrollTop > 0) el.scrollTop = scrollTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore when panel key changes
  }, [scrollKey]);
  return (
    <div
      ref={ref}
      onScroll={(e) => onSave((e.target as HTMLDivElement).scrollTop)}
      className={className}
    >
      {children}
    </div>
  );
}

export function QaPanel() {
  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <Empty hint="Audience questions will collect here during the session." />
      <button
        type="button"
        className={cn(
          "mx-auto mt-2 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-medium text-white hover:opacity-90",
          MOTION_COLORS,
          FOCUS_RING
        )}
      >
        Enable Q&A
      </button>
    </div>
  );
}

export function PollsPanel({ hasPolls }: { hasPolls: boolean }) {
  if (!hasPolls) {
    return (
      <div className="flex flex-1 flex-col px-4 py-8">
        <Empty hint="No active polls. Launch one when you want a pulse check." />
        <button
          type="button"
          className={cn(
            "mx-auto mt-2 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-medium text-white hover:opacity-90",
            MOTION_COLORS,
            FOCUS_RING
          )}
        >
          Create poll
        </button>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <div className="rounded-xl bg-neutral-50 px-3 py-3">
        <p className="text-[13px] font-medium text-neutral-900">Which pair are you watching?</p>
        <div className="mt-3 space-y-2">
          {["EUR/USD", "GBP/USD", "XAU/USD"].map((opt, i) => (
            <div key={opt} className="relative overflow-hidden rounded-lg bg-white px-3 py-2.5 ring-1 ring-black/[0.04]">
              <div
                className="absolute inset-y-0 left-0 bg-neutral-900/5"
                style={{ width: `${[48, 32, 20][i]}%` }}
              />
              <div className="relative flex justify-between text-[12px]">
                <span className="font-medium">{opt}</span>
                <span className="tabular-nums text-neutral-400">{[48, 32, 20][i]}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClipsPanel({
  clips,
}: {
  clips: { id: string; author: string; text: string; time: string }[];
}) {
  if (clips.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <Empty hint="No clips yet — mark a moment when something lands." />
      </div>
    );
  }
  return (
    <ScrollPersist scrollKey="clips" scrollTop={0} onSave={() => undefined} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {clips.map((c) => (
        <div key={c.id}>
          <p className="text-[11px] text-neutral-400">
            {c.author} · {c.time}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">{c.text}</p>
        </div>
      ))}
    </ScrollPersist>
  );
}

export function EventsPanel({
  upcoming,
  related,
}: {
  upcoming: LiveDashboard["upcomingSessions"];
  related: LiveDashboard["relatedRooms"];
}) {
  if (upcoming.length === 0 && related.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <Empty hint="No upcoming events or related rooms." />
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
      {related.map((ch) => (
        <Link
          key={ch.id}
          href={ch.href}
          className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-neutral-50"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{ch.name}</p>
            <p className="truncate text-[11px] text-neutral-400">
              {formatCount(ch.message_count)} · {ch.community_name}
            </p>
          </div>
        </Link>
      ))}
      {upcoming.map((ev) => (
        <Link
          key={ev.id}
          href={ev.href}
          className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-neutral-50"
        >
          <Calendar className="h-4 w-4 shrink-0 text-neutral-300" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{ev.title}</p>
            <p className="text-[11px] text-neutral-400">
              {formatTime(ev.start_date)} · {ev.host}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: LiveDashboard["analytics"] | undefined }) {
  const rows = [
    { label: "Viewers", value: formatCount(analytics?.viewers ?? 0) },
    { label: "Peak", value: formatCount(analytics?.peakViewers ?? 0) },
    { label: "New joins", value: formatCount(analytics?.newJoins ?? 0) },
    { label: "Likes", value: formatCount(analytics?.likes ?? 0) },
    { label: "Messages", value: formatCount(analytics?.messages ?? 0) },
    { label: "Watch time", value: `${formatCount(analytics?.watchTimeMinutes ?? 0)}m` },
    {
      label: "Revenue",
      value: (analytics?.revenue ?? 0) > 0 ? formatMoney(analytics!.revenue) : "—",
    },
    { label: "Retention", value: `${analytics?.reactionsPct ?? 0}%` },
  ];
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2.5">
        <Activity className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.75} />
        <span className="text-[12px] font-medium text-emerald-700">Stream healthy</span>
      </div>
      <dl className="space-y-3.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[12px] text-neutral-400">{row.label}</dt>
            <dd className="text-[13px] font-medium tabular-nums text-neutral-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PeoplePanel({
  speakers,
  viewers,
  activeSpeakerId,
  onSelect,
  onOpenProfile,
  query,
  onQuery,
  pendingRequests,
  onAcceptRequest,
  onRejectRequest,
  waitingRoom,
  onAdmitWaiting,
  onRejectWaiting,
  onAdmitAllWaiting,
  inviteValue,
  onInviteValue,
  inviteRole,
  onInviteRole,
  onInvite,
  canManage,
  onMute,
  onPromote,
  onRemove,
  ui,
}: {
  speakers: Speaker[];
  viewers: number;
  activeSpeakerId: string | null;
  onSelect: (id: string) => void;
  onOpenProfile?: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  pendingRequests?: Speaker[];
  onAcceptRequest?: (id: string) => void;
  onRejectRequest?: (id: string) => void;
  waitingRoom?: Speaker[];
  onAdmitWaiting?: (id: string) => void;
  onRejectWaiting?: (id: string) => void;
  onAdmitAllWaiting?: () => void;
  inviteValue?: string;
  onInviteValue?: (v: string) => void;
  inviteRole?: string;
  onInviteRole?: (v: string) => void;
  onInvite?: () => void;
  canManage?: boolean;
  onMute?: (id: string) => void;
  onPromote?: (id: string) => void;
  onRemove?: (id: string) => void;
  ui?: Record<string, SpeakerUi>;
}) {
  const q = query.trim().toLowerCase();
  const filtered = speakers.filter((s) => s.name.toLowerCase().includes(q));
  const filteredRequests = (pendingRequests ?? []).filter((s) =>
    s.name.toLowerCase().includes(q)
  );
  const filteredWaiting = (waitingRoom ?? []).filter((s) =>
    s.name.toLowerCase().includes(q)
  );
  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search participants…"
        className={cn(
          "w-full rounded-xl bg-neutral-50 px-3 py-2 text-[13px] outline-none ring-1 ring-black/[0.04] placeholder:text-neutral-400 focus:ring-black/[0.08]",
          FOCUS_RING
        )}
        aria-label="Search participants"
      />
      {canManage && onInvite && onInviteValue && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              value={inviteValue ?? ""}
              onChange={(e) => onInviteValue(e.target.value)}
              placeholder="Invite by user id…"
              className={cn(
                "min-w-0 flex-1 rounded-xl bg-neutral-50 px-3 py-2 text-[12px] outline-none ring-1 ring-black/[0.04]",
                FOCUS_RING
              )}
              aria-label="Invite user id"
            />
            <button
              type="button"
              onClick={onInvite}
              className={cn(
                "rounded-xl bg-neutral-900 px-3 py-2 text-[11px] font-semibold text-white",
                FOCUS_RING
              )}
            >
              Invite
            </button>
          </div>
          {onInviteRole && (
            <select
              value={inviteRole ?? "speaker"}
              onChange={(e) => onInviteRole(e.target.value)}
              className={cn(
                "w-full rounded-xl bg-neutral-50 px-3 py-2 text-[12px] outline-none ring-1 ring-black/[0.04]",
                FOCUS_RING
              )}
              aria-label="Invite role"
            >
              <option value="speaker">Speaker</option>
              <option value="cohost">Co-host</option>
              <option value="moderator">Moderator</option>
              <option value="viewer">Viewer</option>
            </select>
          )}
        </div>
      )}
      <p className="px-1 text-[12px] text-neutral-400">
        {speakers.length} in live · {formatCount(viewers)} watching
      </p>
      {filteredWaiting.length > 0 && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-medium text-neutral-400">Waiting room</p>
            {onAdmitAllWaiting && (
              <button
                type="button"
                onClick={onAdmitAllWaiting}
                className="text-[11px] font-semibold text-neutral-700 hover:underline"
              >
                Admit all
              </button>
            )}
          </div>
          {filteredWaiting.map((s) => (
            <div
              key={`wait-${s.id}`}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2"
            >
              <HubAvatar name={s.name} src={s.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{s.name}</p>
                <p className="text-[11px] text-neutral-400">Waiting for admission</p>
              </div>
              {(onAdmitWaiting || onRejectWaiting) && (
                <div className="flex shrink-0 gap-1.5">
                  {onRejectWaiting && (
                    <button
                      type="button"
                      onClick={() => onRejectWaiting(s.id)}
                      className={cn(
                        "rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200",
                        FOCUS_RING
                      )}
                    >
                      Reject
                    </button>
                  )}
                  {onAdmitWaiting && (
                    <button
                      type="button"
                      onClick={() => onAdmitWaiting(s.id)}
                      className={cn(
                        "rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-neutral-800",
                        FOCUS_RING
                      )}
                    >
                      Admit
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {filteredRequests.length > 0 && (
        <div className="space-y-0.5">
          <p className="px-1 text-[11px] font-medium text-neutral-400">Hand raises</p>
          {filteredRequests.map((s) => (
            <div
              key={s.id}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2"
            >
              <HubAvatar name={s.name} src={s.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{s.name}</p>
                <p className="text-[11px] text-neutral-400">Requested to speak</p>
              </div>
              {(onAcceptRequest || onRejectRequest) && (
                <div className="flex shrink-0 gap-1.5">
                  {onRejectRequest && (
                    <button
                      type="button"
                      onClick={() => onRejectRequest(s.id)}
                      className={cn(
                        "rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200",
                        FOCUS_RING
                      )}
                    >
                      Reject
                    </button>
                  )}
                  {onAcceptRequest && (
                    <button
                      type="button"
                      onClick={() => onAcceptRequest(s.id)}
                      className={cn(
                        "rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-neutral-800",
                        FOCUS_RING
                      )}
                    >
                      Accept
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-0.5">
        {filtered.map((s) => {
          const state = ui?.[s.id];
          const roleKey = String(state?.role || s.role || "").toLowerCase();
          const roleLabel =
            roleKey === "host"
              ? "Host"
              : roleKey === "cohost" || roleKey === "co-host"
                ? "Co-host"
                : roleKey === "speaker"
                  ? "Speaker"
                  : roleKey === "moderator"
                    ? "Moderator"
                    : roleKey === "viewer"
                      ? "Viewer"
                      : s.role || "Member";
          const isHost = roleKey === "host";
          const micOn = state?.micOn ?? false;
          const camOn = state?.camOn ?? false;
          const connection = state?.connection ?? "good";
          const online =
            connection === "good" || connection === "warn" || Boolean(state);
          const presenceLabel =
            connection === "poor"
              ? "Weak connection"
              : connection === "warn"
                ? "Reconnecting"
                : online
                  ? "Connected"
                  : "Offline";
          const openProfile = () => {
            onSelect(s.id);
            onOpenProfile?.(s.id);
          };
          return (
          <div
            key={s.id}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-150",
              activeSpeakerId === s.id ? "bg-neutral-100" : "hover:bg-neutral-50"
            )}
          >
            <button
              type="button"
              onClick={openProfile}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openProfile();
                }
              }}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left",
                FOCUS_RING
              )}
              aria-label={`Open profile for ${s.name}, ${roleLabel}, ${presenceLabel}${micOn ? "" : ", muted"}${camOn ? "" : ", camera off"}`}
            >
              <HubAvatar name={s.name} src={s.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium underline-offset-2 group-hover:underline">
                  {s.name}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {roleLabel}
                  <span className="text-neutral-300"> · </span>
                  {presenceLabel}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1" aria-hidden>
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full",
                    micOn ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/10 text-red-500"
                  )}
                  title={micOn ? "Mic on" : "Muted"}
                >
                  {micOn ? (
                    <Mic className="h-2.5 w-2.5" strokeWidth={2.2} />
                  ) : (
                    <MicOff className="h-2.5 w-2.5" strokeWidth={2.2} />
                  )}
                </span>
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full",
                    camOn ? "bg-emerald-500/15 text-emerald-600" : "bg-neutral-100 text-neutral-400"
                  )}
                  title={camOn ? "Camera on" : "Camera off"}
                >
                  {camOn ? (
                    <Video className="h-2.5 w-2.5" strokeWidth={2.2} />
                  ) : (
                    <VideoOff className="h-2.5 w-2.5" strokeWidth={2.2} />
                  )}
                </span>
                <span
                  className={cn(
                    "ml-0.5 h-1.5 w-1.5 rounded-full",
                    connection === "poor"
                      ? "bg-red-400"
                      : connection === "warn"
                        ? "bg-amber-400"
                        : isHost
                          ? "bg-accent"
                          : "bg-emerald-500"
                  )}
                  title={presenceLabel}
                />
              </span>
            </button>
            {canManage && !isHost && (
              <div className="flex shrink-0 gap-1">
                {onMute && (
                  <button
                    type="button"
                    onClick={() => onMute(s.id)}
                    className="rounded-md px-1.5 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-200"
                  >
                    Mute
                  </button>
                )}
                {onPromote && (
                  <button
                    type="button"
                    onClick={() => onPromote(s.id)}
                    className="rounded-md px-1.5 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-200"
                  >
                    Promote
                  </button>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(s.id)}
                    className="rounded-md px-1.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-2 py-8 text-center text-[12px] leading-relaxed text-neutral-400" role="status">
            {speakers.length === 0
              ? "No one in the live yet — invite people when you’re ready."
              : "No matching participants."}
          </p>
        )}
      </div>
    </div>
  );
}

export function RoomsPanel({
  rooms,
  related,
}: {
  rooms: LiveDashboard["rooms"];
  related: LiveDashboard["relatedRooms"];
}) {
  const list = [...rooms, ...related.filter((r) => !rooms.some((x) => x.id === r.id))];
  if (list.length === 0) return <Empty hint="No active rooms." />;
  return (
    <div className="space-y-0.5">
      {list.map((r) => (
        <Link
          key={r.id}
          href={r.href}
          className="block rounded-xl px-2.5 py-2.5 transition-colors duration-150 hover:bg-neutral-50"
        >
          <p className="truncate text-[13px] font-medium">{r.name}</p>
          <p className="text-[11px] text-neutral-400">
            {r.community_name} · {formatCount(r.message_count)}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function LayoutPanel({
  layout,
  onChange,
}: {
  layout: (typeof LAYOUTS)[number];
  onChange: (l: (typeof LAYOUTS)[number]) => void;
}) {
  return (
    <div className="space-y-1">
      {LAYOUTS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] transition-all duration-150",
            layout === l
              ? "bg-neutral-900 font-medium text-white"
              : "text-neutral-600 hover:bg-neutral-50"
          )}
        >
          {l}
          {layout === l && <Check className="h-3.5 w-3.5" />}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({
  title,
  onSaveTitle,
  canEditTitle,
  audioDevices = [],
  videoDevices = [],
  activeAudioId,
  activeVideoId,
  onSwitchMic,
  onSwitchCam,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  sharing,
  onStartShare,
  onStopShare,
  chatEnabled = true,
  onChatEnabled,
  canManageChat = false,
}: {
  /** @deprecated unused */
  mode?: StudioMode;
  /** @deprecated unused */
  onMode?: (m: StudioMode) => void;
  title?: string;
  onSaveTitle?: (next: string) => Promise<void> | void;
  canEditTitle?: boolean;
  audioDevices?: { deviceId: string; label: string }[];
  videoDevices?: { deviceId: string; label: string }[];
  activeAudioId?: string | null;
  activeVideoId?: string | null;
  onSwitchMic?: (deviceId: string) => void;
  onSwitchCam?: (deviceId: string) => void;
  micOn?: boolean;
  camOn?: boolean;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
  sharing?: boolean;
  onStartShare?: () => void;
  onStopShare?: () => void;
  chatEnabled?: boolean;
  onChatEnabled?: (enabled: boolean) => void;
  canManageChat?: boolean;
}) {
  const [draftTitle, setDraftTitle] = useState(title ?? "");
  const [titleBusy, setTitleBusy] = useState(false);
  const [titleMsg, setTitleMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraftTitle(title ?? "");
  }, [title]);

  return (
    <div className="space-y-5 px-1 pb-4">
      {canEditTitle && onSaveTitle ? (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Live title
          </p>
          <div className="flex gap-2">
            <input
              value={draftTitle}
              maxLength={120}
              onChange={(e) => setDraftTitle(e.target.value)}
              className={cn(
                "min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-[13px] outline-none focus:border-accent",
                FOCUS_RING
              )}
              aria-label="Live title"
            />
            <button
              type="button"
              disabled={titleBusy}
              onClick={() => {
                void (async () => {
                  setTitleBusy(true);
                  setTitleMsg(null);
                  try {
                    await onSaveTitle(draftTitle);
                    setTitleMsg("Saved");
                  } catch (e) {
                    setDraftTitle(title ?? "");
                    setTitleMsg(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setTitleBusy(false);
                  }
                })();
              }}
              className={cn(
                "rounded-xl bg-neutral-900 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60",
                FOCUS_RING
              )}
            >
              {titleBusy ? "…" : "Save"}
            </button>
          </div>
          {titleMsg ? (
            <p className="mt-1.5 text-[11px] text-neutral-500" role="status">
              {titleMsg}
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          Audio
        </p>
        <div className="space-y-1.5">
          {onToggleMic ? (
            <button
              type="button"
              onClick={onToggleMic}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] hover:bg-neutral-50",
                FOCUS_RING
              )}
            >
              Microphone
              <span className="text-[11px] font-semibold text-neutral-500">
                {micOn ? "On" : "Off"}
              </span>
            </button>
          ) : null}
          {audioDevices.length > 0 && onSwitchMic ? (
            <select
              value={activeAudioId ?? audioDevices[0]?.deviceId ?? ""}
              onChange={(e) => onSwitchMic(e.target.value)}
              aria-label="Select microphone"
              className={cn(
                "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[12px]",
                FOCUS_RING
              )}
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="px-1 text-[12px] text-neutral-400">
              Enable mic to list devices.
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          Video
        </p>
        <div className="space-y-1.5">
          {onToggleCam ? (
            <button
              type="button"
              onClick={onToggleCam}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] hover:bg-neutral-50",
                FOCUS_RING
              )}
            >
              Camera
              <span className="text-[11px] font-semibold text-neutral-500">
                {camOn ? "On" : "Off"}
              </span>
            </button>
          ) : null}
          {videoDevices.length > 0 && onSwitchCam ? (
            <select
              value={activeVideoId ?? videoDevices[0]?.deviceId ?? ""}
              onChange={(e) => onSwitchCam(e.target.value)}
              aria-label="Select camera"
              className={cn(
                "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[12px]",
                FOCUS_RING
              )}
            >
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="px-1 text-[12px] text-neutral-400">
              Enable camera to list devices.
            </p>
          )}
        </div>
      </div>

      {(onStartShare || onStopShare) && (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Screen share
          </p>
          <button
            type="button"
            onClick={sharing ? onStopShare : onStartShare}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] hover:bg-neutral-50",
              FOCUS_RING
            )}
          >
            {sharing ? "Stop sharing" : "Share screen"}
            <span className="text-[11px] font-semibold text-neutral-500">
              {sharing ? "Active" : "Off"}
            </span>
          </button>
        </div>
      )}

      {canManageChat && onChatEnabled ? (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Chat
          </p>
          <button
            type="button"
            onClick={() => onChatEnabled(!chatEnabled)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] hover:bg-neutral-50",
              FOCUS_RING
            )}
          >
            Allow chat
            <span className="text-[11px] font-semibold text-neutral-500">
              {chatEnabled ? "On" : "Off"}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DrawerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-[13px] font-medium tracking-[-0.01em]">{title}</p>
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "rounded-lg px-2 py-1 text-[11px] font-medium text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
          MOTION_COLORS,
          FOCUS_RING
        )}
      >
        Close
      </button>
    </div>
  );
}

export type { LeftPanel, RightTab };
