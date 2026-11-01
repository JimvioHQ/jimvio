import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { HeroCarousel } from "@/components/editorial/hero-carousel";
import { TopicExplore } from "@/components/editorial/topic-explore";
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

function uniqueArticles<T extends { id: string }>(articles: T[], limit: number, excluded: Set<string> = new Set()) {
  const seen = new Set(excluded);
  const result: T[] = [];
  for (const article of articles) {
    if (seen.has(article.id)) continue;
    seen.add(article.id);
    result.push(article);
    if (result.length >= limit) break;
  }
  return result;
}

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
  // Always build a complete lead area from real published stories. Empty hero or
  // featured collections must never leave an unused grid column on desktop.
  const storyPool = uniqueArticles([
    ...composition.heroes,
    ...composition.featured,
    ...composition.latest,
    ...composition.allStories,
    ...composition.magazine,
    ...composition.guides,
    ...composition.sections.flatMap((section) => section.articles),
  ], 100);
  const heroArticles = composition.heroes.length > 0
    ? composition.heroes.slice(0, 3)
    : storyPool.slice(0, 1);
  const heroIds = new Set(heroArticles.map((article) => article.id));
  const featured = uniqueArticles([
    ...composition.featured,
    ...composition.latest,
    ...composition.allStories,
    ...composition.magazine,
    ...composition.guides,
  ], 2, heroIds);
  const heroes = heroArticles.map((article) => toCard(article, true));
  const usedLeadIds = new Set([...heroIds, ...featured.map((article) => article.id)]);
  const latest = uniqueArticles([
    ...composition.latest,
    ...composition.allStories,
    ...composition.featured,
    ...composition.magazine,
    ...composition.guides,
    ...composition.sections.flatMap((section) => section.articles),
  ], 6, usedLeadIds);
  const mostRead = uniqueArticles([
    ...composition.featured,
    ...composition.heroes,
    ...composition.latest,
    ...composition.allStories,
    ...composition.magazine,
    ...composition.guides,
  ], 5);
  const sections = composition.sections.filter((section) => section.articles.length > 0);

  return (
    <div className="media-home mx-auto max-w-[1440px] px-4 pb-8 pt-3 sm:px-6 lg:px-10 lg:pt-1">
      <h1 className="sr-only">Jimvio Media — stories, ideas and insights</h1>

      {heroes.length > 0 || featured.length > 0 ? (
        <section aria-label="Top stories" className={`media-lead-grid ${heroes.length > 0 ? "has-hero" : ""} ${featured.length > 0 ? "has-featured" : ""}`}>
          {heroes.length > 0 ? <HeroCarousel slides={heroes} /> : null}
          {featured.length > 0 ? (
            <div className="media-top-stories">
              <div className="media-section-head">
                <h2 className="media-side-title"><Flame className="h-6 w-6" /> Top Stories</h2>
                <Link href="/media/latest" className="media-orange-link">View all stories <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="media-top-stories-grid">
                {featured.map((article) => (
                  <OverlayCard key={article.id} card={toCard(article, true)} sizes="(min-width: 1024px) 34vw, 100vw" className="media-top-story-card" titleClassName="line-clamp-2 text-[16px] leading-tight sm:text-[17px]" contentClassName="p-3 sm:p-4" />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <nav className="media-trending" aria-label="Trending topics">
        <span className="media-trending-label"><Flame className="h-5 w-5" /> Trending:</span>
        <div className="media-trending-items">
          {TRENDING_TOPICS.map((topic) => <Link key={topic.label} href={topic.href}>{topic.label}</Link>)}
        </div>
        <Link href="/media/latest" className="media-trending-all">View all trends <ArrowRight className="h-4 w-4" /></Link>
      </nav>

      <div className={`media-latest-layout ${mostRead.length > 0 ? "has-most-read" : ""}`}>
        <section className="min-w-0" aria-label="Latest stories">
          <SectionHeading title="Latest Stories" href="/media/latest" />
          {latest.length > 0 ? (
            <div className="media-latest-grid">
              {latest.map((article) => <StoryCard key={article.id} card={toCard(article)} stacked />)}
            </div>
          ) : <p className="text-sm text-[#667085]">New stories will appear here as they are published.</p>}
        </section>
        <MostRead articles={mostRead} />
      </div>

      <TopicExplore sections={sections} />

    </div>
  );
}
