import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProducts,
} from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";
import { StorefrontFeaturedProducts } from "@/components/commerce-os/storefront-sections";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; slug: string }> };

export default async function StorefrontCollectionPage({ params }: Props) {
  const { handle, slug } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  if (slug === "all") {
    const products = await loadStoreProducts(supabase, store.id, { limit: 48 });
    return (
      <div className="py-8">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="text-2xl font-semibold">All products</h1>
        </div>
        <StorefrontFeaturedProducts
          handle={store.handle}
          title=""
          products={products as Array<{
            id: string;
            name: string;
            slug: string;
            price: number | string | null;
            currency?: string | null;
            images?: unknown;
          }>}
        />
      </div>
    );
  }

  const { data: collection } = await cosTable(supabase, "jimvio_store_collections")
    .select("id, title, handle, description")
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
  let products: Array<{
    id: string;
    name: string;
    slug: string;
    price: number | string | null;
    currency?: string | null;
    images?: unknown;
  }> = [];

  if (ids.length) {
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, price, currency, images, status")
      .in("id", ids)
      .eq("status", "active");
    const byId = new Map((data ?? []).map((p) => [p.id, p]));
    products = ids.map((id) => byId.get(id)).filter(Boolean) as typeof products;
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-5xl px-4">
        <p className="text-xs uppercase tracking-wide opacity-60">
          <Link href={`/s/${handle}/collections/all`}>Collections</Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{collection.title}</h1>
        {collection.description ? (
          <p className="mt-2 text-sm opacity-70">{collection.description}</p>
        ) : null}
      </div>
      <StorefrontFeaturedProducts
        handle={store.handle}
        title=""
        products={products}
      />
    </div>
  );
}
