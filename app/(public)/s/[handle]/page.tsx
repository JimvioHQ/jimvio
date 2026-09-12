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
        s.type === "best_sellers" ||
        s.type === "new_arrivals" ||
        s.type === "banner" ||
        s.type === "trust_shipping" ||
        s.type === "discount_banner" ||
        s.type === "stats" ||
        s.type === "rich_text" ||
        s.type === "testimonials" ||
        s.type === "faq" ||
        s.type === "image_text" ||
        s.type === "newsletter" ||
        s.type === "contact_block" ||
        s.type === "gallery" ||
        s.type === "video"
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
            ctaHref={typeof props.ctaHref === "string" ? props.ctaHref : undefined}
            ctaSecondary={
              typeof props.ctaSecondary === "string" ? props.ctaSecondary : undefined
            }
            ctaSecondaryHref={
              typeof props.ctaSecondaryHref === "string"
                ? props.ctaSecondaryHref
                : undefined
            }
            eyebrow={typeof props.eyebrow === "string" ? props.eyebrow : undefined}
            imageUrl={typeof props.imageUrl === "string" ? props.imageUrl : undefined}
            layout={typeof props.layout === "string" ? props.layout : "left"}
            buttonStyle={store.theme_settings.buttonStyle || "filled"}
          />
        );
      }
      if (section.type === "banner" || section.type === "trust_shipping") {
        return (
          <StorefrontTrustBar
            key={section.id}
            headline={typeof props.headline === "string" ? props.headline : undefined}
            subhead={
              typeof props.subhead === "string"
                ? props.subhead
                : typeof props.items === "string"
                  ? props.items
                  : undefined
            }
          />
        );
      }
      if (section.type === "discount_banner") {
        return (
          <section
            key={section.id}
            className="mx-auto max-w-[var(--store-max-width,72rem)] px-4 py-8 sm:px-6"
          >
            <div
              className="rounded-[var(--store-radius,12px)] px-6 py-10 text-center text-white"
              style={{ background: "var(--store-primary,#FF5A1F)" }}
            >
              <h2 className="text-2xl font-semibold">
                {typeof props.headline === "string" ? props.headline : "Limited offer"}
              </h2>
              <p className="mt-2 text-sm opacity-90">
                {typeof props.subhead === "string" ? props.subhead : ""}
              </p>
            </div>
          </section>
        );
      }
      if (section.type === "stats") {
        return (
          <section
            key={section.id}
            className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 py-12 text-center sm:px-6"
          >
            {[
              [props.aValue, props.aLabel],
              [props.bValue, props.bLabel],
              [props.cValue, props.cLabel],
            ].map(([v, l], i) => (
              <div key={i}>
                <p className="text-2xl font-semibold">{typeof v === "string" ? v : ""}</p>
                <p className="mt-1 text-xs opacity-60">{typeof l === "string" ? l : ""}</p>
              </div>
            ))}
          </section>
        );
      }
      if (section.type === "featured_products" || section.type === "collections" || section.type === "best_sellers" || section.type === "new_arrivals") {
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
                  : section.type === "best_sellers"
                    ? "Best sellers"
                    : section.type === "new_arrivals"
                      ? "New arrivals"
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
      if (section.type === "testimonials") {
        return (
          <section key={section.id} className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "What customers say"}
            </h2>
            <p className="mt-4 text-base italic opacity-75">
              “{typeof props.quote === "string" ? props.quote : ""}”
            </p>
            <p className="mt-2 text-sm font-semibold opacity-60">
              {typeof props.author === "string" ? props.author : ""}
            </p>
          </section>
        );
      }
      if (section.type === "faq") {
        return (
          <section key={section.id} className="mx-auto max-w-3xl space-y-3 px-4 py-12 sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "FAQ"}
            </h2>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="font-medium">{typeof props.q1 === "string" ? props.q1 : ""}</p>
              <p className="mt-1 text-sm opacity-70">{typeof props.a1 === "string" ? props.a1 : ""}</p>
            </div>
            {typeof props.q2 === "string" ? (
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="font-medium">{props.q2}</p>
                <p className="mt-1 text-sm opacity-70">
                  {typeof props.a2 === "string" ? props.a2 : ""}
                </p>
              </div>
            ) : null}
          </section>
        );
      }
      if (section.type === "image_text") {
        return (
          <section key={section.id} className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2">
            <div className="aspect-[4/3] overflow-hidden rounded-[var(--store-radius,12px)] bg-[#E5E7EB]">
              {typeof props.imageUrl === "string" && props.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={props.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <h2 className="text-2xl font-semibold">
                {typeof props.headline === "string" ? props.headline : "Our story"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed opacity-70">
                {typeof props.body === "string" ? props.body : ""}
              </p>
            </div>
          </section>
        );
      }
      if (section.type === "newsletter" || section.type === "contact_block") {
        return (
          <section key={section.id} className="border-y border-black/5 bg-white/70 px-4 py-12 text-center sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "Stay in the loop"}
            </h2>
            <p className="mt-2 text-sm opacity-70">
              {typeof props.subhead === "string"
                ? props.subhead
                : typeof props.body === "string"
                  ? props.body
                  : ""}
            </p>
            {section.type === "newsletter" ? (
              <p className="mt-4 text-xs opacity-50">
                Connect email capture from Integrations when ready.
              </p>
            ) : null}
          </section>
        );
      }
      if (section.type === "gallery") {
        return (
          <section key={section.id} className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "Gallery"}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[var(--store-radius,12px)] bg-[#E5E7EB]"
                />
              ))}
            </div>
          </section>
        );
      }
      if (section.type === "video") {
        return (
          <section key={section.id} className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "Video"}
            </h2>
            {typeof props.url === "string" && props.url.startsWith("https://") ? (
              <div className="mt-6 aspect-video overflow-hidden rounded-[var(--store-radius,12px)] bg-black">
                <iframe
                  title={typeof props.title === "string" ? props.title : "Store video"}
                  src={props.url}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="mt-4 text-sm opacity-60">Add a secure https video URL in the builder.</p>
            )}
          </section>
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
