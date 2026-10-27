import type { Metadata } from "next";
import Link from "next/link";
import { MediaErrorState, PageLinks, SampleBanner, StoryCard, toCard } from "@/components/editorial/presentation";
import { loadCatalog } from "@/lib/editorial/catalog";
import { searchPublishedArticles } from "@/lib/editorial/compose";
import { MEDIA_CATEGORIES } from "@/lib/editorial/types";
import { isMediaCategory, paginate, parsePage, PUBLIC_PAGE_SIZE } from "@/lib/editorial/validate";
import { getSiteUrl } from "@/lib/site-url";

const searchCanonical = `${getSiteUrl()}/media/search`;

export const metadata: Metadata = {
  title: "Search",
  description: "Search published Jimvio Media stories.",
  robots: { index: false, follow: true },
  alternates: { canonical: searchCanonical },
  openGraph: {
    title: "Search",
    description: "Search published Jimvio Media stories.",
    url: searchCanonical,
    siteName: "Jimvio Media",
    locale: "en_US",
    type: "website",
  },
};

function searchHref(query: string, page: number, category: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/media/search?${qs}` : "/media/search";
}

export default async function MediaSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>;
}) {
  const { q = "", page, category: categoryParam = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const category = isMediaCategory(categoryParam) ? categoryParam : "";
  const catalog = await loadCatalog();
  if (!catalog.usingFixtures && catalog.unavailable) return <MediaErrorState />;
  const matched = query.length >= 2 ? searchPublishedArticles(catalog.articles, query, category) : [];
  const listing = paginate(matched, parsePage(page), PUBLIC_PAGE_SIZE);
  const results = listing.items;

  return (
    <>
      {catalog.usingFixtures ? <SampleBanner /> : null}
      <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#172033]">Search</h1>
        <form action="/media/search" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-sm font-semibold text-[#172033]">
            <span className="sr-only">Search stories</span>
            <input
              name="q"
              defaultValue={query}
              placeholder="Search for news, articles, guides, reviews..."
              className="h-11 w-full rounded-full border border-[#e6e8ee] bg-[#f7f8fa] px-4 text-sm outline-none focus:border-[#fd5000] focus:bg-white"
            />
          </label>
          <label className="text-sm font-semibold text-[#172033]">
            Section
            <select
              name="category"
              defaultValue={category}
              className="mt-1 block h-11 rounded-full border border-[#e6e8ee] bg-white px-3 text-sm outline-none focus:border-[#fd5000]"
            >
              <option value="">All sections</option>
              {MEDIA_CATEGORIES.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-11 rounded-full bg-[#172033] px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
          >
            Search
          </button>
        </form>
        {query.length < 2 ? (
          <p className="mt-8 text-sm text-[#667085]">Enter at least two characters.</p>
        ) : results.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[#e6e8ee] px-6 py-12 text-center">
            <h2 className="text-lg font-bold text-[#172033]">No matching stories</h2>
            <p className="mt-2 text-sm text-[#667085]">Try another phrase, or browse a section.</p>
            <Link href="/media" className="mt-4 inline-flex text-sm font-semibold text-[#fd5000]">
              Back to Media
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            <p className="text-sm text-[#667085]">
              Showing {listing.from}–{listing.to} of {listing.total} {listing.total === 1 ? "story" : "stories"}
            </p>
            {results.map((article) => (
              <StoryCard key={article.id} card={toCard(article)} />
            ))}
            <PageLinks page={listing.page} pages={listing.pages} label="Search pages" hrefFor={(next) => searchHref(query, next, category)} />
          </div>
        )}
      </div>
    </>
  );
}
