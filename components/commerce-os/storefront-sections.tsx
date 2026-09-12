import Link from "next/link";
import type { ThemeSection } from "@/lib/commerce-os/themes/registry";
import {
  normalizeStorefrontHref,
  storefrontHref,
} from "@/lib/commerce-os/storefront-url";

type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  currency?: string | null;
  images?: unknown;
  short_description?: string | null;
};

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images) || !images.length) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    const url = (first as { url?: unknown }).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

function formatMoney(price: number | string | null | undefined, currency?: string | null) {
  const n = Number(price ?? 0);
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

export function StorefrontAnnouncement({
  text,
  storeName,
}: {
  text?: string | null;
  storeName: string;
}) {
  const message = text?.trim() || `Welcome to ${storeName}`;
  return (
    <div className="bg-[var(--store-primary,#FF5A1F)] px-4 py-2.5 text-center text-[11px] font-semibold tracking-wide text-white sm:text-xs">
      {message}
    </div>
  );
}

export function StorefrontHeader({
  storeName,
  handle,
  logoUrl,
  navItems,
  onStoreHost = false,
}: {
  storeName: string;
  handle: string;
  logoUrl?: string | null;
  navItems?: Array<{ label: string; href: string }>;
  onStoreHost?: boolean;
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
          { label: "Shop", href: storefrontHref(handle, "/collections/all", linkOpts) },
          { label: "Search", href: storefrontHref(handle, "/search", linkOpts) },
        ];

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[var(--store-bg,#F8FAFC)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href={home} className="flex min-w-0 items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <span
              className="grid h-9 w-9 place-items-center rounded-lg text-xs font-bold text-white"
              style={{ background: "var(--store-primary,#FF5A1F)" }}
              aria-hidden
            >
              {storeName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate text-base font-semibold tracking-tight text-[var(--store-text,#111827)] sm:text-lg">
            {storeName}
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-[var(--store-text,#111827)] sm:gap-2">
          {items.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="rounded-lg px-2.5 py-1.5 opacity-75 transition hover:bg-black/[0.04] hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={storefrontHref(handle, "/cart", linkOpts)}
            className="ml-1 rounded-full bg-[var(--store-primary,#FF5A1F)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Cart
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function StorefrontHero({
  headline,
  subhead,
  cta,
  ctaHref,
  handle,
  onStoreHost = false,
}: {
  headline?: string;
  subhead?: string;
  cta?: string;
  ctaHref?: string;
  handle: string;
  onStoreHost?: boolean;
}) {
  const linkOpts = { onStoreHost };
  const shopPath =
    typeof ctaHref === "string" && ctaHref.startsWith("/")
      ? ctaHref
      : "/collections/all";
  return (
    <section className="relative overflow-hidden border-b border-black/[0.04]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 0%, color-mix(in srgb, var(--store-primary,#FF5A1F) 18%, transparent), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, color-mix(in srgb, var(--store-primary,#FF5A1F) 10%, transparent), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--store-primary,#FF5A1F)]">
            Official store
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-[var(--store-text,#111827)] sm:text-5xl">
            {headline || "Shop the collection"}
          </h1>
          {subhead ? (
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--store-text,#111827)]/70 sm:text-lg">
              {subhead}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={storefrontHref(handle, shopPath, linkOpts)}
              className="inline-flex px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-95"
              style={{
                background: "var(--store-btn, var(--store-primary,#FF5A1F))",
                color: "var(--store-btn-text,#FFFFFF)",
                borderRadius: "var(--store-btn-radius,9999px)",
              }}
            >
              {cta || "Shop now"}
            </Link>
            <Link
              href={storefrontHref(handle, "/search", linkOpts)}
              className="inline-flex rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[var(--store-text,#111827)] backdrop-blur transition hover:bg-white"
            >
              Search
            </Link>
          </div>
        </div>
        <div className="hidden rounded-3xl border border-black/[0.06] bg-white/60 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur lg:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--store-text,#111827)]/45">
            Shopping with confidence
          </p>
          <ul className="mt-4 space-y-3 text-sm text-[var(--store-text,#111827)]/80">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--store-primary,#FF5A1F)]" />
              Secure checkout powered by Jimvio
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--store-primary,#FF5A1F)]" />
              Verified sourcing & fulfillment
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--store-primary,#FF5A1F)]" />
              Order tracking after purchase
            </li>
          </ul>
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
}: {
  title?: string;
  handle: string;
  products: ProductCard[];
  onStoreHost?: boolean;
}) {
  const linkOpts = { onStoreHost };
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--store-text,#111827)]">
            {title || "Featured"}
          </h2>
          <p className="mt-1 text-sm text-[var(--store-text,#111827)]/55">
            Hand-picked products from this store
          </p>
        </div>
        <Link
          href={storefrontHref(handle, "/collections/all", linkOpts)}
          className="hidden text-sm font-semibold text-[var(--store-primary,#FF5A1F)] sm:inline"
        >
          View all
        </Link>
      </div>
      {!products.length ? (
        <p className="mt-8 rounded-2xl border border-dashed border-black/10 bg-white/50 px-6 py-12 text-center text-sm text-[var(--store-text,#111827)]/60">
          No products published yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--store-grid-cols,3),minmax(0,1fr))]">
          {products.map((p) => {
            const img = firstImage(p.images);
            return (
              <Link
                key={p.id}
                href={storefrontHref(handle, `/product/${p.slug}`, linkOpts)}
                className="group overflow-hidden rounded-[calc(var(--store-radius,12px)+4px)] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#F3F4F6]">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="font-medium text-[var(--store-text,#111827)]">{p.name}</p>
                  {p.short_description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--store-text,#111827)]/55">
                      {p.short_description}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm font-semibold text-[var(--store-text,#111827)]">
                    {formatMoney(p.price, p.currency)}
                  </p>
                </div>
              </Link>
            );
          })}
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
    <section className="border-y border-black/[0.05] bg-white/70">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {headline ? (
          <p className="text-center text-sm font-semibold text-[var(--store-text,#111827)]">
            {headline}
          </p>
        ) : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-black/[0.05] bg-[var(--store-bg,#F8FAFC)] px-4 py-5 text-center text-sm font-medium text-[var(--store-text,#111827)]/80"
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
    <footer className="mt-auto border-t border-black/[0.06] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-[var(--store-text,#111827)]">{storeName}</p>
          <p className="mt-1 text-xs text-[var(--store-text,#111827)]/50">
            Powered by Jimvio
          </p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm text-[var(--store-text,#111827)]/65">
          {items.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href} className="hover:opacity-100">
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
