import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { HeroCarousel } from "@/components/editorial/hero-carousel";
import { OverlayCard, SectionHeading, StoryCard, toCard } from "@/components/editorial/presentation";
import type { HomeComposition } from "@/lib/editorial/types";

export function HomeView({ composition }: { composition: HomeComposition }) {
  const heroes = composition.heroes.map((article) => toCard(article, true));
  const featured = composition.featured.slice(0, 2);
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf2] pb-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c94308]">
            <Sparkles className="h-3.5 w-3.5" /> Independent perspective
          </p>
          <p className="mt-1 text-sm text-[#667085]">Stories, ideas and insights shaping what comes next.</p>
        </div>
        <Link href="/media/search" className="inline-flex items-center gap-2 text-sm font-semibold text-[#344054] transition hover:text-[#c94308]">
          Explore the newsroom <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <h1 className="sr-only">Jimvio Media — stories, ideas and insights</h1>
      {heroes.length > 0 || featured.length > 0 ? (
        <section aria-label="Top stories" className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
          {heroes.length > 0 ? <HeroCarousel slides={heroes} /> : null}
          {featured.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {featured.map((article) => (
                <OverlayCard
                  key={article.id}
                  card={toCard(article, true)}
                  sizes="(min-width: 1024px) 32vw, 50vw"
                  className="min-h-[220px] lg:min-h-0"
                  titleClassName="line-clamp-2 text-[17px] sm:text-[19px]"
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {composition.allStories.length > 0 ? (
        <section className="mt-12">
          <SectionHeading title="Latest stories" href="/media/latest" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {composition.allStories.map((article) => (
              <StoryCard key={article.id} card={toCard(article)} stacked />
            ))}
          </div>
        </section>
      ) : null}

      {composition.sections.length > 0 ? (
        <section className="mt-14" aria-label="Explore all topics">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#e9edf2] pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c94308]">Explore by topic</p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-[#172033] sm:text-[28px]">More from the newsroom</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#667085]">A clear view of the latest reporting, ideas and practical guides across Jimvio Media.</p>
            </div>
          </div>
          <div className="space-y-11">
            {composition.sections.map((section) => (
              <section key={section.slug} aria-labelledby={`topic-${section.slug}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 id={`topic-${section.slug}`} className="text-lg font-bold tracking-[-0.02em] text-[#172033]">{section.label}</h3>
                  <Link href={`/media/category/${section.slug}`} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-[#c94308] hover:underline">
                    View all {section.label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.articles.map((article) => (
                    <StoryCard key={article.id} card={toCard(article)} stacked />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
