"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Film,
  Loader2,
  Play,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING, MOTION_COLORS } from "@/components/community/hub/live/studio-ui";

type ApiRecording = {
  id: string;
  status?: string | null;
  cloudinary_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  byte_size?: number | null;
  failed?: boolean;
  ready?: boolean;
  file_type?: string | null;
  error?: string | null;
  created_at?: string | null;
  title?: string | null;
  session_id?: string | null;
  playUrl?: string | null;
  downloadUrl?: string | null;
};

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "—";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

function formatBytes(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function statusLabel(r: ApiRecording): { label: string; className: string } {
  if (r.ready || (r.status === "ready" && r.cloudinary_url)) {
    return { label: "Ready", className: "bg-emerald-50 text-emerald-700" };
  }
  if (r.failed || r.status === "failed") {
    return { label: "Failed", className: "bg-red-50 text-red-700" };
  }
  if (r.status === "active" || r.status === "starting" || r.status === "recording") {
    return { label: "Recording", className: "bg-orange-50 text-[#FF5A1F]" };
  }
  return { label: "Processing", className: "bg-amber-50 text-amber-700" };
}

export function LiveRecordingPanel({
  sessionId,
  canManage,
}: {
  sessionId: string;
  canManage?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApiRecording[]>([]);
  const [player, setPlayer] = useState<ApiRecording | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sessionRes, libraryRes] = await Promise.all([
        fetch(`/api/live/sessions/${sessionId}/recording`),
        fetch("/api/live/recordings"),
      ]);
      const sessionJson = (await sessionRes.json().catch(() => ({}))) as {
        recordings?: ApiRecording[];
        error?: string;
      };
      const libraryJson = (await libraryRes.json().catch(() => ({}))) as {
        recordings?: ApiRecording[];
      };

      if (!sessionRes.ok && !libraryRes.ok) {
        throw new Error(sessionJson.error ?? "Failed to load recordings");
      }

      const byId = new Map<string, ApiRecording>();
      for (const r of libraryJson.recordings ?? []) {
        byId.set(r.id, { ...r, title: r.title || "Live recording" });
      }
      for (const r of sessionJson.recordings ?? []) {
        const prev = byId.get(r.id);
        byId.set(r.id, {
          ...prev,
          ...r,
          session_id: r.session_id || sessionId,
          title: prev?.title || "This Live",
        });
      }
      const list = [...byId.values()].sort((a, b) =>
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
      );
      setRows(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await load();
    };
    const t0 = window.setTimeout(() => {
      void run();
    }, 0);
    const t = window.setInterval(() => {
      void run();
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearInterval(t);
    };
  }, [load]);

  const openPlay = async (r: ApiRecording) => {
    if (!(r.ready || r.status === "ready")) return;
    setBusyId(r.id);
    try {
      if (r.playUrl) {
        setPlayer({ ...r, playUrl: r.playUrl });
        return;
      }
      const res = await fetch("/api/live/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, action: "play" }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Playback unavailable");
      setPlayer({ ...r, playUrl: json.url });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Playback unavailable");
    } finally {
      setBusyId(null);
    }
  };

  const download = async (r: ApiRecording) => {
    setBusyId(r.id);
    try {
      let url = r.downloadUrl || r.playUrl;
      if (!url) {
        const res = await fetch("/api/live/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: r.id, action: "download" }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!res.ok || !json.url) throw new Error(json.error ?? "Download unavailable");
        url = json.url;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(r.title || "recording").replace(/\s+/g, "-")}.mp4`;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Download unavailable");
    } finally {
      setBusyId(null);
    }
  };

  const share = async (r: ApiRecording) => {
    const path = r.session_id
      ? `${window.location.origin}/communities/live/${r.session_id}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      setLoadError("Could not copy link");
    }
  };

  const remove = async (r: ApiRecording) => {
    if (!canManage) return;
    if (!window.confirm("Remove this recording from Saved Recordings?")) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/live/recordings?id=${encodeURIComponent(r.id)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      if (player?.id === r.id) setPlayer(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  if (player?.playUrl) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-neutral-900">
              {player.title || "Recording"}
            </p>
            <p className="text-[11px] text-neutral-500">
              {formatDuration(player.duration_seconds)} · MP4
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPlayer(null)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100",
              FOCUS_RING
            )}
            aria-label="Close player"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-black">
          <video
            key={player.playUrl}
            src={player.playUrl}
            controls
            playsInline
            autoPlay
            className="h-full w-full object-contain"
            poster={player.thumbnail_url || undefined}
          />
        </div>
        <div className="flex gap-2 border-t border-neutral-100 px-3 py-2.5">
          <button
            type="button"
            onClick={() => void download(player)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2.5 text-[12px] font-semibold text-white",
              FOCUS_RING,
              MOTION_COLORS
            )}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          <Film className="h-3.5 w-3.5 text-[#FF5A1F]" />
          Saved Recordings
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className={cn(
            "rounded-lg px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-100",
            FOCUS_RING
          )}
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-[12px] text-neutral-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading recordings…
        </p>
      )}
      {loadError && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700" role="alert">
          {loadError}
        </p>
      )}
      {!loading && rows.length === 0 && !loadError && (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 text-center">
          <Film className="mx-auto h-6 w-6 text-neutral-300" aria-hidden />
          <p className="mt-3 text-[13px] font-semibold text-neutral-800">
            No saved recordings yet
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
            Start recording during a Live and your recordings will appear here.
          </p>
        </div>
      )}

      <ul className="space-y-2.5">
        {rows.map((r) => {
          const st = statusLabel(r);
          const ready = Boolean(r.ready || (r.status === "ready" && r.cloudinary_url));
          const processing =
            !ready && !r.failed && r.status !== "failed";
          const size = formatBytes(r.byte_size);
          return (
            <li
              key={r.id}
              className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <div className="flex gap-3 p-3">
                <div className="relative flex h-[72px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-900">
                  {r.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Film className="h-6 w-6 text-white/40" aria-hidden />
                  )}
                  {ready ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play className="h-7 w-7 text-white" fill="white" />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-neutral-900">
                      {r.title || "Live recording"}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                        st.className
                      )}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {formatDate(r.created_at)} · {formatDuration(r.duration_seconds)}
                    {r.file_type || ready ? " · MP4" : ""}
                    {size ? ` · ${size}` : ""}
                  </p>
                  {processing ? (
                    <p className="mt-1.5 text-[11px] font-medium text-amber-700">
                      Processing recording…
                    </p>
                  ) : null}
                  {r.failed || r.status === "failed" ? (
                    <p className="mt-1.5 text-[11px] font-medium text-red-600">
                      Recording couldn&apos;t be saved
                      {r.error ? ` — ${r.error.slice(0, 80)}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-1 border-t border-neutral-100 px-2 py-1.5">
                <button
                  type="button"
                  disabled={!ready || busyId === r.id}
                  onClick={() => void openPlay(r)}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold disabled:opacity-40",
                    ready
                      ? "bg-[#FF5A1F] text-white hover:bg-[#e54e1a]"
                      : "text-neutral-400",
                    FOCUS_RING,
                    MOTION_COLORS
                  )}
                >
                  {busyId === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Play
                </button>
                <button
                  type="button"
                  disabled={!ready || busyId === r.id}
                  onClick={() => void download(r)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40",
                    FOCUS_RING
                  )}
                  aria-label="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void share(r)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50",
                    FOCUS_RING
                  )}
                  aria-label="Share"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                {canManage ? (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void remove(r)}
                    className={cn(
                      "inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40",
                      FOCUS_RING
                    )}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
