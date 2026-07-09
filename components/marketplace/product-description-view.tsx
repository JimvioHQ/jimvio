"use client";

import React, { useMemo, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { CheckCircle2 } from "lucide-react";
import {
  cleanCJDescription,
  parseCJDescriptionSections,
  type CJFeatureHighlight,
} from "@/lib/cj/render";
import { sanitizeSupplierFacingText } from "@/lib/cj/customer-facing";

const ALLOWED_HTML_TAGS = [
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "br",
  "h3",
  "h4",
  "h5",
  "span",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "div",
  "img",
];

const ALLOWED_HTML_ATTR = ["class", "src", "alt", "title", "width", "height", "loading"];

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
}: {
  description?: string | null;
  featureBullets?: string[];
  className?: string;
  collapsible?: boolean;
  collapsedMaxHeight?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const sections = useMemo(
    () => parseCJDescriptionSections(description),
    [description],
  );

  const safeHtml = useMemo(() => {
    if (!description?.trim()) return "";
    const cleaned = cleanCJDescription(description);
    return DOMPurify.sanitize(cleaned, {
      ALLOWED_TAGS: ALLOWED_HTML_TAGS,
      ALLOWED_ATTR: ALLOWED_HTML_ATTR,
    });
  }, [description]);

  const bullets = useMemo(() => {
    const fromMeta = featureBullets
      .map((item) => sanitizeSupplierFacingText(item))
      .filter(Boolean);
    if (fromMeta.length > 0) return fromMeta;
    return [];
  }, [featureBullets]);

  const parsedFeatures = sections.features.filter((f) => f.title.trim());

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
              collapsible && !expanded
                ? { maxHeight: collapsedMaxHeight }
                : undefined
            }
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
          {collapsible ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
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
