import Link from "next/link";
import type { CSSProperties } from "react";
import type { ThemeSection } from "@/lib/commerce-os/themes/registry";
import {
  normalizeStorefrontHref,
  storefrontHref,
} from "@/lib/commerce-os/storefront-url";
import { StorefrontProductCard } from "@/components/commerce-os/storefront-product-card";
import { StorefrontHeaderActions } from "@/components/commerce-os/storefront-header-actions";

type ProductCard = {
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
};

export type StorefrontCollectionTile = {
  id: string;
  title: string;
  handle: string;
  image_url?: string | null;
};

export function StorefrontAnnouncement({
  text,
  storeName,
}: {
  text?: string | null;
  storeName: string;
}) {
  const raw = text?.trim() || `Welcome to ${storeName}`;
  const parts = raw
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  const messages = parts.length > 1 ? parts : [raw];

  return (
    <div className="bg-[#0F172A] px-4 py-2 text-[11px] font-medium tracking-wide text-white/90 sm:text-xs">
      <div className="mx-auto flex max-w-[var(--store-max-width,72rem)] flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {messages.slice(0, 3).map((m) => (
            <span key={m} className="opacity-90">
              {m}
            </span>
          ))}
        </div>
        <span className="hidden text-white/55 sm:inline">Shop with confidence</span>
      </div>
    </div>
  );
}

