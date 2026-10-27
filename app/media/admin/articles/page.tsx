import Link from "next/link";
import { adminListArticles } from "@/lib/editorial/admin-store";
import { ArticleTable } from "@/components/editorial/admin/article-table";
import { StorageNotice } from "@/components/editorial/admin/notice";
import { PageLinks } from "@/components/editorial/presentation";
import { MEDIA_STATUSES, type MediaStatus } from "@/lib/editorial/types";
import { ADMIN_PAGE_SIZE, isMediaStatus, paginate, parsePage } from "@/lib/editorial/validate";
import { statusLabel } from "@/lib/editorial/status";

const TABS = ["all", ...MEDIA_STATUSES] as const;

function adminHref(status: string, query: string, page: number) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/media/admin/articles?${qs}` : "/media/admin/articles";
}

export default async function MediaArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status = "all", q = "", page } = await searchParams;
  const selected = status === "all" || isMediaStatus(status) ? status : "all";
  const query = q.trim().toLowerCase();
  const list = await adminListArticles();
  const counts = {
    all: list.articles.length,
    ...Object.fromEntries(MEDIA_STATUSES.map((item) => [item, list.articles.filter((article) => article.status === item).length])),
  } as Record<string, number>;
  const matched = list.articles.filter((article) => {
    if (selected !== "all" && article.status !== (selected as MediaStatus)) return false;
    if (!query) return true;
    return `${article.title} ${article.excerpt} ${article.category}`.toLowerCase().includes(query);
  });
  const listing = paginate(matched, parsePage(page), ADMIN_PAGE_SIZE);
  const articles = listing.items;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em]">Articles</h1>
          <p className="mt-1 text-sm text-[#667085]">Create, edit and publish articles</p>
        </div>
        <Link href="/media/admin/articles/new" className="inline-flex h-10 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">
          + New Article
        </Link>
      </div>
      {list.failed ? <div className="mt-4"><StorageNotice failed={!list.unavailable} /></div> : null}
      <div className="mt-5 flex gap-5 overflow-x-auto border-b border-[#eceff3] text-sm font-semibold">
        {TABS.map((tab) => {
          const active = selected === tab;
          const label = tab === "all" ? "All" : statusLabel(tab);
          return (
            <Link key={tab} href={adminHref(tab, query, 1)} className={`shrink-0 border-b-2 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000] ${active ? "border-[#fd5000] text-[#fd5000]" : "border-transparent text-[#667085]"}`}>
              {label} ({counts[tab] ?? 0})
            </Link>
          );
        })}
      </div>
      <form action="/media/admin/articles" className="mt-4">
        {selected !== "all" ? <input type="hidden" name="status" value={selected} /> : null}
        <label className="block">
          <span className="sr-only">Search articles</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search articles..."
            className="h-11 w-full rounded-xl border border-[#e6e8ee] bg-white px-4 text-sm outline-none focus:border-[#fd5000]"
          />
        </label>
      </form>
      {list.articles.length >= 500 ? (
        <p className="mt-3 text-sm text-[#667085]">Showing the 500 most recently updated articles.</p>
      ) : null}
      <div className="mt-4">
        {listing.total > 0 ? (
          <p className="mb-3 text-sm text-[#667085]">
            Showing {listing.from}–{listing.to} of {listing.total}
          </p>
        ) : null}
        <ArticleTable articles={articles} />
        <PageLinks
          page={listing.page}
          pages={listing.pages}
          label="Article pages"
          hrefFor={(next) => adminHref(selected, query, next)}
        />
      </div>
    </div>
  );
}
