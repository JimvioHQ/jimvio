"use client";

import { useLazyInView } from "@/components/marketplace/new/personalized/use-lazy-in-view";
import type { BusinessSection } from "@/lib/business-graph/types";
import { BusinessGraphRail } from "./BusinessGraphRail";
import { BusinessGraphNodeSkeleton } from "./BusinessGraphNodeCard";

export function BusinessGraphSection({
  section,
  loading = false,
  staggerIndex = 0,
}: {
  section: BusinessSection;
  loading?: boolean;
  staggerIndex?: number;
}) {
  const { ref, visible } = useLazyInView("240px 0px");

  return (
    <section
      ref={ref}
      aria-labelledby={`biz-section-${section.id}`}
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
        <h3 id={`biz-section-${section.id}`} className="text-[13px] font-bold text-[var(--color-text-primary)] sm:text-sm">
          {section.title}
        </h3>
        {section.description && (
          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{section.description}</p>
        )}
      </header>
      {visible ? (
        <BusinessGraphRail nodes={section.nodes} sectionId={section.id} loading={loading} />
      ) : (
        <div className="flex gap-3 overflow-hidden" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[168px] shrink-0"><BusinessGraphNodeSkeleton /></div>
          ))}
        </div>
      )}
    </section>
  );
}
