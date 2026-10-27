import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/editorial/json-ld";
import { MediaErrorState, PageLinks, SampleBanner, StoryCard, toCard } from "@/components/editorial/presentation";
import { loadCatalog } from "@/lib/editorial/catalog";
import { articlesInCategory } from "@/lib/editorial/compose";
import { breadcrumbJsonLd } from "@/lib/editorial/discover";
import { MEDIA_CATEGORIES } from "@/lib/editorial/types";
import { getSiteUrl } from "@/lib/site-url";
import { categoryLabel, isMediaCategory, paginate, parsePage, PUBLIC_PAGE_SIZE } from "@/lib/editorial/validate";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await searchParams;
  if (!isMediaCategory(slug)) return { title: "Section", robots: { index: false, follow: false } };
  const catalog = await loadCatalog();
  const blocked = catalog.usingFixtures || catalog.unavailable;
  const label = categoryLabel(slug);
  const pageNumber = parsePage(page);
  const site = getSiteUrl();
  const description = `${label} stories on Jimvio Media.`;
  const canonical = pageNumber > 1 ? `${site}/media/category/${slug}?page=${pageNumber}` : `${site}/media/category/${slug}`;
  const title = pageNumber > 1 ? `${label}, page ${pageNumber}` : label;
  return {
    title,
    description,
    alternates: { canonical },
    robots: blocked ? { index: false, follow: false } : pageNumber > 1 ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: label,
      description,
      url: canonical,
      type: "website",
      siteName: "Jimvio Media",
      locale: "en_US",
    },
  };
}

export function generateStaticParams() {
  return MEDIA_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export default async function MediaCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  if (!isMediaCategory(slug)) notFound();
  const catalog = await loadCatalog();
  if (!catalog.usingFixtures && catalog.unavailable) return <MediaErrorState />;
  const matched = articlesInCategory(catalog.articles, slug);
  const listing = paginate(matched, parsePage(page), PUBLIC_PAGE_SIZE);
  const articles = listing.items;
  const label = categoryLabel(slug);
  const site = getSiteUrl();
  const crumbs = catalog.usingFixtures
    ? null
    : breadcrumbJsonLd(site, [
        { name: "Media", path: "/media" },
        { name: label, path: `/media/category/${slug}` },
      ]);

  return (
    <>
      <JsonLd data={crumbs} />
      {catalog.usingFixtures ? <SampleBanner /> : null}
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
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
            <li aria-current="page" className="text-[#172033]">
              {label}
            </li>
          </ol>
        </nav>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#172033]">{label}</h1>
        {articles.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#e6e8ee] px-6 py-16 text-center">
            <h2 className="text-lg font-bold text-[#172033]">No stories in {label} yet</h2>
            <p className="mt-2 text-sm text-[#667085]">Published articles in this section will appear here.</p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-[#667085]">
              Showing {listing.from}–{listing.to} of {listing.total}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <StoryCard key={article.id} card={toCard(article)} stacked />
              ))}
            </div>
            <PageLinks
              page={listing.page}
              pages={listing.pages}
              label={`${label} pages`}
              hrefFor={(next) => (next <= 1 ? `/media/category/${slug}` : `/media/category/${slug}?page=${next}`)}
            />
          </>
        )}
      </div>
    </>
  );
}
