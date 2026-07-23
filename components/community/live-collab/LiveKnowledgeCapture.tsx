"use client";

import { useState } from "react";
import { BookOpen, CheckSquare, Lightbulb, Link2, Sparkles } from "lucide-react";
import { useLiveCollabStore } from "@/lib/community/live-collab";
import { useCreatorOSStore } from "@/lib/community/os";
import { useCollaborationStore } from "@/lib/community/knowledge";
import { toast } from "sonner";

/**
 * Live → Knowledge capture. AI placeholders call /api/c/ai when available.
 */
export function LiveKnowledgeCapture({
  sessionId,
  communityId,
  roomId,
  userId,
  chatSample,
}: {
  sessionId: string;
  communityId?: string | null;
  roomId?: string | null;
  userId?: string | null;
  chatSample?: string;
}) {
  const capture = useLiveCollabStore((s) => s.knowledgeBySession[sessionId]);
  const updateKnowledge = useLiveCollabStore((s) => s.updateKnowledge);
  const addTask = useCreatorOSStore((s) => s.addTask);
  const addCard = useCollaborationStore((s) => s.addCard);
  const [busy, setBusy] = useState(false);

  async function runAiSummary() {
    setBusy(true);
    try {
      const prompt = [
        "Produce a short live session summary, 3 key decisions, and 3 action items.",
        chatSample ? `Recent chat:\n${chatSample}` : "No chat sample yet.",
      ].join("\n\n");
      const res = await fetch("/api/c/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          prompt,
          mode: "live_session_summary",
        }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "AI unavailable");
      const text = json.text ?? "";
      updateKnowledge(sessionId, {
        summary: text.slice(0, 1200) || "Summary placeholder — AI response empty.",
        keyDecisions: ["Decision captured from session (AI-ready)"],
        actionItems: ["Follow up with attendees", "Share recording", "Publish FAQ"],
        resources: roomId ? [`Channel room ${roomId}`] : [],
      });
      toast.success("Session knowledge updated");
    } catch {
      updateKnowledge(sessionId, {
        summary:
          capture?.summary ||
          "AI summary placeholder — backend ready when /api/c/ai is configured.",
        keyDecisions: capture?.keyDecisions?.length
          ? capture.keyDecisions
          : ["Key decision placeholder"],
        actionItems: capture?.actionItems?.length
          ? capture.actionItems
          : ["Create follow-up task", "Share resources"],
        resources: capture?.resources ?? [],
      });
      toast.message("Knowledge placeholders saved (AI pending)");
    } finally {
      setBusy(false);
    }
  }

  function promoteActionItems() {
    const items = capture?.actionItems ?? [];
    if (items.length === 0) {
      toast.message("No action items yet");
      return;
    }
    const now = new Date().toISOString();
    for (const title of items.slice(0, 5)) {
      addTask({
        id: `live-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        communityId: communityId ?? null,
        roomId: roomId ?? null,
        groupId: null,
        title,
        body: `From live session ${sessionId}`,
        status: "todo",
        priority: "medium",
        assigneeId: null,
        assigneeName: null,
        dueDate: null,
        sourceMessageId: null,
        createdBy: userId ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }
    toast.success("Action items → Creator OS tasks");
  }

  function saveKnowledgeCard() {
    if (!roomId) {
      toast.message("No linked chat room for knowledge card");
      return;
    }
    const id = `live-kc-${Date.now()}`;
    addCard({
      id,
      communityId: communityId ?? null,
      roomId,
      kind: "guide",
      title: capture?.summary?.slice(0, 80) || `Live session ${sessionId.slice(0, 8)}`,
      body: [
        capture?.summary,
        "",
        "Key decisions:",
        ...(capture?.keyDecisions ?? []).map((d) => `• ${d}`),
        "",
        "Action items:",
        ...(capture?.actionItems ?? []).map((a) => `• ${a}`),
      ]
        .filter(Boolean)
        .join("\n"),
      tags: ["live", "session"],
      sourceType: "manual",
      sourceMessageId: null,
      sourceThreadId: null,
      featured: false,
      createdBy: userId ?? null,
      createdByName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    updateKnowledge(sessionId, {
      knowledgeCardIds: [...(capture?.knowledgeCardIds ?? []), id],
    });
    toast.success("Knowledge card created");
  }

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
        <BookOpen className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        Live knowledge
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAiSummary()}
          className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" />
          {busy ? "Generating…" : "Session summary"}
        </button>
        <button
          type="button"
          onClick={promoteActionItems}
          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-700"
        >
          <CheckSquare className="h-3 w-3" />
          → Tasks
        </button>
        <button
          type="button"
          onClick={saveKnowledgeCard}
          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-700"
        >
          <Lightbulb className="h-3 w-3" />
          Knowledge card
        </button>
      </div>
      <Section title="Summary">
        <p className="text-[13px] leading-relaxed text-neutral-700">
          {capture?.summary || "Generate a summary after the session warms up."}
        </p>
      </Section>
      <Section title="Key decisions">
        <ul className="list-disc space-y-1 pl-4 text-[13px] text-neutral-700">
          {(capture?.keyDecisions ?? []).map((d) => (
            <li key={d}>{d}</li>
          ))}
          {(capture?.keyDecisions.length ?? 0) === 0 && (
            <li className="list-none text-neutral-400">None yet</li>
          )}
        </ul>
      </Section>
      <Section title="Action items">
        <ul className="list-disc space-y-1 pl-4 text-[13px] text-neutral-700">
          {(capture?.actionItems ?? []).map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Section>
      <Section title="Resources">
        <ul className="space-y-1 text-[13px] text-neutral-700">
          {(capture?.resources ?? []).map((r) => (
            <li key={r} className="flex items-center gap-1">
              <Link2 className="h-3 w-3 text-neutral-400" />
              {r}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-neutral-50 px-3 py-2.5">
      <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-400">
        {title}
      </h4>
      {children}
    </section>
  );
}
