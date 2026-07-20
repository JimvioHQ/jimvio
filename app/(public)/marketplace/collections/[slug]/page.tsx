import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchCollectionBySlug } from "@/lib/marketplace/collections";
import { ChevronLeft } from "lucide-react";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const collection = await fetchCollectionBySlug(supabase, slug);
  return {
    title: collection ? `${collection.title} | Jimvio` : "Collection | Jimvio",
    description: collection?.description ?? "Curated marketplace collection",
  };
}

export default async function MarketplaceCollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const collection = await fetchCollectionBySlug(supabase, slug);
  if (!collection) notFound();

  return (
    <div className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-6">
      <Link
        href="/marketplace/collections"
        className="mb-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[#fd5000]"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All collections
      </Link>

      <header className="mb-6">
        {collection.badge && (
          <span className="inline-flex rounded-full bg-[#fd5000]/12 px-2.5 py-1 text-[10px] font-bold text-[#fd5000]">
            {collection.badge}
          </span>
        )}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
            {collection.description}
          </p>
        )}
      </header>

      {collection.products.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Products for this collection are being curated. Browse the full marketplace meanwhile.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex rounded-xl bg-[#fd5000] px-4 py-2 text-sm font-bold text-white"
          >
            Browse marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {collection.products.map((p) => {
            const img = Array.isArray(p.images) ? p.images.find(Boolean) : null;
            return (
              <Link
                key={p.id}
                href={`/marketplace/${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[#fd5000]/40 hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden bg-[var(--color-surface-secondary)]">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {p.name}
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[#fd5000]">
                    <LocalizedPrice amount={p.price} currency={p.currency ?? "USD"} />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
