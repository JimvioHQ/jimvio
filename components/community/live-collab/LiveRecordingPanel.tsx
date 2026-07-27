"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Film, ListTree, Loader2, ScrollText } from "lucide-react";
import { EMPTY_LIVE_LIST, useLiveCollabStore } from "@/lib/community/live-collab";
import { toast } from "sonner";

type ApiRecording = {
  id: string;
  status?: string | null;
  cloudinary_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  error?: string | null;
  created_at?: string | null;
};

export function LiveRecordingPanel({
  sessionId,
  canManage,
}: {
  sessionId: string;
  canManage?: boolean;
}) {
  const recordings = useLiveCollabStore(
    (s) => s.recordingsBySession[sessionId] ?? EMPTY_LIVE_LIST
  );
  const upsertRecording = useLiveCollabStore((s) => s.upsertRecording);
  const addBookmark = useLiveCollabStore((s) => s.addBookmark);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("none");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}/recording`);
        const json = (await res.json()) as {
          recordings?: ApiRecording[];
          recordingStatus?: string;
          replayUrl?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Failed to load recordings");
        if (cancelled) return;
        setStatus(json.recordingStatus ?? "none");
        const rows = json.recordings ?? (EMPTY_LIVE_LIST as ApiRecording[]);
        if (rows.length === 0 && json.replayUrl) {
          upsertRecording({
            id: `replay-${sessionId}`,
            sessionId,
            title: "Session replay",
            durationSec: null,
            url: json.replayUrl,
            ready: true,
            transcriptPlaceholder: "Transcript attaches when available.",
            bookmarks: [],
            chapters: [],
            createdAt: new Date().toISOString(),
          });
        } else {
          rows.forEach((r, i) => {
            upsertRecording({
              id: r.id,
              sessionId,
              title: i === 0 ? "Session replay" : `Recording ${i + 1}`,
              durationSec: r.duration_seconds ?? null,
              url: r.cloudinary_url ?? json.replayUrl ?? null,
              ready: r.status === "ready" && Boolean(r.cloudinary_url ?? json.replayUrl),
              transcriptPlaceholder: r.error
                ? `Recording error: ${r.error}`
                : r.status === "ready"
                  ? "Transcript attaches when available."
                  : `Status: ${r.status ?? "processing"}`,
              bookmarks: [],
              chapters: [],
              createdAt: r.created_at ?? new Date().toISOString(),
            });
          });
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, upsertRecording]);

  const rec = recordings[0] ?? null;

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
        <Film className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        Recordings
      </p>
      {loading && (
        <p className="flex items-center gap-2 text-[12px] text-neutral-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading recordings…
        </p>
      )}
      {loadError && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">{loadError}</p>
      )}
      {!loading && !rec && !loadError && (
        <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-[12px] text-neutral-500">
          No recordings yet. Use Record in the dock while live — status: {status}.
        </p>
      )}
      {rec && (
        <>
          <div className="rounded-xl bg-neutral-50 px-3 py-3">
            <p className="text-sm font-semibold text-neutral-900">{rec.title}</p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {rec.ready ? "Ready" : status === "recording" ? "Recording" : "Processing"} ·{" "}
              {rec.durationSec != null ? `${rec.durationSec}s` : "duration TBD"}
            </p>
            {rec.url ? (
              <Link
                href={rec.url}
                className="mt-2 inline-block text-[12px] font-semibold text-[var(--color-accent)]"
              >
                Open replay
              </Link>
            ) : (
              <p className="mt-2 text-[12px] text-neutral-400">
                Replay URL attaches when LiveKit egress webhook marks ready.
              </p>
            )}
          </div>
          {rec.chapters.length > 0 && (
            <section>
              <h4 className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase text-neutral-400">
                <ListTree className="h-3 w-3" /> Chapters
              </h4>
              <ul className="space-y-1">
                {rec.chapters.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between rounded-lg bg-white px-2.5 py-1.5 text-[12px] ring-1 ring-black/[0.04]"
                  >
                    <span className="font-medium">{c.title}</span>
                    <span className="text-neutral-400">{c.atSec}s</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h4 className="flex items-center gap-1 text-[11px] font-bold uppercase text-neutral-400">
                <Bookmark className="h-3 w-3" /> Bookmarks
              </h4>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    const label = window.prompt("Bookmark label") || "Moment";
                    addBookmark(sessionId, rec.id, label, 0);
                    toast.success("Bookmark added");
                  }}
                  className="text-[11px] font-semibold text-neutral-600"
                >
                  + Add
                </button>
              )}
            </div>
            <ul className="space-y-1">
              {rec.bookmarks.map((b) => (
                <li key={b.id} className="text-[12px] text-neutral-600">
                  {b.label} · {b.atSec}s
                </li>
              ))}
              {rec.bookmarks.length === 0 && (
                <li className="text-[12px] text-neutral-400">No bookmarks yet</li>
              )}
            </ul>
          </section>
          <section className="rounded-xl bg-neutral-50 px-3 py-2.5">
            <h4 className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase text-neutral-400">
              <ScrollText className="h-3 w-3" /> Transcript
            </h4>
            <p className="text-[12px] leading-relaxed text-neutral-500">
              {rec.transcriptPlaceholder}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
