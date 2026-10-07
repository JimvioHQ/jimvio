"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  cleanCJDescription,
  parseCJDescriptionSections,
  type CJFeatureHighlight,
} from "@/lib/cj/render";
import {
  sanitizeProductDescriptionHtml,
  sanitizeSupplierFacingText,
} from "@/lib/cj/customer-facing";

/**
 * SSR-safe sanitizer — avoids isomorphic-dompurify/jsdom, which breaks
 * Vercel serverless SSR for /marketplace/[slug] when pulled into the page graph.
 */
function sanitizeDescriptionHtml(html: string): string {
  return sanitizeProductDescriptionHtml(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(iframe|object|embed|link|meta|form)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function FeatureList({ features }: { features: CJFeatureHighlight[] }) {
  return (
    <div className="mb-4 space-y-3">
      <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Features</h4>
      <ul className="space-y-2.5">
        {features.map((feature) => (
          <li
            key={feature.title}
            className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>
              <strong className="font-semibold text-[var(--color-text-primary)]">{feature.title}</strong>
              {feature.description ? ` — ${feature.description}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductDescriptionView({
  description,
  featureBullets = [],
  className,
  collapsible = false,
  collapsedMaxHeight = 280,
  expandLabel = "View full description",
  collapseLabel = "View less",
}: {
  description?: string | null;
  featureBullets?: string[];
  className?: string;
  collapsible?: boolean;
  collapsedMaxHeight?: number;
  expandLabel?: string;
  collapseLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const sections = useMemo(
    () => parseCJDescriptionSections(description),
    [description],
  );

  const safeHtml = useMemo(() => {
    if (!description?.trim()) return "";
    return sanitizeDescriptionHtml(cleanCJDescription(description));
  }, [description]);

  const bullets = useMemo(() => {
    const fromMeta = featureBullets
      .map((item) => sanitizeSupplierFacingText(item))
      .filter(Boolean);
    if (fromMeta.length > 0) return fromMeta;
    return [];
  }, [featureBullets]);

  const parsedFeatures = sections.features.filter((f) => f.title.trim());
  const canExpand = collapsible && safeHtml.length > 420;

  if (!safeHtml && bullets.length === 0 && parsedFeatures.length === 0) {
    return (
      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
        No description available.
      </p>
    );
  }

  return (
    <div className={className}>
      {parsedFeatures.length > 0 ? <FeatureList features={parsedFeatures} /> : null}

      {safeHtml ? (
        <>
          <div
            className="product-description text-[12.5px] leading-relaxed text-[var(--color-text-secondary)] overflow-hidden transition-[max-height] duration-300"
            style={
              canExpand && !expanded
                ? { maxHeight: collapsedMaxHeight }
                : undefined
            }
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              {expanded ? collapseLabel : expandLabel}
            </button>
          ) : null}
        </>
      ) : null}

      {bullets.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-[12.5px] text-[var(--color-text-secondary)]">
          {bullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
