"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DsTabs({
  tabs,
  activeId,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto", className)} aria-label="Tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeId === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "ds-focus-ring shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors",
            activeId === tab.id
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]",
          )}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 && <span className="ml-1 opacity-80">({tab.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function DsBreadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[12px]">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 text-[var(--color-text-muted)]" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-[var(--color-text-primary)]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DsPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="ds-focus-ring rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1.5 text-[12px] disabled:opacity-40"
      >
        Prev
      </button>
      <span className="px-2 text-[12px] text-[var(--color-text-muted)]">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="ds-focus-ring rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1.5 text-[12px] disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}

export function DsAccordion({
  items,
}: {
  items: Array<{ id: string; title: string; content: React.ReactNode }>;
}) {
  return (
    <div className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
      {items.map((item) => (
        <details key={item.id} className="group">
          <summary className="ds-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] marker:content-none">
            {item.title}
          </summary>
          <div className="border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            {item.content}
          </div>
        </details>
      ))}
    </div>
  );
}
