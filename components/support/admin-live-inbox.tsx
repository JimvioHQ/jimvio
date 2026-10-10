"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribePostgresChanges, unsubscribeRealtime } from "@/lib/supabase/realtime-subscribe";

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
};

type Message = {
  id: string;
  author_role: string;
  visibility: string;
  body: string;
  created_at: string;
  answer_mode?: string | null;
};

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "queued", label: "Queued" },
  { id: "mine", label: "Assigned to me" },
  { id: "unassigned", label: "Unassigned" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  const [status, setStatus] = useState("queued");
  const [priority, setPriority] = useState("normal");
  const [error, setError] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [available, setAvailable] = useState(true);

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

  async function openConversation(id: string) {
    setError("");
    setEmailNote("");
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
  }

  useEffect(() => {
    const handle = window.setTimeout(() => void loadList(), 0);
    return () => window.clearTimeout(handle);
    // loadList closes over the latest filter and query.
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
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearInterval(refresh);
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
        if (!cancelled) void openConversation(selectedId);
      },
      () => cancelled,
    );
    const poll = window.setInterval(() => {
      if (!cancelled) void openConversation(selectedId);
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      unsubscribeRealtime(supabase, null, `support-inbox-${selectedId}`);
    };
  }, [selectedId]);

  async function send(visibility: "customer" | "internal") {
    if (!selectedId) return;
    const body = visibility === "internal" ? note : reply;
    setError("");
    const response = await fetch(`/api/admin/support/conversations/${selectedId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, visibility, clientMessageId: crypto.randomUUID() }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not save the message.");
      return;
    }
    if (visibility === "customer") setReply("");
    else setNote("");
    if (data.email?.reason === "not_configured") setEmailNote("Reply saved. Email is not configured.");
    else if (data.email?.reason === "failed") setEmailNote("Reply saved. The email notification failed.");
    else if (data.email?.sent) setEmailNote("Reply saved and the customer was emailed.");
    else setEmailNote("");
    await openConversation(selectedId);
    await loadList();
  }

  async function saveMeta(assign?: "me" | "none") {
    if (!selectedId) return;
    const response = await fetch(`/api/admin/support/conversations/${selectedId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, priority, assign }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not update the conversation.");
      return;
    }
    setConversation(data.conversation);
    await loadList();
  }

  function onReplyType(event: FormEvent<HTMLTextAreaElement>) {
    if (!selectedId) return;
    if (event.currentTarget.value.trim()) {
      void fetch(`/api/admin/support/conversations/${selectedId}/typing`, { method: "POST" });
    }
  }

  const hiddenByFilter = Boolean(selectedId && conversation && !rows.some((row) => row.id === selectedId));

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div>
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search name, email, or message"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            aria-label="Search conversations"
          />
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === item.id ? "bg-[#FF5A1F] text-white" : "bg-white text-[#374151] ring-1 ring-neutral-200"}`}
            >
              {item.label}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs font-medium text-[#374151]">
            <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
            I am available
          </label>
        </div>
        <ul className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto">
          {rows.length === 0 ? <li className="rounded-xl border bg-white p-3 text-sm text-[#6B7280]">No conversations in this view.</li> : null}
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => void openConversation(row.id)}
                className={`w-full rounded-xl border bg-white p-3 text-left text-sm ${selectedId === row.id ? "border-[#FF5A1F]" : ""}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{row.requester_name || row.requester_email || row.public_ref}</span>
                  {row.staff_unread > 0 ? <span className="rounded-full bg-[#FF5A1F] px-1.5 text-[10px] font-semibold text-white">{row.staff_unread}</span> : null}
                </span>
                <span className="mt-1 block truncate text-[#4B5563]">{row.last_preview || row.subject || "No messages yet"}</span>
                <span className="mt-1 block text-[11px] uppercase tracking-wide text-[#6B7280]">
                  {row.status} · {row.priority} · {when(row.updated_at)}
                  {row.assignee_id ? " · assigned" : " · unassigned"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border bg-white p-4 text-sm">
        {!conversation ? <p className="text-[#6B7280]">Select a conversation.</p> : null}
        {conversation ? (
          <>
            {hiddenByFilter ? (
              <p className="mb-3 rounded-lg bg-[#FFF7ED] px-3 py-2 text-xs text-[#9A3412]">
                This conversation no longer matches the current filter. It stays open here.
              </p>
            ) : null}
            <h2 className="text-lg font-semibold">{conversation.subject || conversation.public_ref}</h2>
            <p className="text-xs text-[#6B7280]">
              {conversation.requester_name || "Customer"} · {conversation.requester_email || "No email on the conversation"} · {conversation.public_ref}
            </p>
            <ul className="mt-4 max-h-[42vh] space-y-2 overflow-y-auto">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={`rounded-lg p-2 ${message.visibility === "internal" ? "border border-dashed border-amber-300 bg-amber-50" : "bg-neutral-50"}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    {message.author_role}
                    {message.visibility === "internal" ? " · internal note" : ""}
                    {message.answer_mode ? ` · ${message.answer_mode}` : ""} · {when(message.created_at)}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                </li>
              ))}
            </ul>
            <label className="mt-4 block text-xs font-semibold">
              Customer reply
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                onInput={onReplyType}
                rows={3}
                className="mt-1 w-full rounded-lg border px-2 py-1 text-sm font-normal"
              />
            </label>
            <button type="button" onClick={() => void send("customer")} className="mt-2 rounded-lg bg-[#FF5A1F] px-3 py-2 text-sm font-semibold text-white">
              Send reply
            </button>
            <label className="mt-4 block text-xs font-semibold">
              Internal note
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-dashed border-amber-300 px-2 py-1 text-sm font-normal" />
            </label>
            <button type="button" onClick={() => void send("internal")} className="mt-2 rounded-lg border px-3 py-2 text-sm font-semibold">
              Save note
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="text-xs">
                Status
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 block rounded-lg border px-2 py-1">
                  <option value="ai">AI</option>
                  <option value="queued">Queued</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
              <label className="text-xs">
                Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 block rounded-lg border px-2 py-1">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
              <button type="button" onClick={() => void saveMeta()} className="self-end rounded-lg border px-3 py-2 text-xs font-semibold">
                Save status
              </button>
              <button type="button" onClick={() => void saveMeta("me")} className="self-end rounded-lg border px-3 py-2 text-xs font-semibold">
                Assign to me
              </button>
              <button type="button" onClick={() => void saveMeta("none")} className="self-end rounded-lg border px-3 py-2 text-xs font-semibold">
                Unassign
              </button>
            </div>
            {emailNote ? <p className="mt-3 text-xs text-[#374151]">{emailNote}</p> : null}
          </>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
