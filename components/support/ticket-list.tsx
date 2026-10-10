"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SUPPORT_CATEGORIES, TICKET_STATUSES } from "@/lib/support/types";
import { statusLabel } from "@/lib/support/format";

type Ticket = {
  public_ref: string;
  subject: string;
  category: string;
  status: string;
  updated_at: string;
};

export function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      try {
        const response = await fetch(`/api/support/tickets?${params.toString()}`);
        const data = await response.json();
        if (response.status === 401) {
          setSignedOut(true);
          setTickets([]);
        } else if (!response.ok) {
          setError(data.error || "Could not load tickets.");
        } else {
          setTickets(data.tickets ?? []);
        }
      } catch {
        setError("Could not load tickets.");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [q, status, category]);

  if (signedOut) {
    return (
      <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm">
        <Link href="/login?next=/help/tickets" className="font-semibold text-[#FF5A1F]">
          Sign in
        </Link>{" "}
        to view your tickets. Ticket numbers alone do not reveal a conversation.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Search your tickets
          <input value={q} onChange={(event) => setQ(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-medium">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2">
            <option value="">All</option>
            {TICKET_STATUSES.map((item) => (
              <option key={item} value={item}>
                {statusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2">
            <option value="">All</option>
            {SUPPORT_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? <p className="text-sm text-[#6B7280]">Loading tickets…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!loading && !error && tickets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm">
          No tickets match.{" "}
          <Link href="/help/tickets/new" className="font-semibold text-[#FF5A1F]">
            Create a ticket
          </Link>
        </p>
      ) : null}
      <ul className="space-y-3">
        {tickets.map((ticket) => (
          <li key={ticket.public_ref}>
            <Link href={`/help/tickets/${ticket.public_ref}`} className="block rounded-2xl border border-neutral-200 bg-white p-4 hover:border-[#FF5A1F]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#FF5A1F]">{ticket.public_ref}</span>
              <span className="mt-1 block font-semibold">{ticket.subject}</span>
              <span className="mt-1 block text-sm text-[#6B7280]">
                {statusLabel(ticket.status)} · Updated {new Date(ticket.updated_at).toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
