"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribePostgresChanges, unsubscribeRealtime } from "@/lib/supabase/realtime-subscribe";
import { SUGGESTED_SEARCHES } from "@/lib/support/types";

type ArticleLink = { slug: string; title: string; href: string };
type ChatMessage = {
  id: string;
  authorRole: "customer" | "ai" | "staff" | "system";
  body: string;
  createdAt: string;
  answerMode: "knowledge" | "live" | "refused" | null;
  articles: ArticleLink[];
};

type Conversation = {
  id: string;
  publicRef: string;
  status: string;
  mode: string;
  customerUnread?: number;
};

const SUGGESTIONS = SUGGESTED_SEARCHES.slice(0, 4);

function labelFor(role: ChatMessage["authorRole"]) {
  if (role === "ai") return "Jimvio AI";
  if (role === "staff") return "Jimvio Support";
  if (role === "system") return "Jimvio Support";
  return "You";
}

function disclosure(message: ChatMessage) {
  if (message.authorRole !== "ai") return null;
  if (message.answerMode === "live") return "Generated from Jimvio help articles";
  if (message.answerMode === "refused") return "Not answered from private account data";
  return "From the Jimvio knowledge base";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function SupportChat({
  conversationId,
  onConversationId,
}: {
  conversationId: string | null;
  onConversationId: (id: string) => void;
}) {
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "sending" | "failed">("idle");
  const [error, setError] = useState("");
  const [failedDraft, setFailedDraft] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [staffTyping, setStaffTyping] = useState(false);
  const [realtime, setRealtime] = useState<"subscribed" | "polling">("polling");
  const liveRef = useRef(false);

  async function load(id: string) {
    const response = await fetch(`/api/support/conversations/${id}`);
    const data = await response.json();
    if (response.status === 401) {
      setAuthRequired(true);
      return;
    }
    if (!response.ok) {
      setError(data.error || "Could not load this conversation.");
      return;
    }
    setAuthRequired(false);
    setConversation(data.conversation);
    setMessages(data.messages ?? []);
    onConversationId(data.conversation.id);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const presence = await fetch("/api/support/presence").then((response) => response.json()).catch(() => null);
      if (!cancelled) setAvailable(Boolean(presence?.available));
      if (!conversationId) {
        const listed = await fetch("/api/support/conversations");
        if (listed.status === 401) {
          if (!cancelled) setAuthRequired(true);
          return;
        }
        const data = await listed.json();
        const latest = (data.conversations ?? []).find((item: { status: string }) => item.status !== "resolved") ?? data.conversations?.[0];
        if (latest?.id && !cancelled) await load(latest.id);
        return;
      }
      await load(conversationId);
    })();
    return () => {
      cancelled = true;
    };
    // Restore the saved thread once when the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, staffTyping]);

  useEffect(() => {
    if (!conversation?.id) return;
    let cancelled = false;
    let poll = 0;
    const supabase = createClient();
    void subscribePostgresChanges(
      supabase,
      `support-chat-${conversation.id}`,
      {
        event: "INSERT",
        schema: "public",
        table: "support_conversation_messages",
        filter: `conversation_id=eq.${conversation.id}`,
      },
      () => {
        if (!cancelled) void load(conversation.id);
      },
      () => cancelled,
      {
        onStatus: (status) => {
          if (cancelled) return;
          liveRef.current = status === "SUBSCRIBED";
          setRealtime(status === "SUBSCRIBED" ? "subscribed" : "polling");
        },
      },
    );
    poll = window.setInterval(() => {
      if (cancelled) return;
      if (!liveRef.current) void load(conversation.id);
      void fetch(`/api/support/conversations/${conversation.id}/typing`)
        .then((response) => response.json())
        .then((data) => {
          if (!cancelled) setStaffTyping(Boolean(data.staff));
        })
        .catch(() => undefined);
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      unsubscribeRealtime(supabase, null, `support-chat-${conversation.id}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

  async function send(text: string): Promise<string | null> {
    const body = text.trim();
    if (body.length < 1) return null;
    setPhase("sending");
    setError("");
    setFailedDraft("");
    const clientMessageId = crypto.randomUUID();
    try {
      const response = await fetch(conversation?.id ? `/api/support/conversations/${conversation.id}` : "/api/support/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, clientMessageId, conversationId: conversation?.id }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setAuthRequired(true);
        setPhase("failed");
        setFailedDraft(body);
        setError("Sign in to save this conversation.");
        return null;
      }
      if (!response.ok) {
        setPhase("failed");
        setFailedDraft(body);
        setError(data.error || "The message was not saved.");
        return null;
      }
      setDraft("");
      setConversation(data.conversation);
      setMessages(data.messages ?? []);
      onConversationId(data.conversation.id);
      setPhase("idle");
      return String(data.conversation.id);
    } catch {
      setPhase("failed");
      setFailedDraft(body);
      setError("The message was not saved. Check your connection and retry.");
      return null;
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await send(draft);
  }

  async function handoff() {
    const id = conversation?.id ?? (await send("I would like to talk with a person."));
    if (!id) return;
    setPhase("sending");
    const response = await fetch(`/api/support/conversations/${id}/handoff`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setPhase("failed");
      setError(data.error || "Could not reach the support queue.");
      return;
    }
    setConversation(data.conversation);
    setMessages(data.messages ?? []);
    setAvailable(data.agentsAvailable > 0);
    setPhase("idle");
  }

  function onType() {
    if (!conversation?.id) return;
    void fetch(`/api/support/conversations/${conversation.id}/typing`, { method: "POST" });
  }

  const queueLabel =
    conversation?.status === "queued"
      ? available
        ? "In the support queue. An available agent can reply here."
        : "In the support queue. No agent is marked available right now."
      : conversation?.status === "active"
        ? "A support agent has this conversation."
        : conversation?.status === "resolved"
          ? "This conversation is marked resolved."
          : available
            ? "A support agent is marked available."
            : "No support agent is marked available right now.";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="border-b border-neutral-100 px-4 py-2 text-xs text-[#4B5563]" role="status">
        {queueLabel}
        {realtime === "polling" ? " Updates refresh automatically." : ""}
      </p>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {phase === "loading" ? <p className="text-sm text-[#6B7280]">Loading conversation…</p> : null}
        {messages.length === 0 && phase !== "sending" ? (
          <div className="rounded-2xl bg-[#F8FAFC] p-3 text-sm leading-6 text-[#374151]">
            <p className="font-semibold text-[#111827]">Jimvio AI</p>
            <p className="mt-1">
              Ask about help articles. Answers are labeled when they come from the knowledge base or a model grounded in those articles. Account balances and payouts are not looked up here.
            </p>
          </div>
        ) : null}
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              message.authorRole === "customer"
                ? "ml-8 rounded-2xl bg-[#FF5A1F] px-3 py-2 text-sm text-white"
                : "mr-6 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-sm text-[#111827]"
            }
          >
            <header className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide opacity-80">
              <span>{labelFor(message.authorRole)}</span>
              <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            </header>
            {disclosure(message) ? <p className="mt-1 text-[11px] font-medium normal-case tracking-normal text-[#6B7280]">{disclosure(message)}</p> : null}
            <p className="mt-1 whitespace-pre-wrap leading-6">{message.body}</p>
            {message.articles.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {message.articles.map((article) => (
                  <li key={article.slug}>
                    <Link href={article.href} className="font-medium text-[#FF5A1F] underline-offset-2 hover:underline">
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        {staffTyping ? <p className="text-xs text-[#6B7280]">Support is typing</p> : null}
        {phase === "sending" ? <p className="text-xs text-[#6B7280]">Sending…</p> : null}
      </div>
      {error ? (
        <p className="px-4 text-xs text-red-700" role="alert">
          {error}{" "}
          {failedDraft ? (
            <button type="button" className="font-semibold underline" onClick={() => void send(failedDraft)}>
              Retry
            </button>
          ) : null}
        </p>
      ) : null}
      {authRequired ? (
        <p className="px-4 pb-2 text-xs text-[#374151]">
          <Link href="/login?next=/help" className="font-semibold text-[#FF5A1F]">
            Sign in
          </Link>{" "}
          to keep this chat, or{" "}
          <Link href="/help/tickets/new" className="font-semibold text-[#FF5A1F]">
            create a ticket
          </Link>
          .
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="rounded-full border border-neutral-200 px-2.5 py-1 text-left text-[11px] font-medium text-[#374151] hover:border-[#FF5A1F]"
            onClick={() => void send(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 pb-2">
        <button
          type="button"
          onClick={() => void handoff()}
          disabled={phase === "sending" || authRequired}
          className="text-xs font-semibold text-[#FF5A1F] disabled:opacity-50"
        >
          Talk to a human agent
        </button>
        <Link href="/help/tickets/new" className="text-xs font-medium text-[#4B5563] underline-offset-2 hover:underline">
          Leave a ticket
        </Link>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-neutral-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <label htmlFor={inputId} className="sr-only">
          Message support
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onType();
          }}
          className="min-w-0 flex-1 rounded-full border border-neutral-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          placeholder="Type your message…"
          maxLength={4000}
        />
        <button
          type="submit"
          disabled={phase === "sending" || draft.trim().length < 1}
          className="rounded-full bg-[#FF5A1F] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
