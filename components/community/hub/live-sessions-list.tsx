"use client";

import { useEffect, useState } from "react";
import {
  Radio, Users, Lock, Globe, Plus, LogIn, Clock,
} from "lucide-react";
import { LiveIndicator } from "./hub-ui";
import { HubAvatar, HubBadge } from "./hub-ui";

export function LiveSessionsList({
  communitySlug,
  onStartLive,
  onJoinSession,
}: {
  communitySlug?: string;
  onStartLive?: () => void;
  onJoinSession?: (session: LiveSessionItem) => void;
}) {
  const [liveSessions, setLiveSessions] = useState<LiveSessionItem[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [communitySlug]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const url = communitySlug ? `/api/c/live?communityId=${communitySlug}` : `/api/c/live`;
      const res = await fetch(url);
      if (res.ok) {
        const { sessions } = await res.json();
        const live = sessions.filter((s: LiveSessionItem) => s.status === "live");
        const upcoming = sessions.filter((s: LiveSessionItem) => s.status === "scheduled");
        setLiveSessions(live);
        setUpcomingSessions(upcoming);
      } else {
        setError("Failed to load sessions");
      }
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-[#0a0a0a]">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-30"
           style={{
             backgroundImage: `radial-gradient(circle, var(--color-border) 1px, transparent 1px)`,
             backgroundSize: "24px 24px",
             maskImage: "radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)",
           }} />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 bg-[#121212]/80 backdrop-blur px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fd5000]/10">
            <Radio className="h-5 w-5 text-[#fd5000]" />
          </div>
          <div>
            <h1 className="text-[15px] font-black text-white">Live Sessions</h1>
            <p className="text-[11px] text-zinc-500">{liveSessions.length} active now</p>
          </div>
        </div>
        {onStartLive && (
          <button
            type="button"
            onClick={onStartLive}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#fd5000] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#e04800] shadow-[0_2px_8px_rgba(253,80,0,0.3)]"
          >
            <Plus className="h-4 w-4" />
            Start Live
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Radio className="h-8 w-8 animate-spin text-[#fd5000]" />
              <p className="text-[13px] text-zinc-500">Loading sessions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
              <Radio className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-[16px] font-bold text-white">Failed to load</p>
            <p className="mt-1.5 max-w-[300px] text-[13px] text-zinc-500">{error}</p>
          </div>
        ) : liveSessions.length === 0 && upcomingSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
              <Radio className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-[16px] font-bold text-white">No live sessions</p>
            <p className="mt-1.5 max-w-[300px] text-[13px] text-zinc-500">
              {onStartLive
                ? "Start a live session in any space to go live"
                : "No one is live right now. Check back later!"}
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Live sessions */}
            {liveSessions.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <LiveIndicator label="LIVE NOW" className="text-[10px]" />
                  <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-400">{liveSessions.length} {liveSessions.length === 1 ? "session" : "sessions"} active</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {liveSessions.map((s) => (
                    <SessionCard key={s.id} session={s} onJoin={onJoinSession} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming sessions */}
            {upcomingSessions.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-500">Upcoming</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingSessions.map((s) => (
                    <SessionCard key={s.id} session={s} onJoin={onJoinSession} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onJoin,
}: {
  session: LiveSessionItem;
  onJoin?: (session: LiveSessionItem) => void;
}) {
  const startedAt = new Date(session.started_at);
  const isLive = session.status === "live";

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-[#121212] p-4 transition-all duration-300 hover:border-white/20 hover:bg-[#181818] hover-lift",
        isLive ? "border-red-500/20 bg-gradient-to-br from-red-500/5 via-transparent to-transparent" : "border-white/5"
      )}
    >
      {/* Status badge */}
      <div className="mb-3 flex items-center justify-between">
        {isLive ? (
          <LiveIndicator />
        ) : (
          <span className="rounded-md bg-zinc-700/30 px-2 py-0.5 text-[9px] font-bold text-zinc-400">UPCOMING</span>
        )}
        {session.privacy === "private" ? (
          <Lock className="h-3.5 w-3.5 text-zinc-600" />
        ) : (
          <Globe className="h-3.5 w-3.5 text-zinc-600" />
        )}
      </div>

      {/* Thumbnail area */}
      <div className="relative mb-3 aspect-video rounded-xl overflow-hidden bg-zinc-900/50">
        <div className="absolute inset-0 flex items-center justify-center">
          <Radio className="h-8 w-8 text-white/10" />
        </div>
        {isLive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600/80 px-2 py-0.5 text-[9px] font-mono font-medium text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="truncate text-[14px] font-bold text-white">{session.title}</h3>
      <p className="mt-0.5 text-[11px] text-zinc-500">{session.space_name}</p>

      {/* Host */}
      <div className="mt-3 flex items-center gap-2">
        <HubAvatar name={session.host} src={session.host_avatar} size={22} />
        <span className="text-[11px] font-semibold text-zinc-300">{session.host}</span>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        {isLive ? (
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            <Users className="h-3.5 w-3.5" />
            {session.viewer_count} watching
          </span>
        ) : (
          <span className="text-[11px] text-zinc-500">
            {startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}

        {onJoin && isLive && (
          <button
            type="button"
            onClick={() => onJoin(session)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#fd5000]/15 px-2.5 py-1 text-[10px] font-bold text-[#fd5000] transition hover:bg-[#fd5000]/25"
          >
            <LogIn className="h-3 w-3" />
            Join
          </button>
        )}
      </div>
    </div>
  );
}

function formatStat(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString();
}