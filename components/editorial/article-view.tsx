import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { Kicker, SampleBanner, StoryCard, StoryImage, toCard } from "@/components/editorial/presentation";
import { ShareStory } from "@/components/editorial/share-story";
import styles from "@/components/editorial/editorial.module.css";
import { splitHeroCaption } from "@/lib/editorial/caption";
import { publicCorrection, publicSource, readingMinutes } from "@/lib/editorial/discover";
import { editorialPhotoSrc } from "@/lib/editorial/image-display";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import type { PublicArticle } from "@/lib/editorial/types";
import { categoryLabel, displayKicker } from "@/lib/editorial/validate";

function formatDate(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(time),
  );
}

export function ArticleView({
  article,
  related,
  previous = null,
  next = null,
  shareUrl = null,
}: {
  article: PublicArticle;
  related: PublicArticle[];
  previous?: PublicArticle | null;
  next?: PublicArticle | null;
  shareUrl?: string | null;
}) {
  const story = splitHeroCaption(article.bodyHtml, article.title);
  const html = sanitizeArticleHtml(story.bodyHtml);
  const label = categoryLabel(article.category);
  const minutes = readingMinutes(html);
  const photo = editorialPhotoSrc(article.imageUrl);
  const correction = publicCorrection(article.correctionNote);
  const source = publicSource(article);
  const neighbors = previous || next;

  return (
    <>
      {article.fixture ? <SampleBanner /> : null}
      <article lang="en" className="mx-auto max-w-[1240px] px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-[#667085]">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li><Link href="/media" className="font-semibold text-[#475467] hover:text-[#c94308] hover:underline">Media</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href={`/media/category/${article.category}`} className="font-semibold text-[#475467] hover:text-[#c94308] hover:underline">{label}</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="max-w-[min(52vw,520px)] truncate text-[#667085]">{article.title}</li>
          </ol>
        </nav>

        <header className="mx-auto max-w-[940px]">
          <Kicker label={displayKicker(article)} />
          <h1 className={`${styles.display} mt-4 max-w-[20ch] text-[2.25rem] leading-[1.08] tracking-[-0.045em] text-[#111827] sm:text-[3rem] lg:text-[3.75rem]`}>
            {article.title}
          </h1>
          {article.excerpt ? <p className="mt-5 max-w-[70ch] text-[17px] leading-[1.7] text-[#475467] sm:text-[19px]">{article.excerpt}</p> : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-[#e9edf2] py-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#667085]">
              {article.publishedAt ? <time dateTime={article.publishedAt} className="font-medium text-[#344054]">Published {formatDate(article.publishedAt)}</time> : article.fixture ? <span>Design preview</span> : null}
              {minutes > 0 ? <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {minutes} min read</span> : null}
              <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 font-semibold text-[#475467]">{label}</span>
            </div>
            {shareUrl ? <ShareStory title={article.title} url={shareUrl} /> : null}
          </div>
          {article.authorName || source ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#667085]">
              {article.authorName ? (
                <p>
                  <span className="font-medium text-[#667085]">By </span>
                  <span className="font-semibold text-[#344054]">{article.authorName}</span>
                </p>
              ) : null}
              {source ? (
                <p>
                  <span className="font-medium text-[#667085]">Source: </span>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#344054] underline decoration-[#d0d5dd] underline-offset-4 hover:text-[#c94308]">
                      {source.name}
                    </a>
                  ) : (
                    <span className="font-semibold text-[#344054]">{source.name}</span>
                  )}
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        {photo ? (
          <figure className="mx-auto mt-7 max-w-[1040px]">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[18px] bg-[#f2f4f7] shadow-[0_12px_36px_rgba(16,24,40,0.08)] sm:rounded-[24px]">
              <StoryImage src={photo} alt={article.imageAlt || article.title} priority sizes="(min-width: 1200px) 1080px, 100vw" />
            </div>
            {story.caption ? <figcaption className="mx-auto mt-3 max-w-[80ch] text-center text-[12px] leading-relaxed text-[#667085]">{story.caption}</figcaption> : null}
          </figure>
        ) : null}

        {correction ? (
          <p className="mx-auto mt-7 max-w-[820px] rounded-xl border border-[#f4d7b5] bg-[#fffaf5] px-4 py-3 text-sm leading-relaxed text-[#7a3d13]">
            <span className="font-bold">Correction / update. </span>{correction}
          </p>
        ) : null}

        <div className="mx-auto mt-8 grid max-w-[1120px] items-start gap-8 lg:grid-cols-[minmax(0,740px)_minmax(240px,280px)] lg:gap-10">
          <div>
            <div id="story-content" className={`${styles.body} max-w-[72ch] text-[1.125rem] sm:text-[1.2rem]`} dangerouslySetInnerHTML={{ __html: html }} />
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#e9edf2] pt-5">
              <Link href={`/media/category/${article.category}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#c94308] hover:underline">
                More in {label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/media" className="inline-flex items-center gap-2 text-sm font-semibold text-[#475467] hover:text-[#c94308]">
                <ArrowLeft className="h-4 w-4" /> Back to Media
              </Link>
            </div>
            {neighbors ? (
              <nav aria-label={`More in ${label}`} className="mt-8 grid gap-3 border-t border-[#e9edf2] pt-6 sm:grid-cols-2">
                {previous ? (
                  <Link href={`/media/article/${previous.slug}`} className="rounded-xl border border-[#e9edf2] p-4 transition hover:border-[#d0d5dd] hover:bg-[#fafbfc]">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#667085]">Previous story</span>
                    <span className="mt-2 block text-sm font-bold leading-snug text-[#172033]">{previous.title}</span>
                  </Link>
                ) : <span />}
                {next ? (
                  <Link href={`/media/article/${next.slug}`} className="rounded-xl border border-[#e9edf2] p-4 text-left transition hover:border-[#d0d5dd] hover:bg-[#fafbfc] sm:text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#667085]">Next story</span>
                    <span className="mt-2 block text-sm font-bold leading-snug text-[#172033]">{next.title}</span>
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24">
            {related.length > 0 ? (
              <section aria-labelledby="related-stories">
                <div className="mb-4 border-b border-[#e9edf2] pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c94308]">Keep exploring</p>
                  <h2 id="related-stories" className="mt-1 text-lg font-bold tracking-[-0.025em] text-[#172033]">More to read</h2>
                </div>
                <div className="grid gap-3">
                  {related.map((item) => <StoryCard key={item.id} card={toCard(item)} stacked />)}
                </div>
              </section>
            ) : (
              <div className="rounded-2xl border border-[#e9edf2] bg-[#fafbfc] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c94308]">Jimvio Media</p>
                <p className="mt-2 text-sm leading-relaxed text-[#667085]">Explore more reporting and ideas across our newsroom.</p>
                <Link href="/media" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#c94308]">Browse stories <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
          </aside>
        </div>
      </article>
    </>
  );
}
