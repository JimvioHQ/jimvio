"use client";

import { useEffect, useState } from "react";
import { TICKET_STATUSES } from "@/lib/support/types";
import { statusLabel } from "@/lib/support/format";

type Ticket = {
  public_ref: string;
  subject: string;
  status: string;
  requester_email: string | null;
  updated_at: string;
};

type Detail = {
  ticket: Ticket & { description: string; category: string };
  messages: Array<{ id: string; author_role: string; visibility: string; body: string; created_at: string }>;
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Detail | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState("in_progress");
  const [error, setError] = useState("");

  async function loadList() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const response = await fetch(`/api/admin/support/tickets?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not load tickets.");
    else setTickets(data.tickets ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status) params.set("status", status);
        const response = await fetch(`/api/admin/support/tickets?${params.toString()}`);
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) setError(data.error || "Could not load tickets.");
        else setTickets(data.tickets ?? []);
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [q, status]);

  async function openTicket(ref: string) {
    setError("");
    const response = await fetch(`/api/admin/support/tickets/${ref}`);
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not open the ticket.");
    else {
      setSelected(data);
      setNextStatus(data.ticket.status);
    }
  }

  async function save() {
    if (!selected) return;
    setError("");
    const response = await fetch(`/api/admin/support/tickets/${selected.ticket.public_ref}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, reply, internalNote: note }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    setReply("");
    setNote("");
    await openTicket(selected.ticket.public_ref);
    await loadList();
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Support tickets</h1>
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search reference, subject, email" className="rounded-lg border px-3 py-2 text-sm" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {TICKET_STATUSES.map((item) => (
            <option key={item} value={item}>
              {statusLabel(item)}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.public_ref}>
              <button type="button" onClick={() => openTicket(ticket.public_ref)} className="w-full rounded-xl border bg-white p-3 text-left text-sm">
                <span className="font-semibold">{ticket.public_ref}</span> · {statusLabel(ticket.status)}
                <span className="mt-1 block">{ticket.subject}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <div className="rounded-xl border bg-white p-4 text-sm">
            <h2 className="text-lg font-semibold">{selected.ticket.subject}</h2>
            <p className="mt-1 text-xs text-neutral-500">{selected.ticket.requester_email}</p>
            <ul className="mt-4 space-y-2">
              {selected.messages.map((message) => (
                <li key={message.id} className="rounded-lg bg-neutral-50 p-2">
                  <span className="text-xs uppercase">
                    {message.author_role}
                    {message.visibility === "internal" ? " · internal" : ""}
                  </span>
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </li>
              ))}
            </ul>
            <label className="mt-4 block">
              Customer reply
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-2 py-1" />
            </label>
            <label className="mt-3 block">
              Internal note
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-2 py-1" />
            </label>
            <label className="mt-3 block">
              Status
              <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className="mt-1 w-full rounded-lg border px-2 py-1">
                {TICKET_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void save()} className="mt-3 rounded-lg bg-[#FF5A1F] px-3 py-2 font-semibold text-white">
              Save
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