export function StorefrontHeader({
  storeName,
  handle,
  logoUrl,
  navItems,
  onStoreHost = false,
  sticky = true,
  centered = false,
  showPoweredBy = true,
}: {
  storeName: string;
  handle: string;
  logoUrl?: string | null;
  navItems?: Array<{ label: string; href: string }>;
  onStoreHost?: boolean;
  sticky?: boolean;
  centered?: boolean;
  showPoweredBy?: boolean;
}) {
  const linkOpts = { onStoreHost };
  const home = storefrontHref(handle, "", linkOpts);
  const items =
    navItems && navItems.length
      ? navItems.map((item) => ({
          ...item,
          href: normalizeStorefrontHref(handle, item.href, linkOpts),
        }))
      : [
          { label: "Home", href: home },
          {
            label: "All products",
            href: storefrontHref(handle, "/collections/all", linkOpts),
          },
          { label: "Search", href: storefrontHref(handle, "/search", linkOpts) },
        ];

  return (
    <header
      className={`${sticky ? "sticky top-0" : "relative"} z-30 border-b border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#FFFFFF)]/95 backdrop-blur-md`}
    >
      <div
        className={`mx-auto flex max-w-[var(--store-max-width,72rem)] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 ${
          centered ? "flex-col text-center" : ""
        }`}
      >
        <Link href={home} className="flex min-w-0 shrink-0 items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="rounded-full object-cover"
              style={{ height: "var(--store-logo-size,36px)", width: "var(--store-logo-size,36px)" }}
            />
          ) : (
            <span
              className="grid place-items-center rounded-full text-xs font-bold text-white"
              style={{
                background: "var(--store-primary,#FF5A1F)",
                height: "var(--store-logo-size,36px)",
                width: "var(--store-logo-size,36px)",
              }}
              aria-hidden
            >
              {storeName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-[var(--store-text,#111827)] sm:text-base">
              {storeName}
            </span>
            {showPoweredBy ? (
              <span className="hidden text-[10px] text-[var(--store-muted,#6B7280)] sm:block">
                Powered by Jimvio
              </span>
            ) : null}
          </span>
        </Link>

        <nav
          className={`hidden min-w-0 flex-1 items-center gap-1 text-sm lg:flex ${
            centered ? "justify-center" : "justify-center"
          }`}
          aria-label="Store"
        >
          {items.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="rounded-lg px-2.5 py-1.5 text-[var(--store-text,#111827)]/75 transition hover:bg-black/[0.04] hover:text-[var(--store-text,#111827)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={`ml-auto flex min-w-0 items-center gap-2 ${centered ? "w-full justify-center" : ""}`}>
          <StorefrontHeaderActions handle={handle} onStoreHost={onStoreHost} />
        </div>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto border-t border-[var(--store-border,rgba(0,0,0,0.05))] px-4 py-2 text-xs lg:hidden"
        aria-label="Store mobile"
      >
        {items.map((item) => (
          <Link
            key={`m-${item.href}-${item.label}`}
            href={item.href}
            className="shrink-0 rounded-full bg-[var(--store-bg,#F8FAFC)] px-3 py-1.5 font-medium text-[var(--store-text,#111827)]/80"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function StorefrontHero({
  headline,
  subhead,
  cta,
  ctaHref,
  ctaSecondary,
  ctaSecondaryHref,
  eyebrow,
  imageUrl,
  layout = "left",
  handle,
  onStoreHost = false,
  buttonStyle = "filled",
  height = "lg",
  overlay = "0",
  trustItems,
}: {
  headline?: string;
  subhead?: string;
  cta?: string;
  ctaHref?: string;
  ctaSecondary?: string;
  ctaSecondaryHref?: string;
  eyebrow?: string;
  imageUrl?: string;
  layout?: string;
  handle: string;
  onStoreHost?: boolean;
  buttonStyle?: string;
  height?: string;
  overlay?: string;
  trustItems?: string;
}) {
  const linkOpts = { onStoreHost };
  const shopPath =
    typeof ctaHref === "string" && ctaHref.startsWith("/")
      ? ctaHref
      : "/collections/all";
  const secondaryPath =
    typeof ctaSecondaryHref === "string" && ctaSecondaryHref.startsWith("/")
      ? ctaSecondaryHref
      : "/collections/all";
  const centered = layout === "center";
  const split = layout === "split" || layout === "right";
  const py =
    height === "xl"
      ? "py-20 sm:py-28"
      : height === "md"
        ? "py-12 sm:py-16"
        : "py-14 sm:py-20";
  const overlayOpacity = Math.min(
    Math.max(Number(overlay) || 0, 0),
    0.7
  );
  const primaryStyle: CSSProperties =
    buttonStyle === "outline" || buttonStyle === "ghost" || buttonStyle === "link"
      ? {
          background: "transparent",
          color: "var(--store-btn, var(--store-primary,#FF5A1F))",
          border: "1px solid var(--store-btn, var(--store-primary,#FF5A1F))",
          borderRadius: "var(--store-btn-radius,9999px)",
          minHeight: "var(--store-btn-height,44px)",
        }
      : buttonStyle === "soft"
        ? {
            background:
              "color-mix(in srgb, var(--store-btn, var(--store-primary,#FF5A1F)) 15%, white)",
            color: "var(--store-btn, var(--store-primary,#FF5A1F))",
            borderRadius: "var(--store-btn-radius,9999px)",
            minHeight: "var(--store-btn-height,44px)",
          }
        : {
            background: "var(--store-btn, var(--store-primary,#FF5A1F))",
            color: "var(--store-btn-text,#FFFFFF)",
            borderRadius: "var(--store-btn-radius,9999px)",
            minHeight: "var(--store-btn-height,44px)",
          };

  const trusts = (
    trustItems ||
    "Fast Delivery · Secure Payments · 24/7 Support"
  )
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <section className="relative overflow-hidden border-b border-[var(--store-border,rgba(0,0,0,0.04))]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--store-primary,#FF5A1F) 12%, white) 0%, var(--store-bg,#F8FAFC) 45%, white 100%)",
        }}
        aria-hidden
      />
      {imageUrl && !split ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-[var(--store-bg,#F8FAFC)]"
            style={{ opacity: 0.55 + overlayOpacity }}
            aria-hidden
          />
        </>
      ) : null}
      <div
        className={`relative mx-auto grid max-w-[var(--store-max-width,72rem)] gap-8 px-4 sm:px-6 ${py} ${
          split
            ? "lg:grid-cols-2 lg:items-center"
            : centered
              ? ""
              : "lg:grid-cols-[1.15fr_0.85fr] lg:items-center"
        } ${centered ? "text-center" : ""}`}
      >
        <div className={centered ? "mx-auto max-w-2xl" : ""}>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--store-primary,#FF5A1F)_12%,white)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--store-primary,#FF5A1F)]">
            {eyebrow || "Official store"}
          </p>
          <h1
            className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-[var(--store-text,#111827)] sm:text-5xl"
            style={{ fontFamily: "var(--store-heading-font, inherit)" }}
          >
            {headline || "Shop the collection"}
          </h1>
          {subhead ? (
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--store-muted,#6B7280)] sm:text-lg">
              {subhead}
            </p>
          ) : null}
          <div
            className={`mt-8 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}
          >
            <Link
              href={storefrontHref(handle, shopPath, linkOpts)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-95"
              style={primaryStyle}
            >
              {cta || "Shop now"} →
            </Link>
            <Link
              href={storefrontHref(handle, secondaryPath, linkOpts)}
              className="inline-flex items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)]/80 px-5 py-2.5 text-sm font-semibold text-[var(--store-text,#111827)] backdrop-blur transition hover:bg-white"
              style={{
                borderRadius: "var(--store-btn-radius,9999px)",
                minHeight: "var(--store-btn-height,44px)",
              }}
            >
              {ctaSecondary || "Browse all products"}
            </Link>
          </div>
          {trusts.length ? (
            <ul
              className={`mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[var(--store-text,#111827)]/75 ${
                centered ? "justify-center" : ""
              }`}
            >
              {trusts.map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--store-primary,#FF5A1F)" }}
                  />
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {split && imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full min-h-[240px] w-full rounded-[var(--store-card-radius,16px)] object-cover shadow-[var(--store-shadow)] sm:min-h-[320px]"
          />
        ) : !split ? (
          <div className="hidden space-y-3 lg:block">
            {["Premium Quality", "Fast & Reliable", "Safe Checkout"].map(
              (label, i) => (
                <div
                  key={label}
                  className="rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)]/90 px-4 py-4 shadow-sm backdrop-blur"
                >
                  <p className="text-sm font-semibold text-[var(--store-text,#111827)]">
                    {label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--store-muted,#6B7280)]">
                    {i === 2
                      ? "Powered by Jimvio secure checkout"
                      : i === 1
                        ? "Tracked fulfillment for every order"
                        : "Curated products from verified suppliers"}
                  </p>
                </div>
              )
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontCategoryNav({
  handle,
  collections,
  onStoreHost = false,
  title = "Shop by category",
}: {
  handle: string;
  collections: StorefrontCollectionTile[];
  onStoreHost?: boolean;
  title?: string;
}) {
  const linkOpts = { onStoreHost };
  const tiles = [
    {
      id: "all",
      title: "All",
      handle: "all",
      image_url: null as string | null,
    },
    ...collections.slice(0, 10),
  ];

  return (
    <section className="border-b border-[var(--store-border,rgba(0,0,0,0.05))] bg-[var(--store-surface,#fff)]">
      <div className="mx-auto max-w-[var(--store-max-width,72rem)] px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--store-text,#111827)]">
            {title}
          </h2>
          <Link
            href={storefrontHref(handle, "/collections/all", linkOpts)}
            className="text-sm font-semibold text-[var(--store-primary,#FF5A1F)]"
          >
            View all →
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-6">
          {tiles.map((c) => (
            <Link
              key={c.id}
              href={storefrontHref(handle, `/collections/${c.handle}`, linkOpts)}
              className="flex w-[88px] shrink-0 flex-col items-center gap-2 rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-bg,#F8FAFC)] px-2 py-3 text-center transition hover:border-[var(--store-primary,#FF5A1F)]/40 sm:w-auto"
            >
              <span
                className="grid h-12 w-12 place-items-center overflow-hidden rounded-full text-sm font-bold text-white"
                style={{ background: "var(--store-primary,#FF5A1F)" }}
              >
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  c.title.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="line-clamp-2 text-[11px] font-semibold text-[var(--store-text,#111827)]">
                {c.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorefrontFeaturedProducts({
  title,
  handle,
  products,
  onStoreHost = false,
  subtitle,
}: {
  title?: string;
  handle: string;
  products: ProductCard[];
  onStoreHost?: boolean;
  subtitle?: string;
}) {
  const linkOpts = { onStoreHost };
  return (
    <section
      className="mx-auto max-w-[var(--store-max-width,72rem)] px-4 sm:px-6"
      style={{ paddingTop: "var(--store-section-space,3.5rem)", paddingBottom: "var(--store-section-space,3.5rem)" }}
    >
      {(title || title === "") && title !== "" ? (
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              className="text-2xl font-semibold tracking-tight text-[var(--store-text,#111827)]"
              style={{ fontFamily: "var(--store-heading-font, inherit)" }}
            >
              {title || "Featured"}
            </h2>
            <p className="mt-1 text-sm text-[var(--store-muted,#6B7280)]">
              {subtitle || "Hand-picked products from this store"}
            </p>
          </div>
          <Link
            href={storefrontHref(handle, "/collections/all", linkOpts)}
            className="hidden text-sm font-semibold text-[var(--store-primary,#FF5A1F)] sm:inline"
          >
            View all →
          </Link>
        </div>
      ) : null}
      {!products.length ? (
        <p className="mt-8 rounded-[var(--store-card-radius,16px)] border border-dashed border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)]/50 px-6 py-12 text-center text-sm text-[var(--store-muted,#6B7280)]">
          No products published yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:[grid-template-columns:repeat(var(--store-grid-cols,3),minmax(0,1fr))]">
          {products.map((p) => (
            <StorefrontProductCard
              key={p.id}
              product={p}
              handle={handle}
              onStoreHost={onStoreHost}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function StorefrontTrustBar({
  headline,
  subhead,
}: {
  headline?: string;
  subhead?: string;
}) {
  const items = (subhead || "Secure checkout · Verified sourcing · Order tracking")
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <section className="border-y border-[var(--store-border,rgba(0,0,0,0.05))] bg-[var(--store-surface,#fff)]">
      <div className="mx-auto max-w-[var(--store-max-width,72rem)] px-4 py-10 sm:px-6">
        {headline ? (
          <p className="text-center text-sm font-semibold text-[var(--store-text,#111827)]">
            {headline}
          </p>
        ) : null}
        <div
          className={`grid gap-4 ${
            items.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
          } ${headline ? "mt-5" : ""}`}
        >
          {items.map((item) => (
            <div
              key={item}
              className="rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.05))] bg-[var(--store-bg,#F8FAFC)] px-4 py-5 text-center text-sm font-medium text-[var(--store-text,#111827)]/80"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorefrontFooter({
  storeName,
  handle,
  navItems,
  onStoreHost = false,
}: {
  storeName: string;
  handle: string;
  navItems?: Array<{ label: string; href: string }>;
  onStoreHost?: boolean;
}) {
  const linkOpts = { onStoreHost };
  const items =
    navItems && navItems.length
      ? navItems.map((item) => ({
          ...item,
          href: normalizeStorefrontHref(handle, item.href, linkOpts),
        }))
      : [
          { label: "About", href: storefrontHref(handle, onStoreHost ? "/about" : "/pages/about", linkOpts) },
          { label: "Contact", href: storefrontHref(handle, onStoreHost ? "/contact" : "/pages/contact", linkOpts) },
          { label: "Terms", href: storefrontHref(handle, onStoreHost ? "/terms" : "/pages/terms", linkOpts) },
          { label: "Privacy", href: storefrontHref(handle, onStoreHost ? "/privacy" : "/pages/privacy", linkOpts) },
          { label: "Refunds", href: storefrontHref(handle, onStoreHost ? "/refund-policy" : "/pages/refund-policy", linkOpts) },
          { label: "Shipping", href: storefrontHref(handle, onStoreHost ? "/shipping-policy" : "/pages/shipping-policy", linkOpts) },
          { label: "Account", href: storefrontHref(handle, "/account", linkOpts) },
        ];

  return (
    <footer className="mt-auto border-t border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)]">
      <div className="mx-auto flex max-w-[var(--store-max-width,72rem)] flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-[var(--store-text,#111827)]">{storeName}</p>
          <p className="mt-1 text-xs text-[var(--store-muted,#6B7280)]">
            Powered by Jimvio
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--store-muted,#6B7280)]">
          {items.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href} className="hover:text-[var(--store-text,#111827)]">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function renderHomeSections(opts: {
  sections: ThemeSection[];
  storeName: string;
  handle: string;
  logoUrl?: string | null;
  announcementBar?: string | null;
  products: ProductCard[];
  headerNav?: Array<{ label: string; href: string }>;
  footerNav?: Array<{ label: string; href: string }>;
  onStoreHost?: boolean;
}) {
  const onStoreHost = opts.onStoreHost ?? false;
  return opts.sections
    .filter((s) => s.enabled)
    .map((section) => {
      const props = section.props || {};
      switch (section.type) {
        case "announcement":
          return (
            <StorefrontAnnouncement
              key={section.id}
              storeName={opts.storeName}
              text={
                (typeof props.text === "string" ? props.text : null) ||
                opts.announcementBar
              }
            />
          );
        case "header":
          return (
            <StorefrontHeader
              key={section.id}
              storeName={opts.storeName}
              handle={opts.handle}
              logoUrl={opts.logoUrl}
              navItems={opts.headerNav}
              onStoreHost={onStoreHost}
            />
          );
        case "hero":
          return (
            <StorefrontHero
              key={section.id}
              handle={opts.handle}
              onStoreHost={onStoreHost}
              headline={
                typeof props.headline === "string" ? props.headline : opts.storeName
              }
              subhead={typeof props.subhead === "string" ? props.subhead : undefined}
              cta={typeof props.cta === "string" ? props.cta : undefined}
            />
          );
        case "banner":
          return (
            <StorefrontTrustBar
              key={section.id}
              headline={typeof props.headline === "string" ? props.headline : undefined}
              subhead={typeof props.subhead === "string" ? props.subhead : undefined}
            />
          );
        case "featured_products":
        case "collections":
          return (
            <StorefrontFeaturedProducts
              key={section.id}
              handle={opts.handle}
              onStoreHost={onStoreHost}
              title={
                typeof props.title === "string"
                  ? props.title
                  : section.type === "collections"
                    ? "Collections"
                    : "Featured"
              }
              products={opts.products}
            />
          );
        case "footer":
          return (
            <StorefrontFooter
              key={section.id}
              storeName={opts.storeName}
              handle={opts.handle}
              navItems={opts.footerNav}
              onStoreHost={onStoreHost}
            />
          );
        default:
          return null;
      }
    });
}
