"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUS_EXPLANATIONS, type TicketStatus } from "@/lib/support/types";
import { statusLabel } from "@/lib/support/format";

type Message = { id: string; authorRole: string; body: string; createdAt: string };
type Ticket = {
  public_ref: string;
  subject: string;
  category: string;
  status: TicketStatus;
  description: string;
  reference_code: string | null;
  created_at: string;
  updated_at: string;
  statusExplanation: string;
};

export function TicketDetail({ publicRef }: { publicRef: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/support/tickets/${publicRef}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not load this ticket.");
        setTicket(null);
      } else {
        setTicket(data.ticket);
        setMessages(data.messages ?? []);
      }
    } catch {
      setError("Could not load this ticket.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`/api/support/tickets/${publicRef}`);
          const data = await response.json();
          if (cancelled) return;
          if (!response.ok) {
            setError(data.error || "Could not load this ticket.");
            setTicket(null);
          } else {
            setTicket(data.ticket);
            setMessages(data.messages ?? []);
          }
        } catch {
          if (!cancelled) setError("Could not load this ticket.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [publicRef]);

  async function onReply(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/support/tickets/${publicRef}/replies`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Reply was not saved.");
      } else {
        setReply("");
        await load();
      }
    } catch {
      setError("Reply was not saved.");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p className="text-sm text-[#6B7280]">Loading ticket…</p>;
  if (!ticket) {
    return (
      <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm" role="alert">
        {error || "Ticket not found."}{" "}
        <Link href="/help/tickets" className="font-semibold text-[#FF5A1F]">
          Back to your tickets
        </Link>
      </p>
    );
  }

  const explanation = ticket.statusExplanation || STATUS_EXPLANATIONS[ticket.status];

  return (
    <article className="space-y-6">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#FF5A1F]">{ticket.public_ref}</p>
        <h1 className="mt-2 text-2xl font-semibold">{ticket.subject}</h1>
        <p className="mt-2 text-sm text-[#374151]">
          {statusLabel(ticket.status)} · {explanation}
        </p>
        <p className="mt-2 text-xs text-[#6B7280]">
          Opened {new Date(ticket.created_at).toLocaleString()} · Updated {new Date(ticket.updated_at).toLocaleString()}
        </p>
        {ticket.reference_code ? <p className="mt-2 text-sm">Reference {ticket.reference_code}</p> : null}
      </header>
      <ol className="space-y-3">
        {messages.map((message) => (
          <li key={message.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              {message.authorRole} · {new Date(message.createdAt).toLocaleString()}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
          </li>
        ))}
      </ol>
      <form onSubmit={onReply} className="rounded-2xl border border-neutral-200 bg-white p-5">
        <label htmlFor="ticket-reply" className="text-sm font-medium">
          Reply
        </label>
        <textarea
          id="ticket-reply"
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
        />
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={pending} className="mt-3 rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Sending…" : "Send reply"}
        </button>
        <p className="mt-2 text-xs text-[#6B7280]">
          A reply on a resolved or closed ticket reopens it.
        </p>
      </form>
      <p className="text-sm">
        <Link href={`/help?q=${encodeURIComponent(ticket.subject)}`} className="font-semibold text-[#FF5A1F]">
          Search related help articles
        </Link>
      </p>
    </article>
  );
}
