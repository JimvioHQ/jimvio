import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProducts,
} from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import { StorefrontFeaturedProducts } from "@/components/commerce-os/storefront-sections";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { productsOnSale } from "@/lib/commerce-os/storefront/sale-products";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string; slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

type CollectionProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  compare_at_price?: number | string | null;
  currency?: string | null;
  images?: unknown;
  short_description?: string | null;
  inventory_quantity?: number | null;
  track_inventory?: boolean | null;
  vendor_id?: string | null;
};

function parseSort(
  raw?: string
): "manual" | "newest" | "price_asc" | "price_desc" | "sale" {
  if (raw === "newest" || raw === "price_asc" || raw === "price_desc" || raw === "sale") {
    return raw;
  }
  return "manual";
}

export default async function StorefrontCollectionPage({
  params,
  searchParams,
}: Props) {
  const { handle, slug } = await params;
  const { sort: sortRaw } = await searchParams;
  const sort = parseSort(sortRaw);
  const onStoreHost = await isRequestOnStoreHost();
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const sortLinks: Array<{ id: typeof sort; label: string }> = [
    { id: "manual", label: "Featured" },
    { id: "newest", label: "Newest" },
    { id: "price_asc", label: "Price: low" },
    { id: "price_desc", label: "Price: high" },
    { id: "sale", label: "On sale" },
  ];

  function sortHref(next: string) {
    const base = storefrontHref(handle, `/collections/${slug}`, { onStoreHost });
    return next === "manual" ? base : `${base}?sort=${next}`;
  }

  if (slug === "all") {
    const loaded = await loadStoreProducts(supabase, store.id, {
      limit: 48,
      sort: sort === "sale" ? "manual" : sort,
    });
    const products =
      sort === "sale" ? productsOnSale(loaded as CollectionProduct[]) : loaded;
    return (
      <div className="py-8">
        <div className="mx-auto max-w-[var(--store-max-width,80rem)] px-4 sm:px-6">
          <p className="text-xs font-semibold text-[var(--store-muted,#6B7280)]">
            <Link href={storefrontHref(handle, "", { onStoreHost })} className="hover:text-[var(--store-text,#111827)]">
              Home
            </Link>
            <span className="px-1.5 opacity-50">/</span>
            All products
          </p>
          <h1
            className="mt-3 text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--store-heading-font, inherit)" }}
          >
            All products
          </h1>
          <p className="mt-1 text-sm text-[var(--store-muted,#6B7280)]">
            Discover everything available in this store.
          </p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {sortLinks.map((s) => (
              <Link
                key={s.id}
                href={sortHref(s.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  sort === s.id
                    ? "bg-[var(--store-primary,#FF5A1F)] text-white"
                    : "border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)]"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
        <StorefrontFeaturedProducts
          handle={store.handle}
          onStoreHost={onStoreHost}
          storeId={store.id}
          displayCurrency={store.default_currency}
          title=""
          products={products as CollectionProduct[]}
        />
      </div>
    );
  }

  const { data: collection } = await cosTable(supabase, "jimvio_store_collections")
    .select("id, title, handle, description, image_url")
    .eq("store_id", store.id)
    .eq("handle", slug)
    .eq("published", true)
    .maybeSingle();

  if (!collection) notFound();

  const { data: links } = await cosTable(supabase, "jimvio_store_collection_products")
    .select("product_id, position")
    .eq("collection_id", collection.id)
    .order("position", { ascending: true });

  const ids = (links ?? []).map((l) => l.product_id);
  let products: CollectionProduct[] = [];

  if (ids.length) {
    const { data } = await supabase
      .from("products")
      .select(
        "id, name, slug, price, compare_at_price, currency, images, short_description, inventory_quantity, track_inventory, vendor_id, status"
      )
      .in("id", ids)
      .eq("status", "active");
    const byId = new Map((data ?? []).map((p) => [p.id, p]));
    products = ids
      .map((id) => byId.get(id))
      .filter(Boolean) as CollectionProduct[];
    if (sort === "sale") products = productsOnSale(products);
    if (sort === "price_asc") {
      products = [...products].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    }
    if (sort === "price_desc") {
      products = [...products].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    }
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-[var(--store-max-width,80rem)] px-4 sm:px-6">
        <p className="text-xs uppercase tracking-wide text-[var(--store-muted,#6B7280)]">
          <Link href={storefrontHref(handle, "", { onStoreHost })} className="hover:text-[var(--store-text,#111827)]">
            Home
          </Link>
          <span className="px-1.5 opacity-50">/</span>
          <Link href={storefrontHref(handle, "/collections/all", { onStoreHost })} className="hover:text-[var(--store-text,#111827)]">
            Collections
          </Link>
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
          {collection.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.image_url}
              alt=""
              className="h-28 w-28 rounded-[var(--store-card-radius,16px)] object-cover"
            />
          ) : null}
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--store-heading-font, inherit)" }}
            >
              {collection.title}
            </h1>
            {collection.description ? (
              <p className="mt-2 text-sm text-[var(--store-muted,#6B7280)]">
                {collection.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {sortLinks.map((s) => (
            <Link
              key={s.id}
              href={sortHref(s.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                sort === s.id
                  ? "bg-[var(--store-primary,#FF5A1F)] text-white"
                  : "border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)]"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
      <StorefrontFeaturedProducts
        handle={store.handle}
        onStoreHost={onStoreHost}
        storeId={store.id}
        displayCurrency={store.default_currency}
        title=""
        products={products}
      />
    </div>
  );
}
