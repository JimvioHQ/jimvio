import { HeroCarousel } from "@/components/editorial/hero-carousel";
import { OverlayCard, SectionHeading, StoryCard, toCard } from "@/components/editorial/presentation";
import type { HomeComposition } from "@/lib/editorial/types";

export function HomeView({ composition }: { composition: HomeComposition }) {
  const heroes = composition.heroes.map((article) => toCard(article, true));
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 sm:py-6">
      <h1 className="sr-only">Jimvio Media</h1>
      {heroes.length > 0 || composition.featured.length > 0 ? (
        <section className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.42fr)_minmax(280px,0.92fr)]">
          {heroes.length > 0 ? <HeroCarousel slides={heroes} /> : <div />}
          {composition.featured.length > 0 ? (
            <div className="grid h-full gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-3">
              {composition.featured.map((article) => (
                <OverlayCard
                  key={article.id}
                  card={toCard(article)}
                  sizes="(min-width: 1024px) 34vw, 50vw"
                  className="h-full min-h-[180px]"
                  titleClassName="line-clamp-2 text-[16px] sm:text-[17px]"
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {composition.latest.length > 0 ? (
        <section className="mt-9">
          <SectionHeading title="Latest News" href="/media/category/news" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {composition.latest.map((article) => (
              <StoryCard key={article.id} card={toCard(article)} />
            ))}
          </div>
        </section>
      ) : null}

      {composition.magazine.length > 0 || composition.guides.length > 0 ? (
        <div className="mt-10 grid gap-10 xl:grid-cols-2">
          {composition.magazine.length > 0 ? (
            <section>
              <SectionHeading title="From the Magazine" href="/media/category/magazine" />
              <div className="grid gap-3 sm:grid-cols-3">
                {composition.magazine.map((article) => (
                  <StoryCard key={article.id} card={toCard(article)} stacked />
                ))}
              </div>
            </section>
          ) : null}
          {composition.guides.length > 0 ? (
            <section>
              <SectionHeading title="Popular Guides" href="/media/category/guides" />
              <div className="grid gap-3 sm:grid-cols-3">
                {composition.guides.map((article) => (
                  <StoryCard key={article.id} card={toCard(article)} stacked />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
