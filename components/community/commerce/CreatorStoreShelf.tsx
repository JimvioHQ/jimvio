"use client";

import { useState } from "react";
import {
  CREATOR_STORE_SECTIONS,
  type CommerceEmbed,
  type CreatorStoreSection,
} from "@/lib/community/commerce";
import { cn } from "@/lib/utils";
import { MessageCommerceEmbed } from "./MessageCommerceEmbed";
import Link from "next/link";

/**
 * Creator Store — products, courses, services, bundles, memberships, affiliates.
 */
export function CreatorStoreShelf({
  products = [],
  courses = [],
  services = [],
  bundles = [],
  memberships = [],
  affiliateOffers = [],
  storeHref,
}: {
  products?: CommerceEmbed[];
  courses?: CommerceEmbed[];
  services?: CommerceEmbed[];
  bundles?: CommerceEmbed[];
  memberships?: CommerceEmbed[];
  affiliateOffers?: CommerceEmbed[];
  storeHref?: string;
}) {
  const [section, setSection] = useState<CreatorStoreSection>("products");

  const bySection: Record<CreatorStoreSection, CommerceEmbed[]> = {
    products,
    courses,
    services,
    bundles,
    memberships,
    affiliate_offers: affiliateOffers,
  };

  const list = bySection[section];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Creator Store
          </p>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            Shop this creator
          </h3>
        </div>
        {storeHref && (
          <Link
            href={storeHref}
            className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            Full storefront
          </Link>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Store sections"
        className="flex gap-1 overflow-x-auto scrollbar-hide"
      >
        {CREATOR_STORE_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold",
              section === s.id
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
            )}
          >
            {s.label}
            {bySection[s.id].length > 0 && (
              <span className="ml-1 opacity-80">({bySection[s.id].length})</span>
            )}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-[13px] text-[var(--color-text-muted)]">
          No {CREATOR_STORE_SECTIONS.find((s) => s.id === section)?.label.toLowerCase()}{" "}
          yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => (
            <MessageCommerceEmbed key={`${item.kind}-${item.id}`} embed={item} />
          ))}
        </div>
      )}
    </div>
  );
}
