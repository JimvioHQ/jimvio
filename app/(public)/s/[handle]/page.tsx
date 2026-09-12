import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle, loadStoreProducts } from "@/lib/commerce-os";
import {
  StorefrontHero,
  StorefrontFeaturedProducts,
  StorefrontTrustBar,
} from "@/components/commerce-os/storefront-sections";
import {
  buildMissingStorefrontMetadata,
  buildStorefrontMetadata,
} from "@/lib/commerce-os/storefront-metadata";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) return buildMissingStorefrontMetadata();
  return buildStorefrontMetadata(store);
}

export default async function StorefrontHomePage({ params }: Props) {
  const { handle } = await params;
  const onStoreHost = await isRequestOnStoreHost();
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const products = await loadStoreProducts(supabase, store.id, { limit: 12 });
  const sections = store.published_sections.home;

  const content = sections
    .filter((s) => s.enabled)
    .filter(
      (s) =>
        s.type === "hero" ||
        s.type === "featured_products" ||
        s.type === "collections" ||
        s.type === "banner" ||
        s.type === "rich_text"
    )
    .map((section) => {
      const props = section.props || {};
      if (section.type === "hero") {
        return (
          <StorefrontHero
            key={section.id}
            handle={store.handle}
            onStoreHost={onStoreHost}
            headline={
              typeof props.headline === "string" ? props.headline : store.name
            }
            subhead={
              typeof props.subhead === "string"
                ? props.subhead
                : store.description || undefined
            }
            cta={typeof props.cta === "string" ? props.cta : undefined}
          />
        );
      }
      if (section.type === "banner") {
        return (
          <StorefrontTrustBar
            key={section.id}
            headline={typeof props.headline === "string" ? props.headline : undefined}
            subhead={typeof props.subhead === "string" ? props.subhead : undefined}
          />
        );
      }
      if (section.type === "featured_products" || section.type === "collections") {
        return (
          <StorefrontFeaturedProducts
            key={section.id}
            handle={store.handle}
            onStoreHost={onStoreHost}
            title={
              typeof props.title === "string"
                ? props.title
                : section.type === "collections"
                  ? "Collections"
                  : "Featured"
            }
            products={
              products as Array<{
                id: string;
                name: string;
                slug: string;
                price: number | string | null;
                currency?: string | null;
                images?: unknown;
                short_description?: string | null;
              }>
            }
          />
        );
      }
      if (section.type === "rich_text" && typeof props.html === "string") {
        return (
          <div
            key={section.id}
            className="prose prose-sm mx-auto max-w-6xl px-4 py-8 sm:px-6"
            dangerouslySetInnerHTML={{ __html: props.html }}
          />
        );
      }
      return null;
    });

  return <div>{content}</div>;
}
