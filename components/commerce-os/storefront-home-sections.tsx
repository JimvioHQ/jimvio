import type { ReactNode } from "react";
import type { ThemeSection, ThemeSettings } from "@/lib/commerce-os/themes/registry";
import { resolveVideoEmbedUrl } from "@/lib/commerce-os/storefront/video-embed";
import { sliceProductsForSection } from "@/lib/commerce-os/storefront/product-slice";
import { productsOnSale } from "@/lib/commerce-os/storefront/sale-products";
import { sliceCollectionsForSection } from "@/lib/commerce-os/storefront/collection-slice";
import {
  StorefrontCategoryNav,
  StorefrontFeaturedProducts,
  StorefrontHero,
  StorefrontTrustBar,
  type StorefrontCollectionTile,
  type StorefrontPreviewDevice,
} from "@/components/commerce-os/storefront-sections";
import { StorefrontNewsletterForm } from "@/components/commerce-os/storefront-newsletter-form";

type Product = {
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

function visibleForDevice(
  props: Record<string, unknown> | undefined,
  device: StorefrontPreviewDevice
): boolean {
  if (!props) return true;
  const compact = device === "mobile" || device === "tablet";
  if (compact && props.hideOnMobile === true && device === "mobile") return false;
  if (device === "tablet" && props.hideOnTablet === true) return false;
  if (
    (device === "desktop" || device === "laptop" || device === "custom") &&
    props.hideOnDesktop === true
  ) {
    return false;
  }
  return true;
}

export { sliceProductsForSection };

/**
 * Shared homepage section renderer for production storefront + builder canvas.
 */
export function StorefrontHomeSections({
  sections,
  products,
  collections = [],
  handle,
  storeName,
  storeDescription,
  themeSettings,
  onStoreHost = false,
  device = "desktop",
  preview = false,
  onSelectSection,
  selectedId,
  storeId,
}: {
  sections: ThemeSection[];
  products: Product[];
  collections?: StorefrontCollectionTile[];
  handle: string;
  storeName: string;
  storeDescription?: string | null;
  themeSettings: ThemeSettings;
  onStoreHost?: boolean;
  device?: StorefrontPreviewDevice;
  preview?: boolean;
  onSelectSection?: (id: string) => void;
  selectedId?: string | null;
  storeId?: string;
}) {
  const compact = device === "mobile" || device === "tablet";
  const previewDevice = preview ? device : undefined;
  const content = sections
    .filter((s) => s.enabled)
    .filter((s) => visibleForDevice(s.props, device))
    .filter(
      (s) =>
        ![
          "announcement",
          "header",
          "footer",
          "product_detail",
          "collection_grid",
          "cart",
        ].includes(s.type)
    )
    .map((section) => {
      const props = section.props || {};
      let node: ReactNode = null;

      if (section.type === "hero") {
        node = (
          <StorefrontHero
            handle={handle}
            onStoreHost={onStoreHost}
            headline={
              typeof props.headline === "string" ? props.headline : storeName
            }
            headlineAccent={
              typeof props.headlineAccent === "string"
                ? props.headlineAccent
                : undefined
            }
            subhead={
              typeof props.subhead === "string"
                ? props.subhead
                : storeDescription || undefined
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
            buttonStyle={themeSettings.buttonStyle || "filled"}
            height={typeof props.height === "string" ? props.height : "lg"}
            overlay={typeof props.overlay === "string" ? props.overlay : "0"}
            trustItems={
              typeof props.trustItems === "string" ? props.trustItems : undefined
            }
            previewDevice={previewDevice}
          />
        );
      } else if (section.type === "banner" || section.type === "trust_shipping") {
        const subhead =
          typeof props.subhead === "string"
            ? props.subhead
            : typeof props.items === "string"
              ? props.items
              : undefined;
        const headline =
          typeof props.headline === "string" ? props.headline : undefined;
        node =
          (headline && headline.trim()) || (subhead && subhead.trim()) ? (
            <StorefrontTrustBar
              headline={headline}
              subhead={subhead}
              previewDevice={previewDevice}
            />
          ) : preview ? (
            <p className="px-4 py-8 text-center text-sm opacity-50">
              Add trust items in the inspector. Only merchant-written copy is shown.
            </p>
          ) : null;
      } else if (section.type === "discount_banner") {
        const headline = typeof props.headline === "string" ? props.headline.trim() : "";
        const subhead = typeof props.subhead === "string" ? props.subhead : "";
        node =
          headline || subhead ? (
          <section className={`mx-auto max-w-[var(--store-max-width,72rem)] py-8 ${compact ? "px-3" : "px-4 sm:px-6"}`}>
            <div
              className="rounded-[var(--store-radius,12px)] px-6 py-10 text-center text-[var(--store-btn-text)]"
              style={{ background: "var(--store-primary)" }}
            >
              {headline ? <h2 className="text-2xl font-semibold">{headline}</h2> : null}
              {subhead ? (
              <p className="mt-2 text-sm opacity-90">{subhead}</p>
              ) : null}
            </div>
          </section>
          ) : preview ? (
            <p className="px-4 py-8 text-center text-sm opacity-50">Add promo copy in the inspector.</p>
          ) : null;
      } else if (section.type === "stats") {
        const stats = [
          [props.aValue, props.aLabel],
          [props.bValue, props.bLabel],
          [props.cValue, props.cLabel],
        ].filter(([v, l]) => typeof v === "string" && v && typeof l === "string" && l);
        if (!stats.length) {
          node = preview ? (
            <p className="px-4 py-8 text-center text-sm opacity-50">Add stats values in the inspector.</p>
          ) : null;
        } else {
        node = (
          <section className={`mx-auto grid max-w-4xl gap-4 py-12 text-center ${compact ? "grid-cols-1 px-3" : "grid-cols-3 px-4 sm:px-6"}`}>
            {stats.map(([v, l], i) => (
              <div key={i}>
                <p className="text-2xl font-semibold">
                  {typeof v === "string" ? v : ""}
                </p>
                <p className="mt-1 text-xs opacity-60">
                  {typeof l === "string" ? l : ""}
                </p>
              </div>
            ))}
          </section>
        );
        }
      } else if (section.type === "collections") {
        const list = sliceCollectionsForSection(collections, props);
        node =
          list.length > 0 ? (
            <StorefrontCategoryNav
              handle={handle}
              onStoreHost={onStoreHost}
              collections={list}
              title={
                typeof props.title === "string"
                  ? props.title
                  : "Shop by category"
              }
              layout={typeof props.layout === "string" ? props.layout : "icons"}
              previewDevice={previewDevice}
            />
          ) : preview ? (
            <p className="px-4 py-8 text-center text-sm opacity-50">
              Publish collections to show category tiles here.
            </p>
          ) : null;
      } else if (
        section.type === "featured_products" ||
        section.type === "best_sellers" ||
        section.type === "new_arrivals" ||
        section.type === "sale_rail"
      ) {
        const source =
          section.type === "sale_rail" ? productsOnSale(products) : products;
        const list = sliceProductsForSection(source, section);
        node =
          list.length > 0 || preview ? (
            <StorefrontFeaturedProducts
              handle={handle}
              onStoreHost={onStoreHost}
              storeId={storeId}
              title={
                typeof props.title === "string"
                  ? props.title
                  : section.type === "best_sellers"
                    ? "Best sellers"
                    : section.type === "new_arrivals"
                      ? "New arrivals"
                      : section.type === "sale_rail"
                        ? "On sale"
                        : "Featured products"
              }
              subtitle={
                typeof props.subtitle === "string" ? props.subtitle : undefined
              }
              products={list}
              layout={section.type === "sale_rail" ? "rail" : "grid"}
              previewDevice={preview ? device : undefined}
            />
          ) : null;
      } else if (section.type === "testimonials") {
        const quote = typeof props.quote === "string" ? props.quote.trim() : "";
        node = quote ? (
          <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string"
                ? props.title
                : "What customers say"}
            </h2>
            <p className="mt-4 text-base italic opacity-75">
              “{quote}”
            </p>
            {typeof props.author === "string" && props.author ? (
              <p className="mt-2 text-sm font-semibold opacity-60">
                {props.author}
              </p>
            ) : null}
          </section>
        ) : preview ? (
          <p className="px-4 py-8 text-center text-sm opacity-50">Add a customer quote to show this section.</p>
        ) : null;
      } else if (section.type === "faq") {
        node = (
          <section className="mx-auto max-w-3xl space-y-3 px-4 py-12 sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "FAQ"}
            </h2>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="font-medium">
                {typeof props.q1 === "string" ? props.q1 : ""}
              </p>
              <p className="mt-1 text-sm opacity-70">
                {typeof props.a1 === "string" ? props.a1 : ""}
              </p>
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
      } else if (section.type === "image_text") {
        node = (
          <section className={`mx-auto grid max-w-6xl gap-8 py-12 ${compact ? "px-3" : "px-4 sm:px-6 lg:grid-cols-2"}`}>
            <div className="aspect-[4/3] overflow-hidden rounded-[var(--store-radius,12px)] bg-[#E5E7EB]">
              {typeof props.imageUrl === "string" && props.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.imageUrl}
                  alt={
                    typeof props.imageAlt === "string"
                      ? props.imageAlt
                      : typeof props.headline === "string"
                        ? props.headline
                        : ""
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-xs opacity-50">
                  Add an image
                </div>
              )}
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
      } else if (section.type === "newsletter") {
        node = preview ? (
          <section className="border-y border-black/5 bg-white/70 px-4 py-12 text-center sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "Stay in the loop"}
            </h2>
            <p className="mt-2 text-sm opacity-70">
              {typeof props.subhead === "string" ? props.subhead : ""}
            </p>
            <p className="mt-4 text-xs opacity-50">Email capture form</p>
          </section>
        ) : (
          <StorefrontNewsletterForm
            storeHandle={handle}
            sectionId={section.id}
            title={typeof props.title === "string" ? props.title : undefined}
            subhead={typeof props.subhead === "string" ? props.subhead : undefined}
            cta={typeof props.cta === "string" ? props.cta : undefined}
          />
        );
      } else if (section.type === "contact_block") {
        node = (
          <section className="border-y border-black/5 bg-white/70 px-4 py-12 text-center sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "Get in touch"}
            </h2>
            <p className="mt-2 text-sm opacity-70">
              {typeof props.body === "string" ? props.body : ""}
            </p>
          </section>
        );
      } else if (section.type === "gallery") {
        node = (
          <section className={`mx-auto max-w-6xl py-12 ${compact ? "px-3" : "px-4 sm:px-6"}`}>
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "Gallery"}
            </h2>
            <div className={`mt-6 grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {[0, 1, 2].map((i) => {
                const key = `image${i + 1}` as const;
                const url = props[key];
                return (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden rounded-[var(--store-radius,12px)] bg-[#E5E7EB]"
                  >
                    {typeof url === "string" && url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      } else if (section.type === "video") {
        const resolved = resolveVideoEmbedUrl(
          typeof props.url === "string" ? props.url : ""
        );
        let embedSrc = resolved.ok ? resolved.embedUrl : "";
        if (resolved.ok && props.autoplay === true) {
          const joiner = embedSrc.includes("?") ? "&" : "?";
          embedSrc = `${embedSrc}${joiner}autoplay=1&mute=1&muted=1`;
        }
        node = (
          <section className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6">
            <h2 className="text-2xl font-semibold">
              {typeof props.title === "string" ? props.title : "Video"}
            </h2>
            {resolved.ok ? (
              <div className="mt-6 aspect-video overflow-hidden rounded-[var(--store-radius,12px)] bg-black">
                <iframe
                  title={typeof props.title === "string" ? props.title : "Store video"}
                  src={embedSrc}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="mt-4 text-sm opacity-60">{resolved.error}</p>
            )}
          </section>
        );
      } else if (section.type === "rich_text" && typeof props.html === "string") {
        node = (
          <div
            className="prose prose-sm mx-auto max-w-6xl px-4 py-8 sm:px-6"
            dangerouslySetInnerHTML={{ __html: props.html }}
          />
        );
      }

      if (!node) return null;

      if (preview && onSelectSection) {
        const active = selectedId === section.id;
        return (
          <div
            key={section.id}
            className="relative min-w-0"
            data-section-id={section.id}
            data-section-type={section.type}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label={`Edit ${section.type.replace(/_/g, " ")}`}
              onClick={() => onSelectSection(section.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectSection(section.id);
              }}
              className={
                active
                  ? "relative outline outline-2 outline-[#2563EB] outline-offset-[-2px]"
                  : "relative hover:outline hover:outline-1 hover:outline-[#93C5FD] hover:outline-offset-[-1px]"
              }
            >
              {active ? (
                <span className="absolute left-0 top-0 z-10 rounded-br-md bg-[#2563EB] px-2 py-0.5 text-[10px] font-semibold capitalize text-white">
                  {section.type.replace(/_/g, " ")}
                </span>
              ) : null}
              <div className="pointer-events-none">{node}</div>
            </div>
          </div>
        );
      }

      return (
        <div
          key={section.id}
          data-section-id={section.id}
          data-section-type={section.type}
        >
          {node}
        </div>
      );
    });

  return <div>{content}</div>;
}
