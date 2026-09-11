import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loadPublishedStoreByHandle,
  loadStoreProducts,
  defaultHomeSections,
} from "@/lib/commerce-os";
import type { ThemeDraft, ThemeSection } from "@/lib/commerce-os/themes/registry";
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
  const draft = store.theme_draft as ThemeDraft | null;
  const sections: ThemeSection[] =
    draft?.sections?.home?.length
      ? draft.sections.home
      : defaultHomeSections(store.name);

  const content = sections
    .filter((s) => s.enabled)
    .filter((s) => s.type === "hero" || s.type === "featured_products" || s.type === "collections")
    .map((section) => {
      const props = section.props || {};
      if (section.type === "hero") {
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
      if (section.type === "featured_products") {
        return (
          <StorefrontFeaturedProducts
            key={section.id}
            handle={store.handle}
            title={typeof props.title === "string" ? props.title : "Featured"}
            products={products as Array<{
              id: string;
              name: string;
              slug: string;
              price: number | string | null;
              currency?: string | null;
              images?: unknown;
              short_description?: string | null;
            }>}
          />
        );
      }
      return null;
    });

  return <div>{content}</div>;
}
