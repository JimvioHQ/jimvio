"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Headphones, Search, X } from "lucide-react";
import {
  LEGAL_CATEGORIES,
  LEGAL_DOCUMENTS,
  type LegalCategoryId,
  type LegalDocumentId,
  searchLegalDocuments,
} from "@/lib/legal/catalog";
import { cn } from "@/lib/utils";

type Props = {
  activeId: LegalDocumentId;
  className?: string;
  onNavigate?: () => void;
};

export function LegalSidebarNav({ activeId, className, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LegalCategoryId | "all">("all");

  const results = useMemo(
    () => searchLegalDocuments(query, category),
    [query, category],
  );

  const grouped = useMemo(() => {
    return LEGAL_CATEGORIES.map((cat) => ({
      ...cat,
      docs: results.filter((doc) => doc.category === cat.id),
    })).filter((group) => group.docs.length > 0);
  }, [results]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col rounded-[16px] border border-[var(--color-border)] bg-white dark:bg-[var(--color-surface)]",
        className,
      )}
      aria-label="Legal documents"
    >
      <div className="border-b border-[var(--color-border)] p-4">
        <label className="sr-only" htmlFor="legal-doc-search">
          Search legal documents
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <input
            id="legal-doc-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search legal documents..."
            className="h-11 w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 py-2 pl-10 pr-10 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[#FF5A1F] focus:ring-2 focus:ring-[rgba(255,90,31,0.25)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <label className="sr-only" htmlFor="legal-category-filter">
          Filter by category
        </label>
        <select
          id="legal-category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value as LegalCategoryId | "all")}
          className="mt-3 h-10 w-full rounded-[10px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[rgba(255,90,31,0.25)] dark:bg-[var(--color-surface)]"
        >
          <option value="all">All Categories</option>
          {LEGAL_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Document list">
        {grouped.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No documents match “{query}”.
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.id} className="mb-3">
              <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.docs.map((doc) => {
                  const Icon = doc.icon;
                  const active = doc.id === activeId;
                  return (
                    <li key={doc.id}>
                      <Link
                        href={doc.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
                          active
                            ? "border border-[rgba(255,90,31,0.35)] bg-[rgba(255,90,31,0.08)] font-semibold text-[#C2410C]"
                            : "border border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
                            active
                              ? "bg-[rgba(255,90,31,0.14)] text-[#FF5A1F]"
                              : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] group-hover:text-[#FF5A1F]",
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-[#FF5A1F]" : "text-[var(--color-text-muted)]",
                          )}
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-[var(--color-border)] p-4">
        <div className="rounded-[14px] border border-[rgba(255,90,31,0.15)] bg-[rgba(255,90,31,0.05)] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Headphones className="h-5 w-5 text-[#FF5A1F]" aria-hidden="true" />
            <p className="text-sm font-bold text-[var(--color-text-primary)]">Need Help?</p>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            Questions about our policies? Contact support.
          </p>
          <Link
            href="/help"
            onClick={onNavigate}
            className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-[#FF5A1F] text-sm font-bold text-white transition hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
          >
            Contact Support
          </Link>
        </div>
        <p className="mt-3 text-center text-[11px] text-[var(--color-text-muted)]">
          {LEGAL_DOCUMENTS.length} published documents
        </p>
      </div>
    </aside>
  );
}
