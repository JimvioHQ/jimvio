"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { SupportChat } from "@/components/support/support-chat";
import { showSupportLauncher } from "@/lib/support/routes";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "jimvio-support-widget";
type Tab = "chat" | "articles" | "tickets";
type Saved = { open: boolean; tab: Tab; conversationId: string | null };

function loadSaved(): Saved {
  const empty = { open: false, tab: "chat" as Tab, conversationId: null as string | null };
  if (typeof window === "undefined") return empty;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "") as {
      open?: boolean;
      tab?: Tab;
      conversationId?: string | null;
    };
    return {
      open: Boolean(parsed.open),
      tab: parsed.tab === "articles" || parsed.tab === "tickets" ? parsed.tab : "chat",
      conversationId: typeof parsed.conversationId === "string" ? parsed.conversationId : null,
    };
  } catch {
    return empty;
  }
}

export function LiveSupportWidget() {
  const pathname = usePathname();
  const [session] = useState<Saved>(loadSaved);
  const [open, setOpen] = useState(session.open);
  const [tab, setTab] = useState<Tab>(session.tab);
  const [conversationId, setConversationId] = useState<string | null>(session.conversationId);
  const [unread, setUnread] = useState(0);
  const hidden = !showSupportLauncher(pathname);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener("jimvio-support-open", openPanel);
    return () => window.removeEventListener("jimvio-support-open", openPanel);
  }, []);

  useEffect(() => {
    const saved: Saved = { open, tab, conversationId };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [open, tab, conversationId]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/support/conversations")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.conversations) return;
        const total = data.conversations.reduce(
          (sum: number, item: { customer_unread?: number }) => sum + Number(item.customer_unread ?? 0),
          0,
        );
        setUnread(total);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, pathname]);

  if (hidden) return null;

  return (
    <>
      {open ? (
        <section
          aria-label="Jimvio Support"
          className="fixed inset-x-0 top-[var(--navbar-height)] z-40 flex h-[calc(100dvh-var(--navbar-height)-60px-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden border border-neutral-200 bg-white shadow-2xl motion-reduce:transition-none md:inset-auto md:bottom-6 md:right-6 md:h-[min(680px,calc(100dvh-5rem))] md:w-[392px] md:rounded-3xl"
        >
          <header className="flex items-start justify-between gap-3 bg-[#FF5A1F] px-4 py-3 text-white">
            <div>
              <h2 className="text-base font-semibold">Jimvio Support</h2>
              <p className="text-xs text-white/90">Help articles, AI answers, and human support</p>
            </div>
            <button type="button" className="rounded-full p-1 hover:bg-white/15" aria-label="Close support" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="grid grid-cols-3 border-b border-neutral-100 text-sm" role="tablist">
            {(
              [
                ["chat", "Chat"],
                ["articles", "Help Articles"],
                ["tickets", "My Tickets"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={cn("px-2 py-2 font-medium", tab === id ? "text-[#FF5A1F]" : "text-[#6B7280]")}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "chat" ? (
            <SupportChat conversationId={conversationId} onConversationId={setConversationId} />
          ) : null}
          {tab === "articles" ? <ArticleSearch /> : null}
          {tab === "tickets" ? <TicketPeek /> : null}
        </section>
      ) : null}
      <button
        type="button"
        className={cn(
          "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5A1F] text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2",
          "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 md:right-6",
          open && "max-md:hidden",
        )}
        aria-label={open ? "Close support" : "Open Jimvio support"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {unread > 0 && !open ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#111827] px-1 text-[10px] font-semibold">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </>
  );
}

function ArticleSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Array<{ slug: string; title: string; href: string; excerpt: string }>>([]);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">("idle");

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setState("loading");
    try {
      const response = await fetch(`/api/support/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      const articles = data.articles ?? [];
      setHits(articles);
      setState(articles.length ? "idle" : "empty");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <form onSubmit={search} className="flex gap-2">
        <label htmlFor="support-widget-search" className="sr-only">
          Search help articles
        </label>
        <input
          id="support-widget-search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="min-w-0 flex-1 rounded-full border border-neutral-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          placeholder="Search help articles"
        />
        <button type="submit" className="rounded-full bg-[#111827] px-3 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>
      {state === "loading" ? <p className="mt-3 text-sm text-[#6B7280]">Searching…</p> : null}
      {state === "empty" ? <p className="mt-3 text-sm text-[#6B7280]">No matching published articles.</p> : null}
      {state === "error" ? <p className="mt-3 text-sm text-red-700">Search failed. Try again.</p> : null}
      <ul className="mt-3 space-y-2">
        {hits.map((hit) => (
          <li key={hit.slug}>
            <Link href={hit.href} className="block rounded-xl border border-neutral-200 p-3 text-sm hover:border-[#FF5A1F]">
              <span className="font-semibold">{hit.title}</span>
              <span className="mt-1 block text-[#6B7280]">{hit.excerpt}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TicketPeek() {
  const [tickets, setTickets] = useState<Array<{ public_ref: string; subject: string; status: string }>>([]);
  const [state, setState] = useState<"loading" | "ready" | "auth" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/support/tickets")
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) setState("auth");
          return;
        }
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) setState("error");
          return;
        }
        if (!cancelled) {
          setTickets(data.tickets ?? []);
          setState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <p className="p-4 text-sm text-[#6B7280]">Loading your tickets…</p>;
  if (state === "auth") {
    return (
      <p className="p-4 text-sm">
        <Link href="/login?next=/help/tickets" className="font-semibold text-[#FF5A1F]">
          Sign in
        </Link>{" "}
        to see tickets on your account.
      </p>
    );
  }
  if (state === "error") return <p className="p-4 text-sm text-red-700">Could not load tickets.</p>;
  if (tickets.length === 0) {
    return (
      <p className="p-4 text-sm text-[#374151]">
        No tickets yet.{" "}
        <Link href="/help/tickets/new" className="font-semibold text-[#FF5A1F]">
          Contact support
        </Link>
        .
      </p>
    );
  }
  return (
    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
      {tickets.map((ticket) => (
        <li key={ticket.public_ref}>
          <Link href={`/help/tickets/${ticket.public_ref}`} className="block rounded-xl border border-neutral-200 p-3 text-sm hover:border-[#FF5A1F]">
            <span className="font-semibold">{ticket.subject}</span>
            <span className="mt-1 block text-xs text-[#6B7280]">
              {ticket.public_ref} · {ticket.status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
