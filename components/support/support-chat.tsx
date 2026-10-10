"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribePostgresChanges, unsubscribeRealtime } from "@/lib/supabase/realtime-subscribe";
import { assistantRevealChunks, revealDelayMs } from "@/lib/support/reveal";
import {
  SUPPORT_CHAT_SUGGESTIONS,
  SUPPORT_COMPOSER_PLACEHOLDER,
  SUPPORT_WELCOME_GREETING,
  SUPPORT_WELCOME_PROMPT,
} from "@/lib/support/welcome";

type ArticleLink = { slug: string; title: string; href: string };
type ChatMessage = {
  id: string;
  authorRole: "customer" | "ai" | "staff" | "system";
  authorName?: string | null;
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

function labelFor(message: Pick<ChatMessage, "authorRole" | "authorName">) {
  if (message.authorRole === "ai") return "Jimvio AI";
  if (message.authorRole === "staff") return message.authorName || "Jimvio Support";
  if (message.authorRole === "system") return "Jimvio Support";
  return "You";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function RevealedText({ chunks, onGrow }: { chunks: string[]; onGrow?: () => void }) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (chunks.length <= 1) return;
    const delay = revealDelayMs(chunks.length, false);
    const timer = window.setInterval(() => {
      setCount((current) => (current >= chunks.length ? current : current + 1));
    }, delay);
    return () => window.clearInterval(timer);
  }, [chunks]);

  useEffect(() => {
    onGrow?.();
  }, [count, onGrow]);

  return <p className="mt-1 whitespace-pre-wrap leading-6">{chunks.slice(0, count).join("")}</p>;
}

