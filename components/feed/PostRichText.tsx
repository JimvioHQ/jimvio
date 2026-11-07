"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { hashtagFeedHref } from "@/lib/feed/hashtag-query";
import { cn } from "@/lib/utils";
import { previewPostText } from "@/lib/feed/post-text-preview";

const TOKEN_RE = /(#[a-zA-Z0-9_]{2,48}|https?:\/\/[^\s<>"']{3,300})/g;

function renderTokens(text: string) {
  const parts = text.split(TOKEN_RE);
  return parts.map((part, index) => {
    if (part.startsWith("#") && part.length > 2) {
      const tag = part.slice(1);
      return (
        <Link
          key={`${part}-${index}`}
          href={hashtagFeedHref(tag)}
          className="font-medium text-[#fd5000] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    if (/^https?:\/\//i.test(part)) {
      // Trailing punctuation belongs to the sentence, not the URL.
      const match = part.match(/^(.*?)([).,!?;:]*)$/);
      const url = match?.[1] || part;
      const tail = match?.[2] ?? "";
      return (
        <span key={`${index}-url`}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="break-all font-medium text-[#fd5000] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}
          </a>
          {tail}
        </span>
      );
    }
    return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>;
  });
}

/**
 * Renders post text with hashtags (filtered feed) and links.
 *
 * `collapsible`: long posts show a readable preview (line + character limit)
 * with a "View more" / "Show less" toggle. Paragraph breaks are preserved and
 * the full text is always one tap away.
 */
export function PostRichText({
  text,
  className,
  collapsible = false,
  maxLines = 5,
  maxChars = 320,
}: {
  text: string;
  className?: string;
  collapsible?: boolean;
  maxLines?: number;
  maxChars?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const preview = collapsible ? previewPostText(text, { maxChars, maxLines }) : null;
  const truncatedByText = Boolean(preview?.truncated);

  // Visual line clamp can also hide content (very long single lines / narrow screens).
  useLayoutEffect(() => {
    if (!collapsible || expanded) return;
    const el = ref.current;
    if (!el) return;
    const check = () => setClamped(el.scrollHeight - el.clientHeight > 2);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsible, expanded, text]);

  if (!collapsible) {
    return <p className={className}>{renderTokens(text)}</p>;
  }

  const showToggle = truncatedByText || clamped || expanded;
  const shown = expanded || !preview ? text : preview.text;

  return (
    <div className="min-w-0">
      <p
        ref={ref}
        className={cn(className, !expanded && "overflow-hidden", !expanded && clampClass(maxLines), showToggle && "mb-0")}
      >
        {renderTokens(shown)}
        {!expanded && truncatedByText ? <span aria-hidden>…</span> : null}
      </p>
      {showToggle ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mb-2.5 mt-1 inline-flex min-h-8 items-center rounded-md text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[#fd5000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
        >
          {expanded ? "Show less" : "View more"}
        </button>
      ) : null}
    </div>
  );
}

function clampClass(lines: number): string {
  switch (lines) {
    case 3:
      return "line-clamp-3";
    case 4:
      return "line-clamp-4";
    case 6:
      return "line-clamp-6";
    default:
      return "line-clamp-5";
  }
}
