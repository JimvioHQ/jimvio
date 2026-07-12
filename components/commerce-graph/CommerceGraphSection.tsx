"use client";

import { useLazyInView } from "@/components/marketplace/new/personalized/use-lazy-in-view";
import type { GraphSection } from "@/lib/commerce-graph/types";
import { CommerceGraphRail } from "./CommerceGraphRail";
import { CommerceGraphNodeSkeleton } from "./CommerceGraphNodeCard";

type CommerceGraphSectionProps = {
  section: GraphSection;
  loading?: boolean;
  staggerIndex?: number;
};

function SectionSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-5 w-48 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`section-skel-${i}`} className="w-[168px] shrink-0">
            <CommerceGraphNodeSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommerceGraphSection({ section, loading = false, staggerIndex = 0 }: CommerceGraphSectionProps) {
  const { ref, visible } = useLazyInView("240px 0px");

  return (
    <section
      ref={ref}
      aria-labelledby={`graph-section-${section.id}`}
      className="transition-[opacity,transform] duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transitionDelay: visible ? `${staggerIndex * 40}ms` : "0ms",
        willChange: "transform, opacity",
        minHeight: visible ? undefined : 280,
      }}
    >
      <header className="mb-3">
        <h3
          id={`graph-section-${section.id}`}
          className="text-[13px] font-bold text-[var(--color-text-primary)] sm:text-sm"
        >
          {section.title}
        </h3>
        {section.description && (
          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{section.description}</p>
        )}
      </header>

      {visible ? (
        <CommerceGraphRail nodes={section.nodes} sectionId={section.id} loading={loading} />
      ) : (
        <SectionSkeleton />
      )}
    </section>
  );
}
