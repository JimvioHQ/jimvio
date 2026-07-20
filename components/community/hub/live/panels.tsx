"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Activity, Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import type { LiveDashboard, Speaker } from "@/lib/community/hub-live-types";
import type { LeftPanel, RightTab, StudioMode } from "./studio-types";
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
  query,
  onQuery,
}: {
  speakers: Speaker[];
  viewers: number;
  activeSpeakerId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  const filtered = speakers.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase())
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
      <p className="px-1 text-[12px] text-neutral-400">
        {speakers.length} on stage · {formatCount(viewers)} watching
      </p>
      <div className="space-y-0.5">
        {filtered.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-150",
              activeSpeakerId === s.id ? "bg-neutral-100" : "hover:bg-neutral-50"
            )}
          >
            <HubAvatar name={s.name} src={s.avatar_url} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">
                {i === 0 ? `${s.name} (Host)` : s.name}
              </p>
              <p className="text-[11px] text-neutral-400">{s.role || "Speaker"}</p>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-8 text-center text-[12px] leading-relaxed text-neutral-400" role="status">
            {speakers.length === 0
              ? "No one on stage yet — invite a speaker when you’re ready."
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
  mode,
  onMode,
}: {
  mode: StudioMode;
  onMode: (m: StudioMode) => void;
}) {
  return (
    <div className="space-y-5 px-1">
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          Workspace mode
        </p>
        <div className="space-y-1">
          {(
            [
              ["minimal", "Minimal"],
              ["creator", "Creator"],
              ["studio", "Studio"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onMode(id)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] transition-colors duration-150",
                mode === id ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
              )}
            >
              {label}
              {mode === id && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-neutral-400">
        Shortcuts: ⌘K command · M mic · V camera · S share · R record · P poll · Esc close · Double-click stage for Focus
      </p>
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
