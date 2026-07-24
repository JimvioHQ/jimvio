"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAiKnowledgeProvider,
  type AiNativeContext,
} from "@/lib/ai/native";

export function AiKnowledgeEngine({
  context,
  className,
}: {
  context: AiNativeContext;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => {
    const result = getAiKnowledgeProvider().search(query, context);
    return Array.isArray(result) ? result : [];
  }, [context, query]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI knowledge engine"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <BookOpen className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        AI knowledge engine
      </h3>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2">
        <Search className="h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask across communities, products, courses, campaigns…"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--color-text-muted)]"
        />
      </label>
      <ul className="mt-3 space-y-1.5">
        {hits.map((hit) => (
          <li key={hit.id}>
            <Link
              href={hit.href}
              className="flex items-start justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 hover:border-[var(--color-accent)]/35"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  {hit.source}
                </span>
                <span className="block truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {hit.title}
                </span>
                <span className="block text-[11.5px] text-[var(--color-text-muted)]">
                  {hit.snippet}
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-black text-[var(--color-text-muted)]">
                {hit.score}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
