"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, Compass } from "lucide-react";
import Link from "next/link";
import { StoryCard, toCard } from "@/components/editorial/presentation";
import type { HomeSection } from "@/lib/editorial/types";

export function TopicExplore({ sections }: { sections: HomeSection[] }) {
  const [visibleCount, setVisibleCount] = useState(3);
  if (sections.length === 0) return null;

  const visibleSections = sections.slice(0, visibleCount);
  const hasMore = visibleCount < sections.length;

  return (
    <section className="media-topic-explore" aria-label="Explore all topics">
      <div className="media-topic-heading">
        <div className="min-w-0">
          <p className="media-topic-eyebrow"><Compass className="h-3.5 w-3.5" /> Explore by topic</p>
          <h2 className="media-topic-title">More from the newsroom</h2>
          <p className="media-topic-description">Explore the latest reporting, ideas and analysis across our coverage.</p>
        </div>
        <Link href="/media/latest" className="media-topic-all">
          Explore all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="media-topic-grid" aria-live="polite">
        {visibleSections.map((section) => (
          <section key={section.slug} className="media-topic-section" aria-labelledby={`topic-${section.slug}`}>
            <div className="media-topic-section-head">
              <h3 id={`topic-${section.slug}`}>{section.label}</h3>
              <Link href={`/media/category/${section.slug}`} aria-label={`Explore all ${section.label} stories`}>
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="media-topic-cards">
              {section.articles.slice(0, 2).map((article) => (
                <StoryCard key={article.id} card={toCard(article)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {hasMore ? (
        <div className="media-topic-more-wrap">
          <button
            type="button"
            className="media-topic-more"
            onClick={() => setVisibleCount((count) => Math.min(count + 3, sections.length))}
          >
            Explore more topics <ChevronDown className="h-4 w-4" />
          </button>
          <span className="media-topic-count">Showing {visibleSections.length} of {sections.length} topics</span>
        </div>
      ) : (
        <div className="media-topic-more-wrap">
          <Link href="/media/latest" className="media-topic-more">
            Explore all stories <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="media-topic-count">You’re all caught up</span>
        </div>
      )}
    </section>
  );
}
