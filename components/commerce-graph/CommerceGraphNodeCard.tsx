"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { GRAPH_NODE_META, getStrengthLabel, STRENGTH_STYLES } from "@/lib/commerce-graph";
import type { GraphNode } from "@/lib/commerce-graph/types";
import { cn } from "@/lib/utils";

type CommerceGraphNodeCardProps = {
  node: GraphNode;
  compact?: boolean;
  showAiMeta?: boolean;
  className?: string;
};

export function CommerceGraphNodeCard({
  node,
  compact = false,
  showAiMeta = false,
  className,
}: CommerceGraphNodeCardProps) {
  const meta = GRAPH_NODE_META[node.kind];
  const strengthKey = getStrengthLabel(node.aiMeta.relationshipStrength);
  const strengthStyle = STRENGTH_STYLES[strengthKey];

  return (
    <Link
      href={node.href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-[transform,box-shadow,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50",
        compact ? "min-h-[200px]" : "min-h-[240px]",
        className,
      )}
      style={{ willChange: "transform" }}
      aria-label={`${meta.label}: ${node.title}`}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-secondary)]"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${meta.accent} 10%, var(--color-surface-secondary)), var(--color-surface-secondary))`,
        }}
      >
        {node.imageUrl ? (
          <Image
            src={node.imageUrl}
            alt=""
            fill
            sizes={compact ? "140px" : "168px"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl" aria-hidden>
            {meta.emoji}
          </div>
        )}
        {node.badge && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            {node.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          {meta.emoji} {meta.label}
        </p>
        <h4 className={cn("line-clamp-2 font-bold text-[var(--color-text-primary)]", compact ? "text-[12px]" : "text-[13px]")}>
          {node.title}
        </h4>
        {node.subtitle && (
          <p className="line-clamp-1 text-[11px] text-[var(--color-text-muted)]">{node.subtitle}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
            style={{ color: strengthStyle.color, background: `${strengthStyle.color}18` }}
          >
            {node.aiMeta.similarityPercent}% match
          </span>
          <ArrowRight className="size-3.5 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5" />
        </div>

        {showAiMeta && (
          <div
            className="mt-1 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-2"
            aria-label="AI graph placeholders"
          >
            <p className="mb-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase text-[var(--color-accent)]">
              <Sparkles className="size-3" />
              AI ready
            </p>
            <p className="line-clamp-2 text-[10px] text-[var(--color-text-muted)]">
              {node.aiMeta.whyRecommendation}
            </p>
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              Strength {node.aiMeta.relationshipStrength}% · Confidence {node.aiMeta.confidence}%
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

export function CommerceGraphNodeSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        compact ? "min-h-[200px]" : "min-h-[240px]",
      )}
      aria-hidden
    >
      <div className="aspect-[4/3] animate-pulse bg-[var(--color-surface-secondary)]" />
      <div className="space-y-2 p-3">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
        <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
      </div>
    </div>
  );
}

export function CommerceGraphMiniRow({ node }: { node: GraphNode }) {
  const meta = GRAPH_NODE_META[node.kind];
  return (
    <Link
      href={node.href}
      className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
    >
      <span className="text-base" aria-hidden>
        {meta.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
          {node.title}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {node.aiMeta.similarityPercent}% similarity · {node.aiMeta.relationshipStrength}% strength
        </span>
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
    </Link>
  );
}
