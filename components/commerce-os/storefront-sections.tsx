import Link from "next/link";
import type { ThemeSection } from "@/lib/commerce-os/themes/registry";

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
    <div className="bg-[var(--store-primary,#FF5A1F)] px-4 py-2 text-center text-xs font-medium text-white">
      {message}
    </div>
  );
}

export function StorefrontHeader({
  storeName,
  handle,
  logoUrl,
  navItems,
}: {
  storeName: string;
  handle: string;
  logoUrl?: string | null;
  navItems?: Array<{ label: string; href: string }>;
}) {
  const items =
    navItems && navItems.length
      ? navItems
      : [
          { label: "Home", href: `/s/${handle}` },
          { label: "All products", href: `/s/${handle}/collections/all` },
          { label: "Search", href: `/s/${handle}/search` },
        ];

  return (
    <header className="border-b border-black/10 bg-[var(--store-bg,#F8FAFC)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href={`/s/${handle}`} className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
          ) : null}
          <span className="text-lg font-semibold tracking-tight text-[var(--store-text,#111827)]">
            {storeName}
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-[var(--store-text,#111827)]">
          {items.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="opacity-80 hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={`/s/${handle}/cart`}
            className="rounded-md bg-[var(--store-primary,#FF5A1F)] px-3 py-1.5 text-xs font-semibold text-white"
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
  handle,
}: {
  headline?: string;
  subhead?: string;
  cta?: string;
  handle: string;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-[var(--store-text,#111827)] sm:text-4xl">
        {headline || "Shop the collection"}
      </h1>
      {subhead ? (
        <p className="mt-3 max-w-xl text-base text-[var(--store-text,#111827)]/70">
          {subhead}
        </p>
      ) : null}
      <Link
        href={`/s/${handle}/collections/all`}
        className="mt-6 inline-flex rounded-md bg-[var(--store-primary,#FF5A1F)] px-4 py-2.5 text-sm font-semibold text-white"
      >
        {cta || "Shop now"}
      </Link>
    </section>
  );
}

export function StorefrontFeaturedProducts({
  title,
  handle,
  products,
}: {
  title?: string;
  handle: string;
  products: ProductCard[];
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-12">
      <h2 className="text-xl font-semibold text-[var(--store-text,#111827)]">
        {title || "Featured"}
      </h2>
      {!products.length ? (
        <p className="mt-4 text-sm text-[var(--store-text,#111827)]/60">
          No products published yet.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = firstImage(p.images);
            return (
              <Link
                key={p.id}
                href={`/s/${handle}/product/${p.slug}`}
                className="group overflow-hidden rounded-[var(--store-radius,12px)] border border-black/10 bg-white"
              >
                <div className="aspect-[4/3] bg-[#F3F4F6]">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="font-medium text-[var(--store-text,#111827)]">{p.name}</p>
                  <p className="mt-1 text-sm text-[var(--store-text,#111827)]/70">
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

export function StorefrontFooter({
  storeName,
  handle,
  navItems,
}: {
  storeName: string;
  handle: string;
  navItems?: Array<{ label: string; href: string }>;
}) {
  const items =
    navItems && navItems.length
      ? navItems
      : [
          { label: "About", href: `/s/${handle}/pages/about` },
          { label: "Contact", href: `/s/${handle}/pages/contact` },
          { label: "Account", href: `/s/${handle}/account` },
        ];

  return (
    <footer className="mt-auto border-t border-black/10 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[var(--store-text,#111827)]">
          {storeName}
        </p>
        <nav className="flex flex-wrap gap-3 text-sm text-[var(--store-text,#111827)]/70">
          {items.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href}>
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
}) {
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
            />
          );
        case "hero":
          return (
            <StorefrontHero
              key={section.id}
              handle={opts.handle}
              headline={
                typeof props.headline === "string" ? props.headline : opts.storeName
              }
              subhead={typeof props.subhead === "string" ? props.subhead : undefined}
              cta={typeof props.cta === "string" ? props.cta : undefined}
            />
          );
        case "featured_products":
          return (
            <StorefrontFeaturedProducts
              key={section.id}
              handle={opts.handle}
              title={typeof props.title === "string" ? props.title : "Featured"}
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
            />
          );
        default:
          return null;
      }
    });
}
