"use client";

import Link from "next/link";
import { Bookmark, Film, ListTree, ScrollText } from "lucide-react";
import { useLiveCollabStore } from "@/lib/community/live-collab";
import { toast } from "sonner";

export function LiveRecordingPanel({
  sessionId,
  canManage,
}: {
  sessionId: string;
  canManage?: boolean;
}) {
  const recordings = useLiveCollabStore(
    (s) => s.recordingsBySession[sessionId] ?? []
  );
  const upsertRecording = useLiveCollabStore((s) => s.upsertRecording);
  const addBookmark = useLiveCollabStore((s) => s.addBookmark);

  function ensurePlaceholder() {
    if (recordings.length > 0) return recordings[0];
    const meta = {
      id: `rec-${sessionId}`,
      sessionId,
      title: "Session replay",
      durationSec: null as number | null,
      url: null as string | null,
      ready: false,
      transcriptPlaceholder:
        "Transcript placeholder — available when recording egress completes.",
      bookmarks: [] as { id: string; label: string; atSec: number }[],
      chapters: [
        { id: "ch-1", title: "Intro", atSec: 0 },
        { id: "ch-2", title: "Main discussion", atSec: 120 },
        { id: "ch-3", title: "Q&A / wrap", atSec: 600 },
      ],
      createdAt: new Date().toISOString(),
    };
    upsertRecording(meta);
    return meta;
  }

  const rec = recordings[0] ?? null;

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
        <Film className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        Recordings
      </p>
      {!rec ? (
        <button
          type="button"
          onClick={() => ensurePlaceholder()}
          className="w-full rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-[12px] text-neutral-500 hover:border-neutral-400"
        >
          Initialize replay metadata (bookmarks, chapters, transcript placeholder)
        </button>
      ) : (
        <>
          <div className="rounded-xl bg-neutral-50 px-3 py-3">
            <p className="text-sm font-semibold text-neutral-900">{rec.title}</p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {rec.ready ? "Ready" : "Processing / placeholder"} ·{" "}
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
