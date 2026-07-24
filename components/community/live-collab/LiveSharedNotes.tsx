"use client";

import { useEffect, useRef, useState } from "react";
import { History, NotebookPen, Radio } from "lucide-react";
import { useLiveCollabStore } from "@/lib/community/live-collab";
import { createClient } from "@/lib/supabase/client";

/**
 * Shared session notes — local store + Supabase broadcast for live co-editing.
 * Additive realtime layer; does not replace the collab store.
 */
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
  const [peersEditing, setPeersEditing] = useState(0);
  const applyingRemoteRef = useRef(false);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  useEffect(() => {
    if (applyingRemoteRef.current) return;
    setBody(notes?.body ?? "");
  }, [notes?.body, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();
    const channel = supabase.channel(`collab-notes:${sessionId}`);
    channel
      .on(
        "broadcast",
        { event: "notes" },
        ({
          payload,
        }: {
          payload: { body: string; user_id?: string; user_name?: string };
        }) => {
          if (!payload || payload.user_id === userId) return;
          applyingRemoteRef.current = true;
          setBody(payload.body);
          updateNotes({
            sessionId,
            body: payload.body,
            authorId: payload.user_id ?? null,
            authorName: payload.user_name ?? null,
          });
          queueMicrotask(() => {
            applyingRemoteRef.current = false;
          });
        }
      )
      .on(
        "broadcast",
        { event: "editing" },
        ({ payload }: { payload: { user_id?: string; editing?: boolean } }) => {
          if (!payload || payload.user_id === userId) return;
          setPeersEditing((n) => Math.max(0, n + (payload.editing ? 1 : -1)));
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId, updateNotes, userId]);

  function persist(next: string) {
    if (!canEdit) return;
    if (next === (notes?.body ?? "")) return;
    updateNotes({
      sessionId,
      body: next,
      authorId: userId ?? null,
      authorName: userName ?? null,
    });
    void channelRef.current?.send({
      type: "broadcast",
      event: "notes",
      payload: {
        body: next,
        user_id: userId,
        user_name: userName,
      },
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          <NotebookPen className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          Shared notes
          {peersEditing > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600">
              <Radio className="h-2.5 w-2.5" aria-hidden />
              Live
            </span>
          )}
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
        onChange={(e) => {
          setBody(e.target.value);
          void channelRef.current?.send({
            type: "broadcast",
            event: "editing",
            payload: { user_id: userId, editing: true },
          });
        }}
        onBlur={() => {
          void channelRef.current?.send({
            type: "broadcast",
            event: "editing",
            payload: { user_id: userId, editing: false },
          });
          persist(body);
        }}
        placeholder="Collaborative notes for this session…"
        className="min-h-[160px] flex-1 resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
      {showHistory && (
        <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-lg bg-neutral-50 p-2 dark:bg-neutral-900/60">
          {(notes?.versions ?? [])
            .slice()
            .reverse()
            .map((v) => (
              <li key={v.id} className="text-[11px] text-neutral-500">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
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
