import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle, loadStoreProducts } from "@/lib/commerce-os";
import {
  StorefrontHero,
  StorefrontFeaturedProducts,
} from "@/components/commerce-os/storefront-sections";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export default async function StorefrontHomePage({ params }: Props) {
  const { handle } = await params;
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
      if (section.type === "hero" || section.type === "banner") {
        return (
          <StorefrontHero
            key={section.id}
            handle={store.handle}
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
      if (section.type === "featured_products" || section.type === "collections") {
        return (
          <StorefrontFeaturedProducts
            key={section.id}
            handle={store.handle}
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
            className="mx-auto max-w-5xl px-4 py-8 prose prose-sm"
            dangerouslySetInnerHTML={{ __html: props.html }}
          />
        );
      }
      return null;
    });

  return <div>{content}</div>;
}
