"use client";

import { useMemo, useState } from "react";
import {
  cleanCJDescription,
  parseCJSpecifications,
} from "@/lib/cj/render";

/**
 * Structured product details + collapsible description for merchant PDP.
 * Reuses CJ parsers when supplier HTML is present; never invents claims.
 */
export function StorefrontProductInfo({
  description,
  sku,
  showSpecs = true,
}: {
  description?: string | null;
  sku?: string | null;
  showSpecs?: boolean;
}) {
  const raw = description?.trim() || "";
  const cleaned = useMemo(() => cleanCJDescription(raw), [raw]);
  const { specs, notes } = useMemo(
    () => parseCJSpecifications(raw),
    [raw],
  );
  const [expanded, setExpanded] = useState(false);

  const specRows = useMemo(() => {
    const rows = [...specs];
    if (sku?.trim() && !rows.some((s) => /sku/i.test(s.key))) {
      rows.push({ key: "SKU", value: sku.trim() });
    }
    return rows;
  }, [specs, sku]);

  const isLong =
    cleaned.replace(/<[^>]+>/g, " ").trim().length > 480 ||
    (cleaned.match(/<br\s*\/?>/gi) || []).length > 6;

  if (!cleaned && !(showSpecs && (specRows.length || notes.length))) return null;

  return (
    <div className="mx-auto mt-10 max-w-[var(--store-max-width,80rem)] space-y-8 px-4 sm:px-6 lg:mt-14">
      {showSpecs && specRows.length ? (
        <section aria-labelledby="storefront-product-details">
          <h2
            id="storefront-product-details"
            className="text-lg font-semibold tracking-tight text-[var(--store-text,#111827)]"
            style={{ fontFamily: "var(--store-heading-font, inherit)" }}
          >
            Product details
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {specRows.map((row) => (
              <div
                key={`${row.key}-${row.value}`}
                className="flex gap-3 border-b border-[var(--store-border,rgba(0,0,0,0.06))] pb-3"
              >
                <dt className="w-28 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-[var(--store-muted,#6B7280)] sm:w-32">
                  {row.key}
                </dt>
                <dd className="min-w-0 flex-1 text-sm text-[var(--store-text,#111827)]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          {notes.length ? (
            <ul className="mt-4 space-y-1.5 text-sm text-[var(--store-muted,#6B7280)]">
              {notes.map((n) => (
                <li key={n}>Note: {n}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {cleaned ? (
        <section aria-labelledby="storefront-product-description">
          <h2
            id="storefront-product-description"
            className="text-lg font-semibold tracking-tight text-[var(--store-text,#111827)]"
            style={{ fontFamily: "var(--store-heading-font, inherit)" }}
          >
            Description
          </h2>
          <div
            className={`prose prose-sm mt-4 max-w-none text-[var(--store-text,#111827)] opacity-90 ${
              isLong && !expanded ? "relative max-h-56 overflow-hidden" : ""
            }`}
          >
            <div dangerouslySetInnerHTML={{ __html: cleaned }} />
            {isLong && !expanded ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--store-bg,#fff)] to-transparent"
                aria-hidden
              />
            ) : null}
          </div>
          {isLong ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-sm font-semibold text-[var(--store-primary,#FF5A1F)] underline-offset-2 hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
