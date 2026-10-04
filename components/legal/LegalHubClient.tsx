"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Filter,
  Headphones,
  Search,
  Tag,
} from "lucide-react";
import {
  LEGAL_CATEGORIES,
  LEGAL_CONTACT,
  LEGAL_DOCUMENTS,
  getFeaturedLegalDocument,
  searchLegalDocuments,
  type LegalCategoryId,
} from "@/lib/legal/catalog";
import { cn } from "@/lib/utils";
import { LegalHeroBanner } from "./LegalHeroBanner";

export function LegalHubClient() {
  const featured = getFeaturedLegalDocument();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LegalCategoryId | "all">("all");

  const results = useMemo(
    () => searchLegalDocuments(query, category),
    [query, category],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[var(--color-bg)]">
      <LegalHeroBanner mode="hub" />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:max-w-4xl lg:px-8 lg:py-10">
        <div className="relative">
          <label className="sr-only" htmlFor="legal-hub-search">
            Search legal documents
          </label>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <input
            id="legal-hub-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search legal documents..."
            className="h-12 w-full rounded-[14px] border border-[var(--color-border)] bg-white py-2 pl-11 pr-12 text-sm text-[var(--color-text-primary)] shadow-sm outline-none transition focus:border-[#FF5A1F] focus:ring-2 focus:ring-[rgba(255,90,31,0.25)] dark:bg-[var(--color-surface)]"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--color-text-muted)]">
            <Filter className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <section className="mt-5 rounded-[18px] border border-[rgba(255,90,31,0.18)] bg-[rgba(255,90,31,0.05)] p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C2410C]">
            Featured document
          </p>
          <div className="mt-3 flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#FF5A1F] text-white">
              <featured.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-[#111827] dark:text-[var(--color-text-primary)]">
                {featured.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {featured.subtitle}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {featured.lastUpdated}
                </span>
                {featured.version ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    Version {featured.version}
                  </span>
                ) : null}
              </div>
              <Link
                href={featured.href}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#FF5A1F] px-5 text-sm font-bold text-white transition hover:bg-[#e04e18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
              >
                Read document →
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]">
                All Legal Documents
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Explore all policies and terms for using Jimvio.
              </p>
            </div>
            <label className="sr-only" htmlFor="legal-hub-category">
              All Categories
            </label>
            <select
              id="legal-hub-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as LegalCategoryId | "all")}
              className="h-10 rounded-[10px] border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-text-primary)] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[rgba(255,90,31,0.25)] dark:bg-[var(--color-surface)]"
            >
              <option value="all">All Categories</option>
              {LEGAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {results.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[var(--color-border)] bg-white px-4 py-12 text-center dark:bg-[var(--color-surface)]">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                No documents found
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Try another search term or clear the category filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                className="mt-4 text-sm font-semibold text-[#C2410C] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-white dark:bg-[var(--color-surface)]">
              {results.map((doc, index) => {
                const Icon = doc.icon;
                return (
                  <li
                    key={doc.id}
                    className={cn(
                      index > 0 && "border-t border-[var(--color-border)]",
                    )}
                  >
                    <Link
                      href={doc.href}
                      className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[rgba(255,90,31,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF5A1F] sm:px-5"
                    >
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.1)] text-[#FF5A1F]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                          {doc.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-[var(--color-text-muted)]">
                          {doc.subtitle}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Showing {results.length} of {LEGAL_DOCUMENTS.length} documents
          </p>
        </section>

        <section className="mt-8 mb-4 rounded-[18px] border border-[rgba(255,90,31,0.16)] bg-[rgba(255,90,31,0.05)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(255,90,31,0.12)] text-[#FF5A1F]">
                <Headphones className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
                  Need help?
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Have questions about our policies? We’re here to help.
                </p>
              </div>
            </div>
            <Link
              href={LEGAL_CONTACT.contactPath}
              className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[rgba(255,90,31,0.28)] bg-white px-5 text-sm font-bold text-[#C2410C] transition hover:bg-[rgba(255,90,31,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] dark:bg-[var(--color-surface)]"
            >
              Contact Legal →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
