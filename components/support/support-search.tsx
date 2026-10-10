"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { SUGGESTED_SEARCHES } from "@/lib/support/types";

type ArticleHit = {
  slug: string;
  title: string;
  categoryTitle: string;
  excerpt: string;
  href: string;
};

type TicketHit = {
  publicRef: string;
  subject: string;
  status: string;
  href: string;
};

export function SupportSearch({
  category,
  initialQuery = "",
  placeholder = "Search help articles",
}: {
  category?: string;
  initialQuery?: string;
  placeholder?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [articles, setArticles] = useState<ArticleHit[]>([]);
  const [tickets, setTickets] = useState<TicketHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settledQuery, setSettledQuery] = useState("");
  const [active, setActive] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const current = ++request.current;
    const handle = window.setTimeout(async () => {
      if (q.length < 2) {
        if (current !== request.current) return;
        setArticles([]);
        setTickets([]);
        setError("");
        setLoading(false);
        setSettledQuery("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q, tickets: "1" });
        if (category) params.set("category", category);
        const response = await fetch(`/api/support/search?${params.toString()}`);
        const data = await response.json();
        if (current !== request.current) return;
        if (!response.ok) {
          setError(data.error || "Search failed.");
          setArticles([]);
          setTickets([]);
        } else {
          setArticles(data.articles ?? []);
          setTickets(data.tickets ?? []);
          setActive(0);
        }
        setSettledQuery(q);
      } catch {
        if (current === request.current) setError("Search failed. Check your connection and try again.");
      } finally {
        if (current === request.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, category]);

  const results = [
    ...articles.map((article) => ({ kind: "article" as const, ...article })),
    ...tickets.map((ticket) => ({ kind: "ticket" as const, ...ticket })),
  ];

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      window.location.href = results[active].href;
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search help
      </label>
      <div className="flex items-center rounded-2xl border border-neutral-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#FF5A1F]">
        <input
          id={`${listId}-input`}
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-12 w-full bg-transparent px-4 text-base text-[#111827] outline-none placeholder:text-[#9CA3AF]"
        />
        {query ? (
          <button
            type="button"
            className="mr-2 rounded-lg px-3 py-1 text-sm font-medium text-[#374151] hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-[70vh] w-full overflow-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg"
        >
          {query.trim().length < 2 ? (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Suggested searches
              </p>
              <ul>
                {SUGGESTED_SEARCHES.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                      onClick={() => setQuery(suggestion)}
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {loading ? <p className="px-3 py-3 text-sm text-[#6B7280]">Searching…</p> : null}
          {error ? <p className="px-3 py-3 text-sm text-red-700">{error}</p> : null}
          {!loading && !error && settledQuery === query.trim() && query.trim().length >= 2 && results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[#6B7280]">
              No matching articles. Try another phrase or contact support.
            </p>
          ) : null}
          {results.map((result, index) => (
            <Link
              key={`${result.kind}-${result.href}`}
              href={result.href}
              role="option"
              aria-selected={index === active}
              className={`block rounded-xl px-3 py-3 ${index === active ? "bg-[#FFF1EA]" : "hover:bg-[#F8FAFC]"}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-[#FF5A1F]">
                {result.kind === "article" ? result.categoryTitle : "Your ticket"}
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {result.kind === "article" ? result.title : result.subject}
              </span>
              <span className="mt-1 block text-sm text-[#6B7280]">
                {result.kind === "article" ? result.excerpt : `${result.publicRef} · ${result.status}`}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
