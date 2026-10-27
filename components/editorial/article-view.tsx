import Link from "next/link";
import { SampleBanner, StoryCard, StoryImage, toCard } from "@/components/editorial/presentation";
import { ShareStory } from "@/components/editorial/share-story";
import styles from "@/components/editorial/editorial.module.css";
import { publicCorrection, publicSource, readingMinutes, showUpdated } from "@/lib/editorial/discover";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import type { PublicArticle } from "@/lib/editorial/types";
import { categoryLabel, publicAuthorName } from "@/lib/editorial/validate";

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
  const html = sanitizeArticleHtml(article.bodyHtml);
  const author = publicAuthorName(article.authorName);
  const kicker = (article.kicker || article.category).toUpperCase();
  const label = categoryLabel(article.category);
  const minutes = readingMinutes(html);
  const updated = showUpdated(article.publishedAt, article.updatedAt);
  const source = publicSource(article);
  const correction = publicCorrection(article.correctionNote);
  const neighbors = previous || next;

  return (
    <>
      {article.fixture ? <SampleBanner /> : null}
      <article lang="en" className="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-[#667085]">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link
                href="/media"
                className="font-semibold text-[#3b5ccc] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
              >
                Media
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/media/category/${article.category}`}
                className="font-semibold text-[#3b5ccc] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
              >
                {label}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[#172033]">
              {article.title}
            </li>
          </ol>
        </nav>
        <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#fd5000]">{kicker}</p>
        <h1 className="mt-3 text-[34px] font-bold leading-[1.15] tracking-[-0.03em] text-[#141820] sm:text-[42px]">
          {article.title}
        </h1>
        {article.excerpt ? <p className="mt-4 text-lg leading-relaxed text-[#4b5568]">{article.excerpt}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#667085]">
            {author ? <span>{author}</span> : null}
            {author && (article.publishedAt || minutes > 0) ? <span aria-hidden="true"> · </span> : null}
            {article.publishedAt ? (
              <time dateTime={article.publishedAt}>Published {formatDate(article.publishedAt)}</time>
            ) : null}
            {updated && article.updatedAt ? (
              <>
                <span aria-hidden="true"> · </span>
                <time dateTime={article.updatedAt}>Updated {formatDate(article.updatedAt)}</time>
              </>
            ) : null}
            {minutes > 0 ? (
              <>
                {(author || article.publishedAt || updated) ? <span aria-hidden="true"> · </span> : null}
                <span>{minutes} min read</span>
              </>
            ) : null}
            {!author && !article.publishedAt && article.fixture ? <span>Design fixture</span> : null}
          </p>
          {shareUrl ? <ShareStory title={article.title} url={shareUrl} /> : null}
        </div>
        {correction ? (
          <p className="mt-4 rounded-xl border border-[#eceff3] bg-[#fafbfc] px-4 py-3 text-sm leading-relaxed text-[#475467]">
            <span className="font-semibold text-[#172033]">Update. </span>
            {correction}
          </p>
        ) : null}
        {article.imageUrl ? (
          <figure className="mt-6">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#f4f5f7]">
              <StoryImage
                src={article.imageUrl}
                alt={article.imageAlt || article.title}
                priority
                sizes="(min-width: 760px) 760px, 100vw"
              />
            </div>
            {source ? (
              <figcaption className="mt-2 text-sm text-[#667085]">
                {source.url ? (
                  <a
                    href={source.url}
                    rel="noopener noreferrer"
                    className="font-semibold text-[#3b5ccc] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
                  >
                    Source: {source.name}
                  </a>
                ) : (
                  <>Source: {source.name}</>
                )}
              </figcaption>
            ) : null}
          </figure>
        ) : source ? (
          <p className="mt-4 text-sm text-[#667085]">
            {source.url ? (
              <a
                href={source.url}
                rel="noopener noreferrer"
                className="font-semibold text-[#3b5ccc] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
              >
                Source: {source.name}
              </a>
            ) : (
              <>Source: {source.name}</>
            )}
          </p>
        ) : null}
        <div className={`${styles.body} mt-8 text-[17px] text-[#1c2430]`} dangerouslySetInnerHTML={{ __html: html }} />
        <p className="mt-10 text-sm text-[#667085]">
          Filed in{" "}
          <Link
            href={`/media/category/${article.category}`}
            className="font-semibold text-[#fd5000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
          >
            {label}
          </Link>
        </p>
        {neighbors ? (
          <nav aria-label={`More in ${label}`} className="mt-8 grid gap-3 border-t border-[#eceff3] pt-6 sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/media/article/${previous.slug}`}
                className="rounded-xl border border-[#eceff3] px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
              >
                <span className="block text-xs font-semibold uppercase tracking-wide text-[#667085]">Previous story</span>
                <span className="mt-1 block font-semibold text-[#172033]">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/media/article/${next.slug}`}
                className="rounded-xl border border-[#eceff3] px-4 py-3 text-sm sm:text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
              >
                <span className="block text-xs font-semibold uppercase tracking-wide text-[#667085]">Next story</span>
                <span className="mt-1 block font-semibold text-[#172033]">{next.title}</span>
              </Link>
            ) : null}
          </nav>
        ) : null}
      </article>
      {related.length > 0 ? (
        <section className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-6">
          <h2 className="mb-4 text-lg font-bold text-[#172033]">Related stories</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {related.map((item) => (
              <StoryCard key={item.id} card={toCard(item)} stacked />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
