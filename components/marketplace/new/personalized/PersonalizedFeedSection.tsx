"use client";

import { memo } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonalizedSection } from "@/lib/marketplace/personalization";
import { PersonalizedProductRail } from "./PersonalizedProductRail";
import { useLazyInView } from "./use-lazy-in-view";

type PersonalizedFeedSectionProps = {
  section: PersonalizedSection;
  index: number;
  loading?: boolean;
};

function SectionSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"
      style={{
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-sm)",
        minHeight: 320,
      }}
      aria-hidden
    >
      <div className="mb-4 space-y-2">
        <div
          className="h-5 w-48 animate-pulse rounded"
          style={{ background: "var(--color-surface-secondary)" }}
        />
        <div
          className="h-3 w-72 max-w-full animate-pulse rounded"
          style={{ background: "var(--color-surface-secondary)" }}
        />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`section-skel-${i}`}
            className="w-[148px] shrink-0 sm:w-[168px]"
          >
            <div
              className="aspect-square animate-pulse rounded-xl"
              style={{ background: "var(--color-surface-secondary)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const PersonalizedFeedSection = memo(function PersonalizedFeedSection({
  section,
  index,
  loading = false,
}: PersonalizedFeedSectionProps) {
  const { ref, visible } = useLazyInView();
  const headingId = `personalized-${section.id}-heading`;

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--color-border)] p-4 sm:p-5",
        "transition-[opacity,transform] duration-500 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
      )}
      style={{
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-sm)",
        contentVisibility: visible ? "visible" : "auto",
        containIntrinsicSize: "0 320px",
        transitionDelay: `${Math.min(index * 60, 300)}ms`,
        willChange: "transform, opacity",
      }}
    >
      {!visible && !loading ? (
        <SectionSkeleton />
      ) : (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="inline-flex size-6 items-center justify-center rounded-full"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 18%, transparent), color-mix(in srgb, var(--color-accent) 6%, transparent))",
                  }}
                  aria-hidden
                >
                  <Sparkles className="size-3.5 text-[var(--color-accent)]" />
                </span>
                <h2
                  id={headingId}
                  className="truncate text-base font-black tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-lg"
                >
                  {section.title}
                </h2>
              </div>
              <p className="line-clamp-2 text-xs text-[var(--color-text-muted)] sm:text-sm">
                {section.description}
              </p>
            </div>
            <Link
              href={section.viewAllHref}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-accent)] transition-[transform,color] duration-200 hover:scale-[1.02] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
            >
              View All
              <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          <PersonalizedProductRail
            products={section.products}
            sectionId={section.id}
            loading={loading}
          />
        </>
      )}
    </section>
  );
});