function AssistantBody({ text, animate, onGrow }: { text: string; animate: boolean; onGrow?: () => void }) {
  const reduced = prefersReducedMotion() || !animate;
  const chunks = useMemo(() => assistantRevealChunks(text, reduced), [text, reduced]);
  if (reduced || chunks.length <= 1) {
    return <p className="mt-1 whitespace-pre-wrap leading-6">{text}</p>;
  }
  return <RevealedText key={text} chunks={chunks} onGrow={onGrow} />;
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-xs text-[#6B7280]" role="status">
      <span className="inline-flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] motion-safe:animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] motion-safe:animate-pulse [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] motion-safe:animate-pulse [animation-delay:300ms]" />
      </span>
      {label}
    </p>
  );
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
  const stickRef = useRef(true);
  const knownIds = useRef(new Set<string>());
  const clientMessageId = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "sending" | "failed">("loading");
  const [error, setError] = useState("");
  const [failedDraft, setFailedDraft] = useState("");
  const [pendingBody, setPendingBody] = useState("");
  const [canSave, setCanSave] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [staffTyping, setStaffTyping] = useState(false);
  const [handoffFailed, setHandoffFailed] = useState(false);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const liveRef = useRef(false);

  function acceptMessages(next: ChatMessage[], revealAssistant: boolean) {
    if (revealAssistant) {
      const fresh = next.find((message) => message.authorRole === "ai" && !knownIds.current.has(message.id));
      if (fresh) setRevealingId(fresh.id);
    }
    for (const message of next) knownIds.current.add(message.id);
    setMessages(next);
  }

  async function load(id: string) {
    const response = await fetch(`/api/support/conversations/${id}`);
    const data = await response.json().catch(() => null);
    if (response.status === 401) {
      setCanSave(false);
      setSessionChecked(true);
      setPhase((current) => (current === "loading" ? "idle" : current));
      return;
    }
    if (!response.ok) {
      setError(data?.error || "Could not load this conversation.");
      setPhase((current) => (current === "loading" ? "idle" : current));
      return;
    }
    setCanSave(true);
    setSessionChecked(true);
    setConversation(data.conversation);
    acceptMessages(data.messages ?? [], false);
    onConversationId(data.conversation.id);
    setPhase((current) => (current === "loading" ? "idle" : current));
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!conversationId) {
        const listed = await fetch("/api/support/conversations");
        if (listed.status === 401) {
          if (!cancelled) {
            setCanSave(false);
            setSessionChecked(true);
            setPhase((current) => (current === "loading" ? "idle" : current));
          }
          return;
        }
        if (!cancelled) {
          setCanSave(true);
          setSessionChecked(true);
        }
        const data = await listed.json().catch(() => null);
        const latest = (data?.conversations ?? []).find((item: { status: string }) => item.status !== "resolved") ?? data?.conversations?.[0];
        if (latest?.id && !cancelled) await load(latest.id);
        if (!cancelled) setPhase((current) => (current === "loading" ? "idle" : current));
        return;
      }
      await load(conversationId);
      if (!cancelled) setPhase((current) => (current === "loading" ? "idle" : current));
    })();
    return () => {
      cancelled = true;
    };
    // Restore the saved thread once when the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !stickRef.current) return;
    list.scrollTo({ top: list.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [messages, staffTyping, pendingBody, revealingId, phase]);

  useEffect(() => {
    if (!conversation?.id) return;
    let cancelled = false;
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
        },
      },
    );
    const poll = window.setInterval(() => {
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

  function onHistoryScroll() {
    const list = listRef.current;
    if (!list) return;
    stickRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }

  function showLocalAnswer(body: string, answer: string, articles: ArticleLink[], mode: ChatMessage["answerMode"]) {
    const now = new Date().toISOString();
    const customer: ChatMessage = {
      id: crypto.randomUUID(),
      authorRole: "customer",
      authorName: null,
      body,
      createdAt: now,
      answerMode: null,
      articles: [],
    };
    const assistant: ChatMessage = {
      id: crypto.randomUUID(),
      authorRole: "ai",
      authorName: null,
      body: answer,
      createdAt: now,
      answerMode: mode,
      articles,
    };
    setMessages((current) => {
      const next = [...current, customer, assistant];
      for (const message of next) knownIds.current.add(message.id);
      return next;
    });
    setRevealingId(assistant.id);
  }

  async function askPublic(body: string) {
    setCanSave(false);
    try {
      const response = await fetch("/api/support/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: body }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setPhase("failed");
        setPendingBody("");
        setFailedDraft(body);
        setError(data?.error || "I could not answer that just now.");
        return;
      }
      const articles = Array.isArray(data?.articles) ? (data.articles as ArticleLink[]) : [];
      const mode = data?.mode === "live" || data?.mode === "refused" || data?.mode === "knowledge" ? data.mode : "knowledge";
      showLocalAnswer(body, typeof data?.answer === "string" ? data.answer : "I could not find an answer for that.", articles, mode);
      setDraft("");
      setPendingBody("");
      setFailedDraft("");
      setHandoffFailed(false);
      setPhase("idle");
    } catch {
      setPhase("failed");
      setPendingBody("");
      setFailedDraft(body);
      setError("I could not answer that. Check your connection and retry.");
    }
  }

  async function send(text: string): Promise<string | null> {
    const body = text.trim();
    if (body.length < 1 || sendingRef.current) return null;
    sendingRef.current = true;
    const reusing = failedDraft === body && clientMessageId.current;
    if (!reusing) clientMessageId.current = crypto.randomUUID();
    setPhase("sending");
    setError("");
    setHandoffFailed(false);
    setPendingBody(body);
    setFailedDraft("");
    stickRef.current = true;
    try {
      if (sessionChecked && !canSave && !conversation?.id) {
        await askPublic(body);
        return null;
      }
      const response = await fetch(conversation?.id ? `/api/support/conversations/${conversation.id}` : "/api/support/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, clientMessageId: clientMessageId.current, conversationId: conversation?.id }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        setSessionChecked(true);
        await askPublic(body);
        return null;
      }
      if (!response.ok) {
        setPhase("failed");
        setPendingBody("");
        setFailedDraft(body);
        setError(data?.error || "The message was not saved.");
        return null;
      }
      setCanSave(true);
      setDraft("");
      setPendingBody("");
      setFailedDraft("");
      clientMessageId.current = null;
      setConversation(data.conversation);
      acceptMessages(data.messages ?? [], true);
      onConversationId(data.conversation.id);
      setPhase("idle");
      return String(data.conversation.id);
    } catch {
      setPhase("failed");
      setPendingBody("");
      setFailedDraft(body);
      setError("The message was not saved. Check your connection and retry.");
      return null;
    } finally {
      sendingRef.current = false;
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await send(draft);
  }

  function noteNeedsSignInForPerson() {
    const now = new Date().toISOString();
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        authorRole: "system",
        authorName: null,
        body: "Sign in to ask a person to join this conversation. I can keep answering from the help articles here. I will not mark an agent as online unless one actually joins.",
        createdAt: now,
        answerMode: null,
        articles: [],
      },
    ]);
  }

  async function handoff() {
    if (sendingRef.current) return;
    if (sessionChecked && !canSave && !conversation?.id) {
      noteNeedsSignInForPerson();
      return;
    }
    const id = conversation?.id ?? (await send("I would like to talk with a person."));
    if (!id) return;
    sendingRef.current = true;
    setPhase("sending");
    setError("");
    setHandoffFailed(false);
    try {
      const response = await fetch(`/api/support/conversations/${id}/handoff`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setPhase("failed");
        setHandoffFailed(true);
        setError(data?.error || "Could not reach the support queue. Try again.");
        return;
      }
      setConversation(data.conversation);
      acceptMessages(data.messages ?? [], false);
      setPhase("idle");
    } catch {
      setPhase("failed");
      setHandoffFailed(true);
      setError("Could not reach the support queue. Check your connection and try again.");
    } finally {
      sendingRef.current = false;
    }
  }

  function onType() {
    if (!conversation?.id) return;
    void fetch(`/api/support/conversations/${conversation.id}/typing`, { method: "POST" });
  }

  const showWelcome = messages.length === 0 && !pendingBody && phase !== "sending";

  const scrollIfStuck = useCallback(() => {
    const list = listRef.current;
    if (!list || !stickRef.current) return;
    list.scrollTop = list.scrollHeight;
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} onScroll={onHistoryScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {phase === "loading" ? <p className="text-sm text-[#6B7280]">Loading conversation…</p> : null}
        {showWelcome ? (
          <div className="rounded-2xl bg-[#F8FAFC] p-3 text-sm leading-6 text-[#374151]">
            <p className="font-semibold text-[#111827]">Jimvio Support</p>
            <p className="mt-1">{SUPPORT_WELCOME_GREETING}</p>
            <p className="mt-1">{SUPPORT_WELCOME_PROMPT}</p>
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
              <span>{labelFor(message)}</span>
              <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            </header>
            {message.authorRole === "ai" ? (
              <AssistantBody text={message.body} animate={message.id === revealingId} onGrow={scrollIfStuck} />
            ) : (
              <p className="mt-1 whitespace-pre-wrap leading-6">{message.body}</p>
            )}
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
        {pendingBody ? (
          <article className="ml-8 rounded-2xl bg-[#FF5A1F]/80 px-3 py-2 text-sm text-white">
            <header className="text-[11px] font-semibold uppercase tracking-wide opacity-80">You · Sending</header>
            <p className="mt-1 whitespace-pre-wrap leading-6">{pendingBody}</p>
          </article>
        ) : null}
        {staffTyping ? <TypingIndicator label="Support is typing" /> : null}
        {phase === "sending" && pendingBody ? (
          <TypingIndicator label={conversation?.mode === "human" ? "Saving your message" : "Jimvio AI is typing"} />
        ) : null}
        {phase === "sending" && !pendingBody ? <TypingIndicator label="Saving your request" /> : null}
      </div>
      {error ? (
        <p className="px-4 text-xs text-red-700" role="alert">
          {error}{" "}
          {failedDraft ? (
            <button type="button" className="font-semibold underline" onClick={() => void send(failedDraft)}>
              Retry
            </button>
          ) : null}
          {handoffFailed ? (
            <button type="button" className="font-semibold underline" onClick={() => void handoff()}>
              Retry
            </button>
          ) : null}
        </p>
      ) : null}
      {!canSave && messages.length > 0 ? (
        <p className="px-4 pb-2 text-xs text-[#374151]">
          <Link href="/login?next=/help" className="font-semibold text-[#FF5A1F]">
            Sign in
          </Link>{" "}
          to save this conversation on your account.
        </p>
      ) : null}
      {showWelcome ? (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUPPORT_CHAT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              className="rounded-full border border-neutral-200 px-2.5 py-1 text-left text-[11px] font-medium text-[#374151] hover:border-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
              onClick={() => void send(suggestion.question)}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={() => void handoff()}
          disabled={phase === "sending"}
          className="text-xs font-semibold text-[#FF5A1F] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
        >
          Talk to a human agent
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-neutral-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <label htmlFor={inputId} className="sr-only">
          Message support
        </label>
        <textarea
          id={inputId}
          value={draft}
          rows={1}
          onChange={(event) => {
            setDraft(event.target.value);
            onType();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(draft);
            }
          }}
          className="max-h-28 min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          placeholder={SUPPORT_COMPOSER_PLACEHOLDER}
          maxLength={4000}
        />
        <button
          type="submit"
          disabled={phase === "sending" || draft.trim().length < 1}
          className="rounded-full bg-[#FF5A1F] px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
