"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HelpCircle, BarChart3, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChangesMany,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import { EMPTY_LIVE_LIST, useLiveCollabStore } from "@/lib/community/live-collab";
import { toast } from "sonner";
import type { LivePollPublic } from "@/lib/live/poll-types";

const EMPTY_POLLS: LivePollPublic[] = Object.freeze([]) as unknown as LivePollPublic[];

export function LiveQaCollabPanel({ sessionId }: { sessionId: string }) {
  const items = useLiveCollabStore(
    (s) => s.qaBySession[sessionId] ?? EMPTY_LIVE_LIST
  );
  const addQa = useLiveCollabStore((s) => s.addQa);
  const upvoteQa = useLiveCollabStore((s) => s.upvoteQa);
  const answerQa = useLiveCollabStore((s) => s.answerQa);
  const [body, setBody] = useState("");

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.upvotes - a.upvotes),
    [items]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase text-neutral-400">
        <HelpCircle className="h-3.5 w-3.5" /> Q&A
      </p>
      <div className="mb-2 flex gap-1.5">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-neutral-900/15"
          onKeyDown={(e) => {
            if (e.key === "Enter" && body.trim()) {
              addQa({
                id: `qa-${Date.now()}`,
                sessionId,
                body: body.trim(),
                authorName: "You",
                upvotes: 0,
                answered: false,
                createdAt: new Date().toISOString(),
              });
              setBody("");
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!body.trim()) return;
            addQa({
              id: `qa-${Date.now()}`,
              sessionId,
              body: body.trim(),
              authorName: "You",
              upvotes: 0,
              answered: false,
              createdAt: new Date().toISOString(),
            });
            setBody("");
          }}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          Ask
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {sorted.map((q) => (
          <li
            key={q.id}
            className="rounded-xl bg-neutral-50 px-3 py-2 text-[12px]"
          >
            <p className="font-medium text-neutral-900">{q.body}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
              <button type="button" onClick={() => upvoteQa(sessionId, q.id)}>
                ▲ {q.upvotes}
              </button>
              <span>{q.authorName}</span>
              {q.answered ? (
                <span className="text-emerald-600">Answered</span>
              ) : (
                <button
                  type="button"
                  className="font-semibold text-neutral-700"
                  onClick={() => answerQa(sessionId, q.id)}
                >
                  Mark answered
                </button>
              )}
            </div>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="py-8 text-center text-[12px] text-neutral-400">
            Audience questions collect here.
          </li>
        )}
      </ul>
    </div>
  );
}

export function LivePollsCollabPanel({
  sessionId,
  canLaunch,
}: {
  sessionId: string;
  canLaunch?: boolean;
}) {
  const [polls, setPolls] = useState<LivePollPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("Yes\nNo");
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const pollIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch(`/api/c/live/sessions/${sessionId}?polls=1`);
    const json = (await res.json()) as { polls?: LivePollPublic[]; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Unable to load polls");
    setPolls(Array.isArray(json.polls) ? json.polls : EMPTY_POLLS);
    pollIdsRef.current = new Set(
      (Array.isArray(json.polls) ? json.polls : EMPTY_POLLS).map((p) => p.id)
    );
    setLoadError(null);
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void load()
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Unable to load polls");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChangesMany>> = null;
    void (async () => {
      channel = await subscribePostgresChangesMany(
        supabase,
        `live_polls:${sessionId}`,
        [
          {
            config: {
              event: "*",
              schema: "public",
              table: "live_polls",
              filter: `session_id=eq.${sessionId}`,
            },
            onChange: () => {
              void load().catch(() => undefined);
            },
          },
          {
            config: {
              event: "*",
              schema: "public",
              table: "live_poll_votes",
            },
            onChange: (payload) => {
              const pollId = (payload?.new as { poll_id?: string } | null)?.poll_id;
              if (pollId && pollIdsRef.current.has(pollId)) {
                void load().catch(() => undefined);
              }
            },
          },
        ],
        () => cancelled
      );
    })();
    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, `live_polls:${sessionId}`);
    };
  }, [sessionId, load]);

  async function createPoll() {
    const q = question.trim();
    const options = optionsText
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (!q || options.length < 2) {
      toast.error("Add a question and at least two options");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/c/live/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "poll", question: q, options }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to create poll");
      setQuestion("");
      setOptionsText("Yes\nNo");
      setComposing(false);
      toast.success("Poll launched");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to create poll");
    } finally {
      setSaving(false);
    }
  }

  async function vote(pollId: string, optionIndex: number) {
    if (votingId) return;
    setVotingId(pollId);
    try {
      const res = await fetch(`/api/c/live/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", pollId, optionIndex }),
      });
      const json = (await res.json()) as { poll?: LivePollPublic; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to vote");
      if (json.poll) {
        setPolls((prev) => prev.map((p) => (p.id === json.poll!.id ? json.poll! : p)));
      } else {
        await load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to vote");
    } finally {
      setVotingId(null);
    }
  }

  async function closePoll(pollId: string) {
    try {
      const res = await fetch(`/api/c/live/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close-poll", pollId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to close poll");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to close poll");
    }
  }

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-neutral-400">
          <BarChart3 className="h-3.5 w-3.5" /> Polls
        </p>
        {canLaunch && (
          <button
            type="button"
            onClick={() => setComposing((v) => !v)}
            className="rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            {composing ? "Cancel" : "Create poll"}
          </button>
        )}
      </div>
      {canLaunch && composing && (
        <div className="space-y-2 rounded-xl bg-neutral-50 px-3 py-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question"
            className="h-10 w-full rounded-lg border border-neutral-200 px-2.5 text-[12px] outline-none focus:ring-2 focus:ring-neutral-900/15"
          />
          <textarea
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={"One option per line"}
            rows={3}
            className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-[12px] outline-none focus:ring-2 focus:ring-neutral-900/15"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void createPoll()}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Launching…" : "Launch poll"}
          </button>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : loadError ? (
        <div className="py-8 text-center">
          <p className="text-[12px] text-neutral-500">{loadError}</p>
          <button
            type="button"
            className="mt-2 text-[11px] font-semibold text-neutral-800 underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : polls.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-neutral-400">
          No active polls.
        </p>
      ) : (
        polls.map((p) => {
          const total = p.options.reduce((n, o) => n + o.votes, 0);
          const closed = p.status !== "active";
          return (
            <div key={p.id} className="rounded-xl bg-neutral-50 px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium text-neutral-900">{p.question}</p>
                {canLaunch && !closed && (
                  <button
                    type="button"
                    className="shrink-0 text-[11px] font-semibold text-neutral-500"
                    onClick={() => void closePoll(p.id)}
                  >
                    Close
                  </button>
                )}
              </div>
              {closed && (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Closed
                </p>
              )}
              <div className="mt-2 space-y-1.5">
                {p.options.map((o, i) => {
                  const selected = p.my_option_index === i;
                  const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={closed || p.my_option_index != null || votingId === p.id}
                      onClick={() => void vote(p.id, i)}
                      className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-[12px] ring-1 ring-black/[0.04] hover:ring-neutral-300 disabled:cursor-default disabled:opacity-80"
                    >
                      <span className={selected ? "font-semibold" : undefined}>{o.label}</span>
                      <span className="font-semibold text-neutral-500">
                        {o.votes}
                        {total > 0 ? ` · ${pct}%` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
