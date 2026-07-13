"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Radio, Mic, Video, Monitor, Users, Settings, BarChart3, 
  Plus, Trash2, Edit, ExternalLink, AlertTriangle,
  Clock, Share2, Download, MoreHorizontal, X
} from "lucide-react";
import { formatElapsed, formatCount, formatMoney } from "@/lib/community/hub-live-page";
import { Key, Lock, Shield, Copy, DollarSign } from "lucide-react";

type LiveSession = {
  id: string;
  title: string;
  status: "scheduled" | "live" | "ended" | "cancelled";
  privacy: "public" | "private" | "members_only";
  viewer_count: number;
  peak_viewers: number;
  max_viewers: number;
  started_at: string | null;
  ended_at: string | null;
  scheduled_at: string | null;
  stream_key: string | null;
  space: { id: string; name: string; access_type: string } | null;
  host: { full_name: string; avatar_url: string | null } | null;
  created_at: string;
};

type DashboardStats = {
  totalSessions: number;
  liveNow: number;
  totalViewers: number;
  peakViewers: number;
  totalWatchTime: number;
  revenue: number;
};

export function CreatorStreamDashboard({ communitySlug }: { communitySlug?: string }) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"live" | "scheduled" | "past">("live");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [showStreamKey, setShowStreamKey] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [communitySlug]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const url = communitySlug ? `/api/c/live?communityId=${communitySlug}&limit=50` : `/api/c/live?limit=50`;
      const res = await fetch(url);
      if (res.ok) {
        const { sessions, membership } = await res.json();
        setSessions(sessions || []);
        computeStats(sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const computeStats = (sessions: LiveSession[]) => {
    const total = sessions.length;
    const live = sessions.filter(s => s.status === "live").length;
    const totalViewers = sessions.reduce((sum, s) => sum + (s.viewer_count || 0), 0);
    const peakViewers = sessions.reduce((sum, s) => sum + (s.peak_viewers || 0), 0);
    const totalWatchTime = sessions.reduce((sum, s) => {
      if (s.started_at && s.ended_at) {
        return sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000 / 60;
      }
      return sum;
    }, 0);
    setStats({ totalSessions: total, liveNow: live, totalViewers: totalViewers, peakViewers: peakViewers, totalWatchTime, revenue: 0 });
  };

  const filteredSessions = sessions.filter(s => {
    if (activeTab === "live") return s.status === "live";
    if (activeTab === "scheduled") return s.status === "scheduled";
    return s.status === "ended" || s.status === "cancelled";
  });

  const getStreamKey = async (sessionId: string) => {
    const res = await fetch(`/api/c/live/${sessionId}/stream-key`);
    if (res.ok) {
      const data = await res.json();
      setShowStreamKey(data.streamKey);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/c/live/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        fetchDashboard();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <div className="relative">
          <Radio className="h-10 w-10 animate-spin text-[var(--color-accent)]" />
          <div className="absolute inset-0 h-10 w-10 animate-pulse rounded-full bg-[var(--color-accent)]/10" />
        </div>
        <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)]/30 bg-[var(--color-surface)]/80 backdrop-blur px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
            <Radio className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-[15px] font-black text-[var(--color-text-primary)]">Creator Dashboard</h1>
            <p className="text-[11px] text-[var(--color-text-muted)]">Manage your live sessions</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--color-accent-hover)] shadow-[0_2px_8px_rgba(253,80,0,0.3)]"
        >
          <Plus className="h-4 w-4" />
          Go Live
        </button>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4 sm:px-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Radio} label="Total Sessions" value={stats?.totalSessions ?? 0} color="var(--color-accent)" />
        <StatCard icon={Radio} label="Live Now" value={stats?.liveNow ?? 0} color="#ef4444" />
        <StatCard icon={Users} label="Total Viewers" value={formatCount(stats?.totalViewers ?? 0)} color="#10b981" />
        <StatCard icon={Users} label="Peak Viewers" value={formatCount(stats?.peakViewers ?? 0)} color="#8b5cf6" />
        <StatCard icon={Clock} label="Watch Time (min)" value={formatCount(Math.round(stats?.totalWatchTime ?? 0))} color="#f59e0b" />
        <StatCard icon={<DollarSign />} label="Revenue" value={formatMoney(stats?.revenue ?? 0)} color="#22c55e" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 px-4 sm:px-6">
        {(["live", "scheduled", "past"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "live" | "scheduled" | "past")}
            className={cn(
              "flex items-center gap-1.5 px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider transition",
              activeTab === tab
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            {tab === "live" && <Radio className="h-3.5 w-3.5" />}
            {tab === "scheduled" && <Clock className="h-3.5 w-3.5" />}
            {tab === "past" && <BarChart3 className="h-3.5 w-3.5" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {filteredSessions.length > 0 && (
              <span className="ml-1 rounded bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--color-text-muted)]">
                {filteredSessions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)]">
              <Radio className="h-8 w-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[16px] font-bold text-[var(--color-text-primary)]">No sessions yet</p>
            <p className="mt-1.5 max-w-[300px] text-[13px] text-[var(--color-text-muted)]">
              {activeTab === "live" ? "Go live to see active sessions here" : 
               activeTab === "scheduled" ? "Schedule a session to see it here" : 
               "Ended sessions will appear here"}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--color-accent-hover)]"
            >
              <Plus className="h-4 w-4" />
              Create Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onGetStreamKey={getStreamKey}
                onCopy={copyToClipboard}
                onDelete={handleDelete}
                onEdit={() => setSelectedSession(session)}
                showStreamKey={showStreamKey}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Session Dialog */}
      {showCreate && (
        <CreateSessionDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          communitySlug={communitySlug}
          onSuccess={fetchDashboard}
        />
      )}

      {/* Stream Key Modal */}
      {showStreamKey && (
        <StreamKeyModal
          streamKey={showStreamKey}
          onClose={() => setShowStreamKey(null)}
          onCopy={copyToClipboard}
        />
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">{label}</p>
          <p className="text-[18px] font-black text-[var(--color-text-primary)]" style={{ color }}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function SessionRow({ 
  session, 
  onGetStreamKey, 
  onCopy, 
  onDelete, 
  onEdit,
  showStreamKey 
}: { 
  session: LiveSession; 
  onGetStreamKey: (id: string) => void;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  showStreamKey: string | null;
}) {
  const isLive = session.status === "live";
  const startedAt = session.started_at ? new Date(session.started_at) : null;
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;

  return (
    <div className={cn(
      "group relative rounded-2xl border bg-[var(--color-surface)] p-4 transition-all duration-300 hover:border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)]",
      isLive ? "border-red-500/20 bg-gradient-to-br from-red-500/5 via-transparent to-transparent" : "border-[var(--color-border)]/30"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Status */}
          <div className="flex-shrink-0">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[10px] font-mono font-medium text-red-400 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            ) : session.status === "scheduled" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-mono font-medium text-amber-400">
                <Clock className="h-3 w-3" />
                SCHEDULED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-700/30 px-2.5 py-1 text-[9px] font-bold text-zinc-400">
                {session.status.toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[14px] font-bold text-[var(--color-text-primary)]">{session.title}</h3>
              {session.space && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[9px] font-medium text-[var(--color-text-muted)]">
                  <Shield className="h-2.5 w-2.5" />
                  {session.space.access_type === "free" ? "Free" : session.space.access_type}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {session.space?.name || "Unknown Space"} • 
              {isLive ? `${formatElapsed(elapsed)} • ${session.viewer_count} watching` : 
               session.scheduled_at ? `Starts ${new Date(session.scheduled_at).toLocaleString()}` : 
               session.ended_at ? `Ended ${new Date(session.ended_at).toLocaleString()}` : "Not started"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {session.stream_key && (
            <button
              onClick={() => onGetStreamKey(session.id)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
              title="View stream key"
            >
              <Key className="h-4 w-4" />
            </button>
          )}
          {isLive && (
            <button
              onClick={onEdit}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/25"
              title="Manage live session"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
            title="View details"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(session.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
            title="Delete session"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Live indicator bar */}
      {isLive && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-red-400" 
            style={{ width: `${Math.min(100, (session.viewer_count / (session.max_viewers || 100)) * 100)}%` }} 
          />
        </div>
      )}
    </div>
  );
}

function StreamKeyModal({ streamKey, onClose, onCopy }: { streamKey: string; onClose: () => void; onCopy: (text: string) => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black text-[var(--color-text-primary)]">Stream Key</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-[var(--color-surface-secondary)] p-3 font-mono text-[12px] text-[var(--color-text-primary)] break-all">
            {streamKey}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onCopy(streamKey)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--color-accent-hover)]">
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <button onClick={onClose} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2 text-[12px] font-bold text-[var(--color-text-primary)] transition hover:bg-[var(--color-border)]">
              Done
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)]">RTMP URL: <code className="font-mono">rtmp://your-media-server/live</code></p>
        </div>
      </div>
    </div>
  );
}

function SessionDetailModal({ session, onClose }: { session: LiveSession; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <h3 className="text-[16px] font-black text-[var(--color-text-primary)]">Session Details</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <DetailRow label="Title" value={session.title} />
          <DetailRow label="Status" value={<StatusBadge status={session.status} />} />
          <DetailRow label="Privacy" value={session.privacy} />
          <DetailRow label="Space" value={session.space?.name || "Unknown"} />
          <DetailRow label="Viewers" value={`${session.viewer_count} / ${session.max_viewers} (Peak: ${session.peak_viewers})`} />
          <DetailRow label="Created" value={new Date(session.created_at).toLocaleString()} />
          <DetailRow label="Started" value={session.started_at ? new Date(session.started_at).toLocaleString() : "—"} />
          <DetailRow label="Ended" value={session.ended_at ? new Date(session.ended_at).toLocaleString() : "—"} />
          {session.stream_key && (
            <DetailRow label="Stream Key" value={<code className="font-mono text-[11px]">{session.stream_key}</code>} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="shrink-0 w-28 text-[12px] font-semibold text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[13px] text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    live: "bg-red-500/20 text-red-400",
    scheduled: "bg-amber-500/20 text-amber-400",
    ended: "bg-zinc-700/30 text-zinc-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${colors[status as keyof typeof colors] || colors.ended}`}>
      {status.toUpperCase()}
    </span>
  );
}

// Create Session Dialog - simplified version
function CreateSessionDialog({ open, onClose, communitySlug, onSuccess }: { open: boolean; onClose: () => void; communitySlug?: string; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [spaces, setSpaces] = useState<{id: string; name: string; access_type: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchSpaces();
    }
  }, [open, communitySlug]);

  const fetchSpaces = async () => {
    if (!communitySlug) return;
    try {
      const res = await fetch(`/api/c/${communitySlug}/spaces`);
      if (res.ok) {
        const { data } = await res.json();
        setSpaces(data || []);
        if (data?.length > 0) setSpaceId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch spaces:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !spaceId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/c/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, title: title.trim(), privacy, maxViewers: 100 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      onClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
              <Radio className="h-4 w-4 text-[var(--color-accent)]" />
            </span>
            <h3 className="text-[14px] font-black text-[var(--color-text-primary)]">Go Live</h3>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Session Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. React Hooks Deep Dive"
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-[var(--color-accent)]/30 focus:bg-[var(--color-border)] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Space</label>
            {loading ? (
              <div className="mt-1.5 flex items-center gap-2 text-[var(--color-text-muted)]">
                <Radio className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                <span className="text-[13px]">Loading spaces...</span>
              </div>
            ) : (
              <select
                value={spaceId}
                onChange={e => setSpaceId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] transition focus:border-[var(--color-accent)]/30 focus:bg-[var(--color-border)] focus:outline-none"
                disabled={spaces.length === 0}
              >
                {spaces.map(sp => (
                  <option key={sp.id} value={sp.id} className="bg-[var(--color-surface)]">
                    {sp.name} {sp.access_type !== "free" && `(${sp.access_type})`}
                  </option>
                ))}
                {spaces.length === 0 && <option value="" disabled>No accessible spaces</option>}
              </select>
            )}
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Privacy</label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setPrivacy("public")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                  privacy === "public"
                    ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                )}
              >
                <Users className="h-4 w-4" />
                Public
              </button>
              <button
                type="button"
                onClick={() => setPrivacy("private")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition",
                  privacy === "private"
                    ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                )}
              >
                <Lock className="h-4 w-4" />
                Private
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[11px] text-red-400">{error}</div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} disabled={creating} className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border)]">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={creating || !title.trim() || !spaceId} className="flex-1 rounded-xl bg-[var(--color-accent)] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40">
              {creating ? "Starting..." : "Go Live"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
