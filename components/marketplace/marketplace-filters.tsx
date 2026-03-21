"use client";

import Link from "next/link";

type FilterItem =
  | { label: string; value: string }
  | { label: string; value: "shopify"; href: string };

export function MarketplaceFilters({
  currentType,
  currentCatalog,
}: {
  currentSort?: string;
  currentType?: string;
  currentCatalog?: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="text-label text-[var(--color-text-muted)] mb-3">Product type</h3>
      <div className="space-y-0.5">
        {([
          { label: "Physical", value: "physical" },
          { label: "Digital", value: "digital" },
          { label: "Courses", value: "course" },
          { label: "Software", value: "software" },
          { label: "Templates", value: "template" },
          { label: "Ebooks", value: "ebook" },
          { label: "Shopify catalog", value: "shopify", href: "/marketplace?catalog=shopify" },
        ] as FilterItem[]).map((t) => {
          const href = "href" in t ? t.href : `/marketplace?type=${t.value}`;
          const active = t.value === "shopify" ? currentCatalog === "shopify" : currentType === t.value;
          return (
            <Link key={t.value} href={href}>
              <div
                className={`px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors cursor-pointer ${
                  active
                    ? "font-medium text-[var(--color-accent)] bg-[var(--color-accent-light)] border border-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                }`}
              >
                {t.label}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
