import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { HeroCarousel } from "@/components/editorial/hero-carousel";
import { OverlayCard, SectionHeading, StoryCard, StoryImage, toCard } from "@/components/editorial/presentation";
import type { HomeComposition } from "@/lib/editorial/types";

const TRENDING_TOPICS = [
  { label: "Africa Growth", href: "/media/search?q=Africa" },
  { label: "Clean Energy", href: "/media/search?q=clean%20energy" },
  { label: "AI & Innovation", href: "/media/category/technology" },
  { label: "Global Economy", href: "/media/search?q=global%20economy" },
  { label: "Trade & Investment", href: "/media/search?q=trade%20investment" },
  { label: "Climate Action", href: "/media/search?q=climate" },
];

function MostRead({ articles }: { articles: HomeComposition["allStories"] }) {
  if (articles.length === 0) return null;
  return (
    <aside className="media-most-read" aria-labelledby="media-most-read-title">
      <h2 id="media-most-read-title" className="media-side-title"><Flame className="h-5 w-5" /> Most Read</h2>
      <div className="media-most-read-list">
        {articles.slice(0, 5).map((article) => (
          <Link key={article.id} href={`/media/article/${article.slug}`} className="media-most-read-item">
            <span className="media-most-read-image"><StoryImage src={article.imageUrl} alt={article.imageAlt || article.title} sizes="(min-width: 1024px) 116px, 88px" /></span>
            <span className="min-w-0">
              <span className="media-most-read-heading">{article.title}</span>
              <span className="media-most-read-kicker">{article.kicker}</span>
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

export function HomeView({ composition }: { composition: HomeComposition }) {
  const heroes = composition.heroes.slice(0, 3).map((article) => toCard(article, true));
  const featured = composition.featured.slice(0, 2);
  const latest = (composition.latest.length > 0 ? composition.latest : composition.allStories).slice(0, 6);
  const mostRead = [...composition.featured, ...composition.heroes, ...composition.latest, ...composition.magazine, ...composition.guides].filter((article, index, articles) => articles.findIndex((candidate) => candidate.id === article.id) === index).slice(0, 5);
  return (
    <div className="media-home mx-auto max-w-[1440px] px-4 pb-8 pt-3 sm:px-6 lg:px-10 lg:pt-1">
      <h1 className="sr-only">Jimvio Media — stories, ideas and insights</h1>
      <section aria-label="Top stories" className="media-lead-grid">
        {heroes.length > 0 ? <HeroCarousel slides={heroes} /> : null}
        {featured.length > 0 ? (
          <div className="media-top-stories">
            <div className="media-section-head">
              <h2 className="media-side-title"><Flame className="h-6 w-6" /> Top Stories</h2>
              <Link href="/media/latest" className="media-orange-link">View all stories <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-3">
              {featured.map((article) => (
                <OverlayCard key={article.id} card={toCard(article, true)} sizes="(min-width: 1024px) 34vw, 100vw" className="media-top-story-card" titleClassName="line-clamp-2 text-[16px] leading-tight sm:text-[17px]" contentClassName="p-3 sm:p-4" />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <nav className="media-trending" aria-label="Trending topics">
        <span className="media-trending-label"><Flame className="h-5 w-5" /> Trending:</span>
        <div className="media-trending-items">
          {TRENDING_TOPICS.map((topic) => <Link key={topic.label} href={topic.href}>{topic.label}</Link>)}
        </div>
        <Link href="/media/latest" className="media-trending-all">View all trends <ArrowRight className="h-4 w-4" /></Link>
      </nav>

      <div className="media-latest-layout">
        <section className="min-w-0" aria-label="Latest stories">
          <SectionHeading title="Latest Stories" href="/media/latest" />
          {latest.length > 0 ? (
            <div className="media-latest-grid">
              {latest.map((article) => <StoryCard key={article.id} card={toCard(article)} stacked />)}
            </div>
          ) : <p className="text-sm text-[#667085]">No latest stories are available yet.</p>}
        </section>
        <MostRead articles={mostRead} />
      </div>

      {composition.sections.length > 0 ? (
        <section className="mt-10" aria-label="Explore all topics">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[#e9edf2] pb-4">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c94308]">Explore by topic</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-[#172033] sm:text-[28px]">More from the newsroom</h2></div>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {composition.sections.map((section) => (
              <section key={section.slug} aria-labelledby={`topic-${section.slug}`}>
                <div className="mb-3 flex items-center justify-between gap-3"><h3 id={`topic-${section.slug}`} className="text-lg font-bold text-[#172033]">{section.label}</h3><Link href={`/media/category/${section.slug}`} className="text-[12px] font-bold text-[#fd5000] hover:underline">View all <ArrowRight className="inline h-3.5 w-3.5" /></Link></div>
                <div className="grid gap-3">{section.articles.slice(0, 2).map((article) => <StoryCard key={article.id} card={toCard(article)} stacked />)}</div>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
