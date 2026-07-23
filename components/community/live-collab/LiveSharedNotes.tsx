"use client";

import { useEffect, useState } from "react";
import { History, NotebookPen } from "lucide-react";
import { useLiveCollabStore } from "@/lib/community/live-collab";

export function LiveSharedNotes({
  sessionId,
  userId,
  userName,
  canEdit = true,
}: {
  sessionId: string;
  userId?: string | null;
  userName?: string | null;
  canEdit?: boolean;
}) {
  const notes = useLiveCollabStore((s) => s.notesBySession[sessionId]);
  const updateNotes = useLiveCollabStore((s) => s.updateNotes);
  const [body, setBody] = useState(notes?.body ?? "");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setBody(notes?.body ?? "");
  }, [notes?.body, sessionId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          <NotebookPen className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          Shared notes
        </p>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800"
        >
          <History className="h-3.5 w-3.5" />
          History ({notes?.versions.length ?? 0})
        </button>
      </div>
      <textarea
        value={body}
        disabled={!canEdit}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => {
          if (!canEdit) return;
          if (body === (notes?.body ?? "")) return;
          updateNotes({
            sessionId,
            body,
            authorId: userId ?? null,
            authorName: userName ?? null,
          });
        }}
        placeholder="Collaborative notes for this session…"
        className="min-h-[160px] flex-1 resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20 disabled:opacity-60"
      />
      {showHistory && (
        <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-lg bg-neutral-50 p-2">
          {(notes?.versions ?? [])
            .slice()
            .reverse()
            .map((v) => (
              <li key={v.id} className="text-[11px] text-neutral-500">
                <span className="font-semibold text-neutral-700">
                  {v.authorName || "Member"}
                </span>{" "}
                · {new Date(v.createdAt).toLocaleTimeString()} —{" "}
                {v.body.slice(0, 60)}
                {v.body.length > 60 ? "…" : ""}
              </li>
            ))}
          {(notes?.versions.length ?? 0) === 0 && (
            <li className="text-[11px] text-neutral-400">No versions yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
