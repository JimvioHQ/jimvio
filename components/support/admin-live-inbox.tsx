"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribePostgresChanges, unsubscribeRealtime } from "@/lib/supabase/realtime-subscribe";
import { supportRoleLabel } from "@/lib/support/agent-identity";

type Row = {
  id: string;
  public_ref: string;
  requester_name: string | null;
  requester_email: string | null;
  subject: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  last_preview: string | null;
  staff_unread: number;
  updated_at: string;
  created_at?: string;
  ticket_id?: string | null;
};

type Message = {
  id: string;
  author_role: string;
  author_display_name?: string | null;
  visibility: string;
  body: string;
  created_at: string;
  answer_mode?: string | null;
};

type Profile = {
  displayName: string;
  supportRole: string;
  active: boolean;
  eligible: boolean;
  configured: boolean;
};

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "queued", label: "Queued" },
  { id: "mine", label: "Assigned to me" },
  { id: "unassigned", label: "Unassigned" },
  { id: "resolved", label: "Resolved" },
];

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function customerName(row: Pick<Row, "requester_name" | "requester_email" | "public_ref">) {
  return row.requester_name || row.requester_email || row.public_ref;
}

export function AdminLiveInbox() {
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Row | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"customer" | "internal">("customer");
  const [status, setStatus] = useState("queued");
  const [priority, setPriority] = useState("normal");
  const [phase, setPhase] = useState<"idle" | "sending" | "saved" | "failed">("idle");
  const [error, setError] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [available, setAvailable] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("customer_support");
  const [profileNote, setProfileNote] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const drafts = useRef(new Map<string, { reply: string; note: string }>());
  const clientMessageId = useRef<string | null>(null);
  const sendingRef = useRef(false);

  async function loadList(nextFilter = filter, nextQ = q) {
    const params = new URLSearchParams({ filter: nextFilter });
    if (nextQ) params.set("q", nextQ);
    const response = await fetch(`/api/admin/support/conversations?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not load conversations.");
      return;
    }
    setRows(data.conversations ?? []);
  }

  async function openConversation(id: string, options?: { preserveDraft?: boolean }) {
    setError("");
    if (selectedId && selectedId !== id) {
      drafts.current.set(selectedId, { reply, note });
    }
    const response = await fetch(`/api/admin/support/conversations/${id}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not open the conversation.");
      return;
    }
    setSelectedId(id);
    setConversation(data.conversation);
    setMessages(data.messages ?? []);
    setStatus(data.conversation.status);
    setPriority(data.conversation.priority);
    if (!options?.preserveDraft) {
      const saved = drafts.current.get(id);
      const greeting = typeof data.suggestedGreeting === "string" ? data.suggestedGreeting : "";
      setReply(saved?.reply || greeting);
      setNote(saved?.note || "");
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(() => void loadList(), 0);
    void fetch("/api/admin/support/agent")
      .then((response) => response.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setProfileName(data.profile.displayName || "");
          setProfileRole(data.profile.supportRole || "customer_support");
        }
      })
      .catch(() => undefined);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, q]);

  useEffect(() => {
    let cancelled = false;
    const beat = () => {
      void fetch("/api/admin/support/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ available }),
      });
    };
    beat();
    const timer = window.setInterval(beat, 25_000);
    const refresh = window.setInterval(() => {
      if (!cancelled) void loadList();
    }, 8_000);
    const supabase = createClient();
    void subscribePostgresChanges(
      supabase,
      "support-inbox-list",
      { event: "*", schema: "public", table: "support_conversations" },
      () => {
        if (!cancelled) void loadList();
      },
      () => cancelled,
    );
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearInterval(refresh);
      unsubscribeRealtime(supabase, null, "support-inbox-list");
      void fetch("/api/admin/support/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ available: false }),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const supabase = createClient();
    void subscribePostgresChanges(
      supabase,
      `support-inbox-${selectedId}`,
      {
        event: "INSERT",
        schema: "public",
        table: "support_conversation_messages",
        filter: `conversation_id=eq.${selectedId}`,
      },
      () => {
        if (!cancelled) void openConversation(selectedId, { preserveDraft: true });
      },
      () => cancelled,
    );
    const poll = window.setInterval(() => {
      if (!cancelled) void openConversation(selectedId, { preserveDraft: true });
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      unsubscribeRealtime(supabase, null, `support-inbox-${selectedId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !stickRef.current) return;
    list.scrollTop = list.scrollHeight;
  }, [messages, selectedId]);

  function onHistoryScroll() {
    const list = listRef.current;
    if (!list) return;
    stickRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }

  async function send(visibility: "customer" | "internal") {
    if (!selectedId || sendingRef.current) return;
    const body = (visibility === "internal" ? note : reply).trim();
    if (!body) return;
    sendingRef.current = true;
    if (!clientMessageId.current) clientMessageId.current = crypto.randomUUID();
    setPhase("sending");
    setError("");
    stickRef.current = true;
    try {
      const response = await fetch(`/api/admin/support/conversations/${selectedId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, visibility, clientMessageId: clientMessageId.current }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPhase("failed");
        setError(data.error || "Could not save the message.");
        return;
      }
      clientMessageId.current = null;
      if (visibility === "customer") setReply("");
      else setNote("");
      drafts.current.set(selectedId, {
        reply: visibility === "customer" ? "" : reply,
        note: visibility === "internal" ? "" : note,
      });
      if (visibility === "internal") setEmailNote("Internal note saved. The customer cannot see it.");
      else if (data.email?.reason === "not_configured") setEmailNote("Reply saved. Email is not configured.");
      else if (data.email?.reason === "failed") setEmailNote("Reply saved. The email notification failed. You can retry the send.");
      else if (data.email?.sent) setEmailNote("Reply saved. The customer notification was accepted by the email provider.");
      else setEmailNote("Reply saved.");
      setPhase("saved");
      await openConversation(selectedId, { preserveDraft: true });
      await loadList();
    } finally {
      sendingRef.current = false;
    }
  }

  async function saveMeta(assign?: "me" | "none", nextStatus?: string) {
    if (!selectedId) return;
    const response = await fetch(`/api/admin/support/conversations/${selectedId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus ?? status, priority, assign }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not update the conversation.");
      return;
    }
    setConversation(data.conversation);
    setMessages(data.messages ?? messages);
    if (typeof data.suggestedGreeting === "string" && !reply.trim()) setReply(data.suggestedGreeting);
    await loadList();
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileNote("");
    const response = await fetch("/api/admin/support/agent", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: profileName,
        supportRole: profileRole,
        active: profile?.active !== false,
        eligible: profile?.eligible !== false,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setProfileNote(data.error || "Could not save your support name.");
      return;
    }
    setProfile(data.profile);
    setProfileNote("Support name saved.");
  }

  function onReplyKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && mode === "customer") {
      event.preventDefault();
      void send("customer");
    }
  }

  const hiddenByFilter = Boolean(selectedId && conversation && !rows.some((row) => row.id === selectedId));
  const draft = mode === "internal" ? note : reply;

  return (
    <div className="grid min-h-[70vh] gap-3 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
      <aside className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white`}>
        <div className="border-b border-neutral-100 p-3">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search name, email, subject, or message"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            aria-label="Search conversations"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] ${filter === item.id ? "bg-[#FF5A1F] text-white" : "bg-[#F8FAFC] text-[#374151]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {rows.length === 0 ? <li className="p-3 text-sm text-[#6B7280]">No conversations in this view.</li> : null}
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => {
                  stickRef.current = true;
                  void openConversation(row.id);
                }}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] ${selectedId === row.id ? "bg-[#FFF1EB]" : "hover:bg-[#F8FAFC]"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-[#111827]">{customerName(row)}</span>
                  {row.staff_unread > 0 ? <span className="rounded-full bg-[#FF5A1F] px-1.5 text-[10px] font-semibold text-white">{row.staff_unread}</span> : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[#4B5563]">{row.subject || row.public_ref}</span>
                <span className="mt-0.5 block truncate text-xs text-[#6B7280]">{row.last_preview || "No messages yet"}</span>
                <span className="mt-1 block text-[10px] uppercase tracking-wide text-[#6B7280]">
                  {row.status} · {row.priority} · {when(row.updated_at)} · {row.assignee_id ? "assigned" : "unassigned"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-[70vh] flex-col rounded-2xl border border-neutral-200 bg-white`}>
        {!conversation ? <p className="p-6 text-sm text-[#6B7280]">Select a conversation.</p> : null}
        {conversation ? (
          <>
            <header className="border-b border-neutral-100 px-4 py-3">
              <button type="button" className="mb-2 text-xs font-semibold text-[#FF5A1F] lg:hidden" onClick={() => setSelectedId(null)}>
                Back to conversations
              </button>
              <h2 className="text-base font-semibold text-[#111827]">{customerName(conversation)}</h2>
              <p className="text-xs text-[#6B7280]">
                {conversation.subject || "Support conversation"} · {conversation.public_ref} · {conversation.status}
                {conversation.assignee_id ? " · assigned" : " · unassigned"}
              </p>
              {hiddenByFilter ? <p className="mt-2 text-xs text-[#9A3412]">This conversation no longer matches the current filter. It stays open here.</p> : null}
            </header>
            <div ref={listRef} onScroll={onHistoryScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((message) => {
                const internal = message.visibility === "internal";
                const customer = message.author_role === "customer";
                return (
                  <article
                    key={message.id}
                    className={
                      internal
                        ? "rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm"
                        : customer
                          ? "ml-10 rounded-2xl bg-[#F3F4F6] px-3 py-2 text-sm text-[#111827]"
                          : "mr-10 rounded-2xl bg-[#FFF1EB] px-3 py-2 text-sm text-[#111827]"
                    }
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      {internal ? "Internal note" : customer ? "Customer" : message.author_display_name || message.author_role}
                      {" · "}
                      {when(message.created_at)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-6">{message.body}</p>
                  </article>
                );
              })}
            </div>
            <form
              className="border-t border-neutral-100 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send(mode);
              }}
            >
              <div className="mb-2 flex gap-2" role="tablist" aria-label="Reply mode">
                <button type="button" role="tab" aria-selected={mode === "customer"} className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "customer" ? "bg-[#FF5A1F] text-white" : "bg-[#F3F4F6] text-[#374151]"}`} onClick={() => setMode("customer")}>
                  Public reply
                </button>
                <button type="button" role="tab" aria-selected={mode === "internal"} className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "internal" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-900"}`} onClick={() => setMode("internal")}>
                  Internal note
                </button>
              </div>
              <label className="sr-only" htmlFor="support-composer">
                {mode === "internal" ? "Internal note" : "Reply to the customer"}
              </label>
              <textarea
                id="support-composer"
                value={draft}
                rows={3}
                onChange={(event) => {
                  if (mode === "internal") setNote(event.target.value);
                  else {
                    setReply(event.target.value);
                    if (selectedId && event.target.value.trim()) {
                      void fetch(`/api/admin/support/conversations/${selectedId}/typing`, { method: "POST" });
                    }
                  }
                }}
                onKeyDown={onReplyKey}
                placeholder={mode === "internal" ? "Only staff can see this note" : "Reply to the customer"}
                className={`w-full resize-none rounded-2xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] ${mode === "internal" ? "border-dashed border-amber-300 bg-amber-50" : "border-neutral-200"}`}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-[#6B7280]" role="status">
                  {phase === "sending" ? "Saving…" : phase === "saved" ? emailNote || "Saved." : mode === "internal" ? "Internal notes are never emailed." : "Enter sends. Shift+Enter adds a line."}
                </p>
                <button type="submit" disabled={phase === "sending" || draft.trim().length < 1} className="rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {mode === "internal" ? "Save note" : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : null}
        {error ? (
          <p className="px-4 pb-3 text-sm text-red-700" role="alert">
            {error}{" "}
            {phase === "failed" ? (
              <button type="button" className="font-semibold underline" onClick={() => void send(mode)}>
                Retry
              </button>
            ) : null}
          </p>
        ) : null}
      </section>

      <aside className={`${selectedId ? "flex" : "hidden lg:flex"} flex-col gap-3`}>
        <form onSubmit={saveProfile} className="rounded-2xl border border-neutral-200 bg-white p-3">
          <h3 className="text-sm font-semibold text-[#111827]">Your support name</h3>
          <p className="mt-1 text-xs text-[#6B7280]">{profile ? supportRoleLabel(profile.supportRole) : "Customer Support Agent"}</p>
          <label className="mt-2 block text-xs font-semibold text-[#374151]">
            Display name
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-2 py-1.5 text-sm font-normal" maxLength={80} />
          </label>
          <label className="mt-2 block text-xs font-semibold text-[#374151]">
            Role
            <select value={profileRole} onChange={(event) => setProfileRole(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-2 py-1.5 text-sm font-normal">
              <option value="customer_support">Customer Support Agent</option>
              <option value="senior_support">Senior Support Agent</option>
            </select>
          </label>
          <button type="submit" className="mt-2 rounded-full bg-[#FF5A1F] px-3 py-1.5 text-xs font-semibold text-white">Save name</button>
          {profileNote ? <p className="mt-2 text-xs text-[#374151]">{profileNote}</p> : null}
          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-[#374151]">
            <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
            I am available for new conversations
          </label>
        </form>
        {conversation ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-sm">
            <h3 className="font-semibold text-[#111827]">Conversation</h3>
            <p className="mt-2 text-xs text-[#6B7280]">{customerName(conversation)}</p>
            <p className="text-xs text-[#6B7280]">{conversation.requester_email || "No email on the conversation"}</p>
            <p className="mt-2 text-xs text-[#6B7280]">Reference {conversation.public_ref}</p>
            <p className="text-xs text-[#6B7280]">Opened {conversation.created_at ? when(conversation.created_at) : when(conversation.updated_at)}</p>
            <label className="mt-3 block text-xs font-semibold">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 block w-full rounded-xl border px-2 py-1.5 font-normal">
                <option value="queued">Queued</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <label className="mt-2 block text-xs font-semibold">
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 block w-full rounded-xl border px-2 py-1.5 font-normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            <div className="mt-3 flex flex-col gap-2">
              <button type="button" onClick={() => void saveMeta("me", "active")} className="rounded-full bg-[#111827] px-3 py-2 text-xs font-semibold text-white">
                Accept conversation
              </button>
              <button type="button" onClick={() => void saveMeta()} className="rounded-full border px-3 py-2 text-xs font-semibold">
                Save status
              </button>
              <button type="button" onClick={() => void saveMeta("none")} className="rounded-full border px-3 py-2 text-xs font-semibold">
                Unassign
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
