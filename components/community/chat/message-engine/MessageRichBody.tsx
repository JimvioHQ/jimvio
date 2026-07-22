"use client";

import { cn } from "@/lib/utils";
import {
  isListLine,
  isQuotedLine,
  parseRichText,
  type RichSegment,
} from "@/lib/community/chat/message-experience";

function SegmentView({ seg }: { seg: RichSegment }) {
  switch (seg.type) {
    case "link":
      return (
        <a
          href={seg.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline"
        >
          {seg.value}
        </a>
      );
    case "mention":
      return (
        <span className="rounded-sm bg-[var(--color-accent-subtle)] px-0.5 font-semibold text-[var(--color-accent)]">
          {seg.value}
        </span>
      );
    case "hashtag":
      return (
        <span className="font-medium text-[var(--color-accent)]">{seg.value}</span>
      );
    case "code":
      return (
        <code className="rounded-sm bg-black/5 px-1 py-0.5 font-mono text-[12px] text-[var(--color-text-primary)] dark:bg-white/10">
          {seg.value}
        </code>
      );
    case "codeblock":
      return (
        <pre
          className={cn(
            "my-1.5 overflow-x-auto rounded-md border border-[var(--color-border)]",
            "bg-[var(--color-surface-secondary)] px-2.5 py-2 font-mono text-[12px] leading-relaxed",
            "text-[var(--color-text-primary)]"
          )}
        >
          {seg.value}
        </pre>
      );
    default:
      return <>{seg.value}</>;
  }
}

/** Renders rich collaboration-object body: links, mentions, hashtags, code, lists, quotes. */
export function MessageRichBody({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const lines = body.split("\n");
  const hasStructure = lines.some((l) => isQuotedLine(l) || isListLine(l));

  if (!hasStructure) {
    const segs = parseRichText(body);
    return (
      <p
        className={cn(
          "whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-text-primary)]",
          className
        )}
      >
        {segs.map((seg, i) => (
          <SegmentView key={`${seg.type}-${i}`} seg={seg} />
        ))}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "space-y-0.5 text-sm leading-relaxed text-[var(--color-text-primary)]",
        className
      )}
    >
      {lines.map((line, i) => {
        if (isQuotedLine(line)) {
          const inner = line.replace(/^\s*>\s?/, "");
          return (
            <blockquote
              key={i}
              className="border-l-2 border-[var(--color-accent)] pl-2 text-[var(--color-text-secondary)]"
            >
              {parseRichText(inner).map((seg, j) => (
                <SegmentView key={j} seg={seg} />
              ))}
            </blockquote>
          );
        }
        if (isListLine(line)) {
          return (
            <div key={i} className="flex gap-1.5 pl-0.5">
              <span className="shrink-0 text-[var(--color-text-muted)]" aria-hidden>
                •
              </span>
              <span className="min-w-0">
                {parseRichText(line.replace(/^\s*([-*•]|\d+\.)\s+/, "")).map(
                  (seg, j) => (
                    <SegmentView key={j} seg={seg} />
                  )
                )}
              </span>
            </div>
          );
        }
        if (!line.trim()) return <div key={i} className="h-2" />;
        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {parseRichText(line).map((seg, j) => (
              <SegmentView key={j} seg={seg} />
            ))}
          </p>
        );
      })}
    </div>
  );
}
