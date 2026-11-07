"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";
import { HubAvatar } from "../hub-ui";
import type { HubThread } from "./types";

type Person = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
};

const MIN_QUERY = 2;

/**
 * New message: search everyone on Jimvio by name or @username, then open the
 * existing conversation with that person or start one. Only public profile
 * fields are returned by the server.
 */
export function NewMessageDialog({
  open,
  onOpenChange,
  threads,
  onSelect,
  onConversationOpened,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  threads: HubThread[];
  onSelect: (threadId: string) => void;
  /** A new or existing DM was opened on the server; the caller reloads and selects it. */
  onConversationOpened?: (conversationId: string) => void | Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    if (!open) {
      setQ("");
      setPeople([]);
      setStatus("idle");
      setError(null);
      setOpening(null);
    }
  }, [open]);

  // Debounced, cancellable search; stale responses are ignored.
  useEffect(() => {
    const term = q.trim().replace(/^@+/, "");
    if (term.length < MIN_QUERY) {
      setPeople([]);
      setStatus("idle");
      return;
    }
    const id = ++request.current;
    const controller = new AbortController();
    setStatus("loading");
    const timer = setTimeout(() => {
      fetch(`/api/messages/people?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: "no-store" })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Search is unavailable right now.");
          return (data.people ?? []) as Person[];
        })
        .then((list) => {
          if (id !== request.current) return;
          setPeople(list);
          setCursor(0);
          setStatus("done");
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted || id !== request.current) return;
          setError(cause instanceof Error ? cause.message : "Search is unavailable right now.");
          setStatus("error");
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  async function choose(person: Person) {
    if (opening) return;
    setError(null);
    const existing = threads.find((t) => t.kind === "direct" && t.peerId === person.id && !t.communitySlug)
      ?? threads.find((t) => t.kind === "direct" && t.peerId === person.id);
    if (existing) {
      onSelect(existing.id);
      onOpenChange(false);
      return;
    }
    setOpening(person.id);
    try {
      const res = await fetch("/api/messages/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: person.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.conversationId !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "Couldn't open the conversation. Try again.");
      }
      await onConversationOpened?.(data.conversationId);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't open the conversation. Try again.");
    } finally {
      setOpening(null);
    }
  }

  const term = q.trim().replace(/^@+/, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">New message</DialogTitle>
          <DialogDescription className="text-[12px] text-[var(--color-text-muted)]">
            Search anyone on Jimvio by name or @username.
          </DialogDescription>
        </DialogHeader>
        <label className="relative block">
          <span className="sr-only">Search people</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (!people.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(people.length - 1, c + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
              if (e.key === "Enter") { e.preventDefault(); const person = people[cursor]; if (person) void choose(person); }
            }}
            placeholder="Type a name, e.g. Aline or @aline"
            role="combobox"
            aria-expanded={people.length > 0}
            aria-controls="new-message-results"
            aria-autocomplete="list"
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent,#fd5000)]/20"
          />
          {status === "loading" ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]" aria-label="Searching" />
          ) : null}
        </label>
        <div id="new-message-results" role="listbox" className="max-h-80 space-y-1 overflow-y-auto" aria-live="polite">
          {term.length < MIN_QUERY ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Type at least {MIN_QUERY} letters to find people.</p>
          ) : status === "error" ? (
            <p role="alert" className="py-8 text-center text-sm text-red-600">{error}</p>
          ) : status === "done" && people.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No one matches “{term}”.</p>
          ) : (
            people.map((person, index) => {
              const name = person.full_name || person.username || "Jimvio member";
              return (
                <button
                  key={person.id}
                  type="button"
                  role="option"
                  aria-selected={index === cursor}
                  disabled={opening !== null}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => void choose(person)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors disabled:opacity-60 ${index === cursor ? "bg-[var(--color-surface-secondary)]" : "hover:bg-[var(--color-surface-secondary)]"}`}
                >
                  <HubAvatar name={name} src={person.avatar_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-[13px] font-bold">
                      <span className="truncate">{name}</span>
                      <BlueVerifiedBadge verified={Boolean(person.is_verified)} size="sm" />
                    </p>
                    <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                      {person.username ? `@${person.username}` : "Jimvio member"}
                      {person.bio ? ` · ${person.bio}` : ""}
                    </p>
                  </div>
                  {opening === person.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--color-text-muted)]" aria-label="Opening" /> : null}
                </button>
              );
            })
          )}
        </div>
        {error && status !== "error" ? <p role="alert" className="text-center text-[12px] text-red-600">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
