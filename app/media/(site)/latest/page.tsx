import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MediaErrorState, PageLinks, SampleBanner, StoryCard, toCard } from "@/components/editorial/presentation";
import { loadCatalog } from "@/lib/editorial/catalog";
import { MEDIA_CATEGORIES } from "@/lib/editorial/types";
import { isMediaCategory, paginate, parsePage, PUBLIC_PAGE_SIZE } from "@/lib/editorial/validate";
import { getSiteUrl } from "@/lib/site-url";

const canonical = `${getSiteUrl()}/media/latest`;

export const metadata: Metadata = {
  title: "Latest Stories",
  description: "Browse the latest published reporting, ideas, analysis and practical guides from Jimvio Media.",
  alternates: { canonical },
  openGraph: {
    title: "Latest Stories | Jimvio Media",
    description: "The latest published reporting, ideas, analysis and practical guides from Jimvio Media.",
    url: canonical,
    siteName: "Jimvio Media",
    locale: "en_US",
    type: "website",
  },
};

function latestHref(page: number, category: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/media/latest?${query}` : "/media/latest";
}

export default async function LatestMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const { page, category: categoryParam = "" } = await searchParams;
  const category = isMediaCategory(categoryParam) ? categoryParam : "";
  const catalog = await loadCatalog();
  if (!catalog.usingFixtures && catalog.unavailable) return <MediaErrorState />;

  const articles = category
    ? catalog.articles.filter((article) => article.category === category)
    : catalog.articles;
  const listing = paginate(articles, parsePage(page), PUBLIC_PAGE_SIZE);

  return (
    <>
      {catalog.usingFixtures ? <SampleBanner /> : null}
      <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-7 text-[13px] text-[#667085]">
          <ol className="flex items-center gap-2">
            <li><Link href="/media" className="font-semibold text-[#475467] hover:text-[#c94308] hover:underline">Media</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-[#344054]">Latest stories</li>
          </ol>
        </nav>

        <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-[#e9edf2] pb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c94308]">The newsroom, in real time</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#111827] sm:text-[2.6rem]">Latest stories</h1>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-[#667085]">The newest published stories across every Jimvio Media section, with more to explore as our newsroom grows.</p>
          </div>
          <form action="/media/latest" className="flex items-end gap-2">
            <label className="text-xs font-semibold text-[#475467]">
              <span className="mb-1 block">Filter by section</span>
              <select name="category" defaultValue={category} className="h-10 min-w-[160px] rounded-full border border-[#e4e7ec] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#fd5000]">
                <option value="">All sections</option>
                {MEDIA_CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
              </select>
            </label>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#172033] px-4 text-sm font-semibold text-white transition hover:bg-[#29364b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]">
              Apply <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </header>

        {listing.items.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listing.items.map((article) => <StoryCard key={article.id} card={toCard(article)} stacked />)}
            </div>
            <PageLinks page={listing.page} pages={listing.pages} label="Latest stories pages" hrefFor={(next) => latestHref(next, category)} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e4e7ec] px-6 py-16 text-center">
            <h2 className="text-lg font-bold text-[#172033]">No stories in this section yet</h2>
            <p className="mt-2 text-sm text-[#667085]">Choose another section or return to the full newsroom.</p>
            <Link href="/media/latest" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#c94308] hover:underline">
              Browse all latest stories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
