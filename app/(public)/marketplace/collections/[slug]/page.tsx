import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { getCachedCollectionBySlug } from "@/lib/marketplace/collections";
import { safeMediaUrl } from "@/lib/media/optimize-url";
import { ChevronLeft } from "lucide-react";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { notFound } from "next/navigation";

export const revalidate = 60;

const loadCollection = cache((slug: string) => getCachedCollectionBySlug(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await loadCollection(slug);
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
  const collection = await loadCollection(slug);
  if (!collection) notFound();

  return (
    <div className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-6">
      <Link
        href="/marketplace/collections"
        className="mb-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All collections
      </Link>

      <header className="mb-6">
        {collection.badge && (
          <span className="inline-flex rounded-full bg-[var(--color-accent)]/12 px-2.5 py-1 text-[10px] font-bold text-[var(--color-accent)]">
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
            className="mt-4 inline-flex rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white"
          >
            Browse marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {collection.products.map((p) => {
            const raw = Array.isArray(p.images) ? p.images.find(Boolean) : null;
            const img = typeof raw === "string" ? safeMediaUrl(raw, 480) : null;
            return (
              <Link
                key={p.id}
                href={`/marketplace/${p.slug}`}
                prefetch
                className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-accent)]/40 hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden bg-[var(--color-surface-secondary)]">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      width={480}
                      height={480}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {p.name}
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-[var(--color-accent)]">
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
