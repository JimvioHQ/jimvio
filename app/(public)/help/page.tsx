import Link from "next/link";
import {
  Boxes,
  CreditCard,
  Lock,
  Megaphone,
  Package,
  Radio,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import { OpenSupportChat } from "@/components/support/open-support-chat";
import { SupportSearch } from "@/components/support/support-search";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import { articlesInCategory } from "@/lib/support/articles";
import { SUPPORT_CATEGORIES, SUGGESTED_SEARCHES, type SupportCategoryId } from "@/lib/support/types";

const TOPIC_ICONS: Record<SupportCategoryId, typeof Lock> = {
  "account-security": Lock,
  payments: CreditCard,
  marketplace: ShoppingCart,
  selling: Store,
  dropshipping: Package,
  affiliate: Users,
  creators: Video,
  ugc: Video,
  campaigns: Megaphone,
  communities: Users,
  live: Radio,
  digital: Boxes,
  orders: Truck,
  ai: Sparkles,
  technical: Wrench,
};

export default async function HelpCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF5A1F]">Support Center</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">How can we help you?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5563] sm:text-base">
              Search Jimvio help articles, ask the assistant, or talk with support. Article answers describe the product as it works today.
            </p>
            <div className="mt-6">
              <SupportSearch key={params.q ?? ""} initialQuery={params.q ?? ""} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {SUGGESTED_SEARCHES.map((suggestion) => (
                <li key={suggestion}>
                  <Link
                    href={`/help?q=${encodeURIComponent(suggestion)}`}
                    className="inline-block rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:border-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                  >
                    {suggestion}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden w-40 shrink-0 lg:block">
            <JimvioAIMascot size="sm" motionless />
          </div>
        </div>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">Browse help topics</h2>
          <Link href="/help/articles" className="text-sm font-semibold text-[#FF5A1F]">
            All articles
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SUPPORT_CATEGORIES.map((category) => {
            const Icon = TOPIC_ICONS[category.id];
            const count = articlesInCategory(category.id).length;
            return (
              <li key={category.id}>
                <Link
                  href={category.href}
                  className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF1EA] text-[#FF5A1F]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="mt-3 font-semibold">{category.title}</h3>
                  <p className="mt-1 flex-1 text-sm leading-6 text-[#6B7280]">{category.summary}</p>
                  <p className="mt-3 text-xs font-semibold text-[#FF5A1F]">
                    {count} {count === 1 ? "article" : "articles"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <OpenSupportChat />
        <Link href="/help/tickets" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-[#FF5A1F]">
          <h2 className="font-semibold">My tickets</h2>
          <p className="mt-1 text-sm text-[#6B7280]">View tickets on your account and follow replies.</p>
        </Link>
        <Link href="/help/contact" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-[#FF5A1F]">
          <h2 className="font-semibold">Contact support</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Create a ticket if nobody is available in chat.</p>
        </Link>
      </section>
    </div>
  );
}
