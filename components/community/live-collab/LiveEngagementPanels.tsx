"use client";

import { useMemo, useState } from "react";
import { HelpCircle, BarChart3 } from "lucide-react";
import { EMPTY_LIVE_LIST, useLiveCollabStore } from "@/lib/community/live-collab";
import { toast } from "sonner";

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
  const polls = useLiveCollabStore(
    (s) => s.pollsBySession[sessionId] ?? EMPTY_LIVE_LIST
  );
  const addPoll = useLiveCollabStore((s) => s.addPoll);
  const votePoll = useLiveCollabStore((s) => s.votePoll);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-neutral-400">
          <BarChart3 className="h-3.5 w-3.5" /> Polls
        </p>
        {canLaunch && (
          <button
            type="button"
            onClick={() => {
              const question =
                window.prompt("Poll question") || "Quick pulse check?";
              addPoll({
                id: `poll-${Date.now()}`,
                sessionId,
                question,
                options: [
                  { id: "a", label: "Yes", votes: 0 },
                  { id: "b", label: "Maybe", votes: 0 },
                  { id: "c", label: "No", votes: 0 },
                ],
                active: true,
                createdAt: new Date().toISOString(),
              });
              toast.success("Poll launched");
            }}
            className="rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Create poll
          </button>
        )}
      </div>
      {polls.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-neutral-400">
          No active polls.
        </p>
      ) : (
        polls.map((p) => (
          <div key={p.id} className="rounded-xl bg-neutral-50 px-3 py-3">
            <p className="text-[13px] font-medium text-neutral-900">
              {p.question}
            </p>
            <div className="mt-2 space-y-1.5">
              {p.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => votePoll(sessionId, p.id, o.id)}
                  className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-[12px] ring-1 ring-black/[0.04] hover:ring-neutral-300"
                >
                  <span>{o.label}</span>
                  <span className="font-semibold text-neutral-500">{o.votes}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
