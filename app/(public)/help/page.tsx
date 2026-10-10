import Link from "next/link";
import { SupportAssistant } from "@/components/support/support-assistant";
import { SupportSearch } from "@/components/support/support-search";
import { articlesInCategory, SUPPORT_ARTICLES } from "@/lib/support/articles";
import { SUPPORT_CATEGORIES, SUGGESTED_SEARCHES } from "@/lib/support/types";

export default async function HelpCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const featured = SUPPORT_ARTICLES.slice(0, 6);

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF5A1F]">Support Center</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">How can we help you?</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5563] sm:text-base">
          Search Jimvio help articles, review your own tickets, or contact support. Answers describe the product as it works today.
        </p>
        <div className="mt-6">
          <SupportSearch key={params.q ?? ""} initialQuery={params.q ?? ""} />
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED_SEARCHES.map((suggestion) => (
            <li key={suggestion}>
              <Link
                href={`/help?q=${encodeURIComponent(suggestion)}`}
                className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-[#374151] hover:border-[#FF5A1F]"
              >
                {suggestion}
              </Link>
            </li>
          ))}
        </ul>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">Browse help topics</h2>
          <Link href="/help/articles" className="text-sm font-semibold text-[#FF5A1F]">
            All articles
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SUPPORT_CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link href={category.href} className="block h-full rounded-2xl border border-neutral-200 bg-white p-4 hover:border-[#FF5A1F]">
                <h3 className="font-semibold">{category.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#6B7280]">{category.summary}</p>
                <p className="mt-3 text-xs font-medium text-[#374151]">
                  {articlesInCategory(category.id).length} articles
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <SupportAssistant />

      <section>
        <h2 className="text-xl font-semibold">Popular articles</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {featured.map((article) => (
            <li key={article.slug}>
              <Link href={`/help/articles/${article.slug}`} className="block rounded-2xl border border-neutral-200 bg-white p-4 hover:border-[#FF5A1F]">
                <h3 className="font-semibold">{article.title}</h3>
                <p className="mt-1 text-sm text-[#6B7280]">{article.lead}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/help/tickets" className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold">My support tickets</h2>
          <p className="mt-1 text-sm text-[#6B7280]">View tickets on your account, reply, and follow status changes.</p>
        </Link>
        <Link href="/help/contact" className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold">Contact support</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Create a ticket. Email is available at the address configured for Jimvio.</p>
        </Link>
      </section>
    </div>
  );
}
